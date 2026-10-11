-- =========================================================
-- Amna's Edit - Analytics atomic duplicate protection (v3)
-- Run ONCE in the Supabase SQL Editor.
--
-- Why this migration exists:
-- The previous API used:
--   1. SELECT recent attempts
--   2. INSERT attempt
--   3. INSERT analytics event
--
-- Two requests arriving at almost exactly the same time could both
-- finish step 1 before either request inserted anything, causing +2 views.
--
-- This function performs duplicate checking + insertion inside one
-- PostgreSQL transaction and uses an advisory transaction lock so only
-- one matching analytics request is processed at a time.
-- =========================================================

begin;

create or replace function public.record_analytics_event_secure(
  p_product_id uuid,
  p_event_type text,
  p_fingerprint_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_hour_count integer := 0;
  v_hour_limit integer;
  v_duplicate_window interval;
  v_lock_key bigint;
begin
  -- Accept only the analytics events used by the application.
  if p_event_type not in (
    'product_view',
    'whatsapp_click',
    'instagram_click'
  ) then
    return 'invalid';
  end if;

  -- Product must exist.
  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    return 'not_found';
  end if;

  if p_event_type = 'product_view' then
    v_hour_limit := 120;
    v_duplicate_window := interval '30 seconds';
  else
    v_hour_limit := 30;
    v_duplicate_window := interval '10 seconds';
  end if;

  /*
   * Serialize analytics requests for the same visitor + event type.
   *
   * This is the key fix for the +2 view bug. Two simultaneous requests
   * can no longer both pass the duplicate check.
   */
  v_lock_key := hashtextextended(
    p_fingerprint_hash || '|' || p_event_type,
    0
  );

  perform pg_advisory_xact_lock(v_lock_key);

  -- Hourly anti-flood limit.
  select count(*)
  into v_hour_count
  from public.analytics_submission_attempts
  where fingerprint_hash = p_fingerprint_hash
    and event_type = p_event_type
    and created_at >= v_now - interval '1 hour';

  if v_hour_count >= v_hour_limit then
    return 'rate_limited';
  end if;

  -- Short duplicate window for the same product + event type.
  if exists (
    select 1
    from public.analytics_submission_attempts
    where fingerprint_hash = p_fingerprint_hash
      and product_id = p_product_id
      and event_type = p_event_type
      and created_at >= v_now - v_duplicate_window
  ) then
    return 'duplicate';
  end if;

  insert into public.analytics_submission_attempts (
    fingerprint_hash,
    product_id,
    event_type,
    created_at
  )
  values (
    p_fingerprint_hash,
    p_product_id,
    p_event_type,
    v_now
  );

  insert into public.analytics_events (
    product_id,
    event_type,
    created_at
  )
  values (
    p_product_id,
    p_event_type,
    v_now
  );

  -- Keep the short-term fingerprint table small.
  delete from public.analytics_submission_attempts
  where created_at < v_now - interval '7 days';

  return 'recorded';
end;
$$;

-- This function is server-only.
revoke all
  on function public.record_analytics_event_secure(uuid, text, text)
  from public;

revoke all
  on function public.record_analytics_event_secure(uuid, text, text)
  from anon, authenticated;

grant execute
  on function public.record_analytics_event_secure(uuid, text, text)
  to service_role;

commit;
