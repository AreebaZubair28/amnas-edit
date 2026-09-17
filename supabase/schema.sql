-- =========================================================
-- AMNA'S EDIT — DATABASE SCHEMA
-- Final-state, idempotent setup for Supabase/PostgreSQL.
-- Safe to re-run: it does not drop tables or application data.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- OWNER PROFILE / AUTHORIZATION
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner')),
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.is_owner() to authenticated;

-- =========================================================
-- CATEGORIES / BRANDS
-- =========================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- =========================================================
-- PRODUCTS
-- =========================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '',
  category text not null default 'Accessories',
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  status text not null default 'in_stock'
    check (status in ('in_stock', 'coming_soon', 'preorder')),
  gender text not null default 'unisex'
    check (gender in ('female', 'male', 'unisex')),
  price numeric(12,2),
  description text,
  details text,
  delivery_return text,
  image_url text,
  gallery text[] not null default '{}',
  whatsapp_url text,
  instagram_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Compatibility for databases created with an earlier version.
alter table public.products
  add column if not exists brand_id uuid,
  add column if not exists category_id uuid,
  add column if not exists details text,
  add column if not exists delivery_return text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_brand_id_fkey'
  ) then
    alter table public.products
      add constraint products_brand_id_fkey
      foreign key (brand_id)
      references public.brands(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_category_id_fkey'
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null;
  end if;
end
$$;

-- =========================================================
-- PRODUCT VARIANTS / COLORS
-- =========================================================

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,
  color_name text not null,
  color_code text,
  image_url text,
  gallery text[] not null default '{}',
  details text,
  delivery_return text,
  price numeric(12,2),
  created_at timestamptz not null default now(),
  unique (product_id, color_name)
);

-- Compatibility for databases created with an earlier version.
alter table public.product_variants
  add column if not exists color_code text,
  add column if not exists image_url text,
  add column if not exists gallery text[] not null default '{}',
  add column if not exists details text,
  add column if not exists delivery_return text,
  add column if not exists price numeric(12,2);

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id);

-- Kept for compatibility with the existing database. The current
-- application stores variant image URLs directly on product_variants.
create table if not exists public.variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null
    references public.product_variants(id)
    on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- WEBSITE SETTINGS
-- =========================================================

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text not null default '',
  updated_at timestamptz not null default now()
);

-- =========================================================
-- PROMOTIONS
-- =========================================================

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  banner_text text not null default '',
  discount_type text not null
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null
    check (discount_value >= 0),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint valid_promotion_dates
    check (end_at > start_at)
);

