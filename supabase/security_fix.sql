-- AMNA'S EDIT — EXISTING DATABASE SECURITY FIX
-- Run once in the Supabase SQL Editor if the legacy
-- "Authenticated users can ..." variant policies were ever created.

drop policy if exists "Authenticated users can insert product variants"
on public.product_variants;

drop policy if exists "Authenticated users can update product variants"
on public.product_variants;

drop policy if exists "Authenticated users can delete product variants"
on public.product_variants;

-- Ensure the owner-only policies exist.
drop policy if exists "Owner can insert product variants"
on public.product_variants;

create policy "Owner can insert product variants"
on public.product_variants
for insert
to authenticated
with check (public.is_owner());

drop policy if exists "Owner can update product variants"
on public.product_variants;

create policy "Owner can update product variants"
on public.product_variants
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "Owner can delete product variants"
on public.product_variants;

create policy "Owner can delete product variants"
on public.product_variants
for delete
to authenticated
using (public.is_owner());
