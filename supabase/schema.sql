-- AMNA'S EDIT DATABASE
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '',
  category text not null default 'Accessories',
  status text not null default 'in_stock' check (status in ('in_stock','coming_soon','preorder')),
  gender text not null default 'unisex' check (gender in ('female','male','unisex')),
  price numeric(12,2),
  description text,
  image_url text,
  gallery text[] not null default '{}',
  whatsapp_url text,
  instagram_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- Helper used by RLS without recursive policy checks.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_owner() to anon, authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Public can view products" on public.products;
create policy "Public can view products"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "Owner can insert products" on public.products;
create policy "Owner can insert products"
on public.products for insert
to authenticated
with check (public.is_owner());

drop policy if exists "Owner can update products" on public.products;
create policy "Owner can update products"
on public.products for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "Owner can delete products" on public.products;
create policy "Owner can delete products"
on public.products for delete
to authenticated
using (public.is_owner());

-- IMPORTANT:
-- After creating your owner account in Supabase Authentication,
-- insert that user's UUID here:
--
-- insert into public.profiles (id, role)
-- values ('YOUR-AUTH-USER-UUID', 'owner')
-- on conflict (id) do update set role='owner';

-- PRODUCT IMAGE STORAGE
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select to public
using (bucket_id = 'product-images');

drop policy if exists "Owner can upload product images" on storage.objects;
create policy "Owner can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_owner());

drop policy if exists "Owner can update product images" on storage.objects;
create policy "Owner can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_owner())
with check (bucket_id = 'product-images' and public.is_owner());

drop policy if exists "Owner can delete product images" on storage.objects;
create policy "Owner can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_owner());
