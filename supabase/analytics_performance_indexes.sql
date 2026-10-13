-- Step 8G: analytics performance indexes
-- Safe/additive. No data is changed or deleted.
--
-- These indexes support:
-- 1) 30-day owner analytics aggregation
-- 2) cleanup of old abuse-prevention attempt rows

-- Helps the owner analytics query filter recent events and then group
-- by product / event type without relying only on three separate indexes.
create index if not exists
  analytics_events_recent_summary_idx
on public.analytics_events (
  created_at desc,
  product_id,
  event_type
);

-- The recorder regularly deletes attempts older than 7 days.
-- The existing (fingerprint_hash, created_at) index is useful for
-- per-user rate checks, but cannot efficiently serve a created_at-only cleanup.
create index if not exists
  analytics_attempts_created_at_idx
on public.analytics_submission_attempts (
  created_at
);
