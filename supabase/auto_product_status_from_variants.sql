-- Step 7I: Automatically derive product status from color variants.
-- Safe/additive. Products without color variants keep their manually managed status.
--
-- Rule:
--   Any color In Stock  -> product In Stock
--   All colors Sold Out -> product Sold Out

create or replace function public.sync_product_status_from_variants(
  target_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A product with no color variants remains manually managed.
  if not exists (
    select 1
    from public.product_variants
    where product_id = target_product_id
  ) then
    return;
  end if;

  update public.products
  set status =
    case
      when exists (
        select 1
        from public.product_variants
        where product_id = target_product_id
          and is_available = true
      )
        then 'in_stock'
      else 'sold_out'
    end
  where id = target_product_id;
end;
$$;

revoke all
on function public.sync_product_status_from_variants(uuid)
from public, anon, authenticated;

create or replace function public.sync_product_status_after_variant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_product_status_from_variants(old.product_id);
    return old;
  end if;

  perform public.sync_product_status_from_variants(new.product_id);

  if (
    tg_op = 'UPDATE'
    and old.product_id is distinct from new.product_id
  ) then
    perform public.sync_product_status_from_variants(old.product_id);
  end if;

  return new;
end;
$$;

revoke all
on function public.sync_product_status_after_variant_change()
from public, anon, authenticated;

drop trigger if exists
  trg_sync_product_status_after_variant_change
on public.product_variants;

create trigger
  trg_sync_product_status_after_variant_change
after insert or update of is_available, product_id or delete
on public.product_variants
for each row
execute function public.sync_product_status_after_variant_change();

-- Prevent a manual product-status edit from contradicting its color statuses.
create or replace function public.enforce_product_status_from_variants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.product_variants
    where product_id = new.id
  ) then
    new.status :=
      case
        when exists (
          select 1
          from public.product_variants
          where product_id = new.id
            and is_available = true
        )
          then 'in_stock'
        else 'sold_out'
      end;
  end if;

  return new;
end;
$$;

revoke all
on function public.enforce_product_status_from_variants()
from public, anon, authenticated;

drop trigger if exists
  trg_enforce_product_status_from_variants
on public.products;

create trigger
  trg_enforce_product_status_from_variants
before update of status
on public.products
for each row
execute function public.enforce_product_status_from_variants();

-- Bring existing products with colors into sync immediately.
update public.products p
set status =
  case
    when exists (
      select 1
      from public.product_variants pv
      where pv.product_id = p.id
        and pv.is_available = true
    )
      then 'in_stock'
    else 'sold_out'
  end
where exists (
  select 1
  from public.product_variants pv
  where pv.product_id = p.id
);