create table if not exists public.promotion_rules (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null
    references public.promotions(id)
    on delete cascade,
  rule_type text not null
    check (
      rule_type in (
        'all',
        'status',
        'category',
        'brand',
        'gender',
        'product'
      )
    ),
  status_value text,
  category_id uuid
    references public.categories(id)
    on delete cascade,
  brand_id uuid
    references public.brands(id)
    on delete cascade,
  gender_value text
    check (gender_value in ('female', 'male', 'unisex')),
  product_id uuid
    references public.products(id)
    on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists promotion_rules_promotion_id_idx
  on public.promotion_rules(promotion_id);

-- =========================================================
-- PRODUCT REVIEWS
-- =========================================================

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,
  customer_name text not null,
  review_text text not null,
  rating integer not null
    check (rating between 1 and 5),

  -- Legacy compatibility. The current application uses is_approved.
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.product_reviews
  add column if not exists status text not null default 'pending',
  add column if not exists is_approved boolean not null default false;

-- Preserve approvals from databases that used the old status field.
update public.product_reviews
set is_approved = true
where status = 'approved'
  and is_approved = false;

create index if not exists product_reviews_product_id_idx
  on public.product_reviews(product_id);

create index if not exists product_reviews_approved_idx
  on public.product_reviews(is_approved);

-- =========================================================
-- SEED DATA
-- =========================================================

insert into public.categories (name, slug)
values
  ('Bags', 'bags'),
  ('Totes', 'totes'),
  ('Heels', 'heels'),
  ('Shoes', 'shoes'),
  ('Slippers', 'slippers'),
  ('Jewelry', 'jewelry'),
  ('Wallets', 'wallets'),
  ('Cardholders', 'cardholders'),
  ('Belts', 'belts'),
  ('Scarves', 'scarves'),
  ('Shades', 'shades'),
  ('Watches', 'watches'),
  ('Twilly', 'twilly')
on conflict (name) do nothing;

insert into public.site_settings (setting_key, setting_value)
values
  ('about_title', ''),
  ('about_text', ''),
  ('delivery_policy', ''),
  ('return_policy', ''),
  ('preorder_policy', ''),
  ('in_stock_policy', ''),
  ('customs_hold_delay_policy', ''),
  ('privacy_policy', ''),
  ('terms_conditions', ''),
  ('instagram_url', ''),
  ('whatsapp_number', ''),
  ('tiktok_url', '')
on conflict (setting_key) do nothing;

-- Backfill relational IDs when matching category / brand rows exist.
update public.products p
set category_id = c.id
from public.categories c
where p.category_id is null
  and lower(p.category) = lower(c.name);

update public.products p
set brand_id = b.id
from public.brands b
where p.brand_id is null
  and lower(p.brand) = lower(b.name);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_rules enable row level security;
alter table public.product_reviews enable row level security;

-- =========================================================
-- TABLE GRANTS
-- =========================================================

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

grant select on public.categories, public.brands
  to anon, authenticated;
grant insert, update, delete on public.categories, public.brands
  to authenticated;

grant select on public.product_variants, public.variant_images
  to anon, authenticated;
grant insert, update, delete on public.product_variants, public.variant_images
  to authenticated;

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

grant select on public.promotions, public.promotion_rules
  to anon, authenticated;
grant insert, update, delete on public.promotions, public.promotion_rules
  to authenticated;

grant select on public.product_reviews to anon, authenticated;
grant insert on public.product_reviews to anon, authenticated;
grant update, delete on public.product_reviews to authenticated;

grant select on public.profiles to authenticated;

-- =========================================================
-- PROFILE POLICY
-- =========================================================

drop policy if exists "Users can view own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- =========================================================
-- PRODUCTS
-- =========================================================

drop policy if exists "Public can view products" on public.products;
drop policy if exists "Owner can insert products" on public.products;
drop policy if exists "Owner can update products" on public.products;
drop policy if exists "Owner can delete products" on public.products;

create policy "Public can view products"
on public.products
for select
to anon, authenticated
using (true);

create policy "Owner can insert products"
on public.products
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update products"
on public.products
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete products"
on public.products
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- CATEGORIES
-- =========================================================

drop policy if exists "Public can view categories" on public.categories;
drop policy if exists "Owner can insert categories" on public.categories;
drop policy if exists "Owner can update categories" on public.categories;
drop policy if exists "Owner can delete categories" on public.categories;

create policy "Public can view categories"
on public.categories
for select
to anon, authenticated
using (true);

create policy "Owner can insert categories"
on public.categories
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update categories"
on public.categories
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete categories"
on public.categories
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- BRANDS
-- =========================================================

drop policy if exists "Public can view brands" on public.brands;
drop policy if exists "Owner can insert brands" on public.brands;
drop policy if exists "Owner can update brands" on public.brands;
drop policy if exists "Owner can delete brands" on public.brands;

create policy "Public can view brands"
on public.brands
for select
to anon, authenticated
using (true);

create policy "Owner can insert brands"
on public.brands
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update brands"
on public.brands
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete brands"
on public.brands
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- PRODUCT VARIANTS
-- =========================================================

drop policy if exists "Public can view product variants"
  on public.product_variants;
drop policy if exists "Anyone can view product variants"
  on public.product_variants;

drop policy if exists "Owner can insert product variants"
  on public.product_variants;
drop policy if exists "Owner can update product variants"
  on public.product_variants;
drop policy if exists "Owner can delete product variants"
  on public.product_variants;

-- Remove legacy policies that allowed every authenticated user to write.
drop policy if exists "Authenticated users can insert product variants"
  on public.product_variants;
drop policy if exists "Authenticated users can update product variants"
  on public.product_variants;
drop policy if exists "Authenticated users can delete product variants"
  on public.product_variants;

create policy "Public can view product variants"
on public.product_variants
for select
to anon, authenticated
using (true);

create policy "Owner can insert product variants"
on public.product_variants
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update product variants"
on public.product_variants
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete product variants"
on public.product_variants
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- VARIANT IMAGES
-- =========================================================

drop policy if exists "Public can view variant images"
  on public.variant_images;
drop policy if exists "Owner can insert variant images"
  on public.variant_images;
drop policy if exists "Owner can update variant images"
  on public.variant_images;
drop policy if exists "Owner can delete variant images"
  on public.variant_images;

create policy "Public can view variant images"
on public.variant_images
for select
to anon, authenticated
using (true);

create policy "Owner can insert variant images"
on public.variant_images
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update variant images"
on public.variant_images
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete variant images"
on public.variant_images
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- WEBSITE SETTINGS
-- =========================================================

drop policy if exists "Public can view site settings"
  on public.site_settings;
drop policy if exists "Anyone can view site settings"
  on public.site_settings;
drop policy if exists "Owner can insert site settings"
  on public.site_settings;
drop policy if exists "Owner can update site settings"
  on public.site_settings;
drop policy if exists "Owner can delete site settings"
  on public.site_settings;

create policy "Public can view site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Owner can insert site settings"
on public.site_settings
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update site settings"
on public.site_settings
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete site settings"
on public.site_settings
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- PROMOTIONS
-- =========================================================

drop policy if exists "Public can view active promotions"
  on public.promotions;
drop policy if exists "Owner can view all promotions"
  on public.promotions;
drop policy if exists "Owner can insert promotions"
  on public.promotions;
drop policy if exists "Owner can update promotions"
  on public.promotions;
drop policy if exists "Owner can delete promotions"
  on public.promotions;

create policy "Public can view active promotions"
on public.promotions
for select
to anon, authenticated
using (
  is_active = true
  and now() >= start_at
  and now() <= end_at
);

create policy "Owner can view all promotions"
on public.promotions
for select
to authenticated
using (public.is_owner());

create policy "Owner can insert promotions"
on public.promotions
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update promotions"
on public.promotions
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete promotions"
on public.promotions
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- PROMOTION RULES
-- =========================================================

drop policy if exists "Public can view promotion rules"
  on public.promotion_rules;
drop policy if exists "Owner can view all promotion rules"
  on public.promotion_rules;
drop policy if exists "Owner can insert promotion rules"
  on public.promotion_rules;
drop policy if exists "Owner can update promotion rules"
  on public.promotion_rules;
drop policy if exists "Owner can delete promotion rules"
  on public.promotion_rules;

create policy "Public can view promotion rules"
on public.promotion_rules
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.promotions p
    where p.id = promotion_id
      and p.is_active = true
      and now() >= p.start_at
      and now() <= p.end_at
  )
);

