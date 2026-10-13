-- =========================================================
-- Amna's Edit - Variant-aware galleries compatibility check
-- Safe to run once in Supabase SQL Editor.
--
-- The project already had gallery columns in its schema. This migration
-- simply guarantees those columns exist in the deployed database.
-- =========================================================

begin;

alter table public.products
  add column if not exists gallery text[] not null default '{}';

alter table public.product_variants
  add column if not exists gallery text[] not null default '{}';

commit;
