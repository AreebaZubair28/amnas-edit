-- =========================================================
-- Amna's Edit - Product status simplification
-- In Stock + Sold Out only
-- Run ONCE in the Supabase SQL Editor.
-- =========================================================

begin;

-- The existing check constraint does not yet allow sold_out.
alter table public.products
  drop constraint if exists products_status_check;

-- Preserve all existing products. Anything that was Coming In
-- or Preorder / Sourced becomes Sold Out.
update public.products
set status = 'sold_out'
where status in ('coming_soon', 'preorder');

-- Keep old promotion rules meaningful after the status change.
update public.promotion_rules
set status_value = 'sold_out'
where rule_type = 'status'
  and status_value in ('coming_soon', 'preorder');

-- Only the two current product statuses are valid from now on.
alter table public.products
  add constraint products_status_check
  check (status in ('in_stock', 'sold_out'));

-- The preorder policy is no longer part of the business flow.
delete from public.site_settings
where setting_key = 'preorder_policy';

commit;