create policy "Owner can view all promotion rules"
on public.promotion_rules
for select
to authenticated
using (public.is_owner());

create policy "Owner can insert promotion rules"
on public.promotion_rules
for insert
to authenticated
with check (public.is_owner());

create policy "Owner can update promotion rules"
on public.promotion_rules
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete promotion rules"
on public.promotion_rules
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- PRODUCT REVIEWS
-- =========================================================

drop policy if exists "Public can view approved product reviews"
  on public.product_reviews;
drop policy if exists "Public can submit product reviews"
  on public.product_reviews;
drop policy if exists "Owner can view all product reviews"
  on public.product_reviews;
drop policy if exists "Owner can update product reviews"
  on public.product_reviews;
drop policy if exists "Owner can delete product reviews"
  on public.product_reviews;

create policy "Public can view approved product reviews"
on public.product_reviews
for select
to anon, authenticated
using (is_approved = true);

create policy "Public can submit product reviews"
on public.product_reviews
for insert
to anon, authenticated
with check (
  is_approved = false
  and status = 'pending'
);

create policy "Owner can view all product reviews"
on public.product_reviews
for select
to authenticated
using (public.is_owner());

create policy "Owner can update product reviews"
on public.product_reviews
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Owner can delete product reviews"
on public.product_reviews
for delete
to authenticated
using (public.is_owner());

-- =========================================================
-- PRODUCT IMAGE STORAGE
-- =========================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "Public can view product images"
  on storage.objects;
drop policy if exists "Owner can upload product images"
  on storage.objects;
drop policy if exists "Owner can update product images"
  on storage.objects;
drop policy if exists "Owner can delete product images"
  on storage.objects;

create policy "Public can view product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

create policy "Owner can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_owner()
);

create policy "Owner can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_owner()
)
with check (
  bucket_id = 'product-images'
  and public.is_owner()
);

create policy "Owner can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_owner()
);

-- =========================================================
-- OWNER SETUP
-- =========================================================
-- After creating the owner user in Supabase Authentication,
-- run the following with that user's UUID:
--
-- insert into public.profiles (id, role)
-- values ('YOUR-AUTH-USER-UUID', 'owner')
-- on conflict (id) do update set role = 'owner';
--
-- The application does not treat every authenticated user as an owner.
-- RLS checks public.is_owner() before allowing owner-only writes.
