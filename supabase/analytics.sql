-- =========================================================
-- Amna's Edit - Privacy-conscious business analytics
-- Phase 7
--
-- Stores product interaction events only.
-- No names, emails, IP addresses, device IDs, or other
-- customer-identifying information are stored.
-- =========================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,
  event_type text not null
    check (
      event_type in (
        'product_view',
        'whatsapp_click',
        'instagram_click'
      )
    ),
  created_at timestamptz not null default now()
);

create index if not exists
  analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists
  analytics_events_product_id_idx
  on public.analytics_events (product_id);

create index if not exists
  analytics_events_event_type_idx
  on public.analytics_events (event_type);

alter table public.analytics_events
  enable row level security;

-- Public visitors may only record the three approved event types.
grant insert on public.analytics_events
  to anon, authenticated;

-- Only authenticated users who pass the existing is_owner()
-- check can read analytics.
grant select on public.analytics_events
  to authenticated;

revoke update, delete
  on public.analytics_events
  from anon, authenticated;

drop policy if exists
  "Public can record analytics events"
  on public.analytics_events;

create policy
  "Public can record analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    event_type in (
      'product_view',
      'whatsapp_click',
      'instagram_click'
    )
  );

drop policy if exists
  "Owner can read analytics events"
  on public.analytics_events;

create policy
  "Owner can read analytics events"
  on public.analytics_events
  for select
  to authenticated
  using (public.is_owner());
