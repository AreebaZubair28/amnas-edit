-- =========================================================
-- Amna's Edit - Permanent product URLs
-- Run ONCE in Supabase SQL Editor.
--
-- Adds a stable, unique slug to every product and automatically
-- creates one for future products. Product names can later change
-- without changing an existing product URL.
-- =========================================================

begin;

alter table public.products
  add column if not exists slug text;

create or replace function public.product_slug_base(input_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    nullif(
      trim(
        both '-'
        from regexp_replace(
          lower(coalesce(input_text, '')),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'product'
  );
$$;

-- Give existing products readable slugs.
update public.products
set slug = public.product_slug_base(name)
where slug is null
   or btrim(slug) = '';

-- If two products have the same name/slug, keep the oldest readable
-- slug and add a short UUID suffix to the others.
with ranked as (
  select
    id,
    slug,
    row_number() over (
      partition by slug
      order by created_at asc, id asc
    ) as row_number
  from public.products
)
update public.products as product
set slug =
  product.slug || '-' ||
  left(replace(product.id::text, '-', ''), 8)
from ranked
where ranked.id = product.id
  and ranked.row_number > 1;

create unique index if not exists products_slug_key
  on public.products(slug);

alter table public.products
  alter column slug set not null;

create or replace function public.set_product_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_slug text;
  candidate_slug text;
begin
  -- Existing slugs stay stable. Generate one only when missing.
  if new.slug is null or btrim(new.slug) = '' then
    base_slug := public.product_slug_base(new.name);
    candidate_slug := base_slug;

    if exists (
      select 1
      from public.products
      where slug = candidate_slug
        and id <> new.id
    ) then
      candidate_slug :=
        base_slug || '-' ||
        left(replace(new.id::text, '-', ''), 8);
    end if;

    new.slug := candidate_slug;
  end if;

  return new;
end;
$$;

drop trigger if exists set_product_slug_trigger
  on public.products;

create trigger set_product_slug_trigger
before insert or update of slug
on public.products
for each row
execute function public.set_product_slug();

commit;
