-- Step 7H: availability per color variant
-- Safe/additive. Existing colors remain available.

alter table public.product_variants
  add column if not exists is_available boolean not null default true;
