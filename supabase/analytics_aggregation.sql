-- Step 8E: aggregate owner analytics inside PostgreSQL.
-- Run ONCE in the Supabase SQL Editor.
--
-- This replaces downloading up to 5,000 raw analytics rows into the
-- browser just to calculate totals. The browser now receives only one
-- compact aggregate row per product.

create or replace function public.get_owner_analytics_summary(
  p_days integer default 30
)
returns table (
  product_id uuid,
  views integer,
  whatsapp_clicks integer,
  instagram_clicks integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365'
      using errcode = '22023';
  end if;

  return query
  select
    ae.product_id,
    count(*) filter (
      where ae.event_type = 'product_view'
    )::integer as views,
    count(*) filter (
      where ae.event_type = 'whatsapp_click'
    )::integer as whatsapp_clicks,
    count(*) filter (
      where ae.event_type = 'instagram_click'
    )::integer as instagram_clicks
  from public.analytics_events ae
  where ae.created_at >=
    now() - make_interval(days => p_days)
  group by ae.product_id;
end;
$$;

revoke all
on function public.get_owner_analytics_summary(integer)
from public, anon;

grant execute
on function public.get_owner_analytics_summary(integer)
to authenticated;
