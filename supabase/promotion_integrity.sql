-- Step 8F: strengthen promotion data integrity at the database layer.
-- Safe/additive and data-preserving.
--
-- New rows/updates are protected immediately.
-- Existing rows are NOT deleted or rewritten. Each new constraint is added
-- NOT VALID, then validated only when the existing data already satisfies it.

-- ---------------------------------------------------------
-- PROMOTIONS
-- ---------------------------------------------------------

alter table public.promotions
  drop constraint if exists promotions_discount_value_positive;

alter table public.promotions
  add constraint promotions_discount_value_positive
  check (discount_value > 0)
  not valid;

alter table public.promotions
  drop constraint if exists promotions_percentage_max_100;

alter table public.promotions
  add constraint promotions_percentage_max_100
  check (
    discount_type <> 'percentage'
    or discount_value <= 100
  )
  not valid;

alter table public.promotions
  drop constraint if exists promotions_name_not_blank;

alter table public.promotions
  add constraint promotions_name_not_blank
  check (length(btrim(name)) > 0)
  not valid;

alter table public.promotions
  drop constraint if exists promotions_banner_not_blank;

alter table public.promotions
  add constraint promotions_banner_not_blank
  check (length(btrim(banner_text)) > 0)
  not valid;

-- ---------------------------------------------------------
-- PROMOTION RULES
-- ---------------------------------------------------------

-- A rule must carry exactly the value required by its rule_type.
-- "all" carries no target value.
alter table public.promotion_rules
  drop constraint if exists promotion_rules_target_matches_type;

alter table public.promotion_rules
  add constraint promotion_rules_target_matches_type
  check (
    (
      rule_type = 'all'
      and status_value is null
      and category_id is null
      and brand_id is null
      and gender_value is null
      and product_id is null
    )
    or
    (
      rule_type = 'status'
      and status_value is not null
      and category_id is null
      and brand_id is null
      and gender_value is null
      and product_id is null
    )
    or
    (
      rule_type = 'category'
      and status_value is null
      and category_id is not null
      and brand_id is null
      and gender_value is null
      and product_id is null
    )
    or
    (
      rule_type = 'brand'
      and status_value is null
      and category_id is null
      and brand_id is not null
      and gender_value is null
      and product_id is null
    )
    or
    (
      rule_type = 'gender'
      and status_value is null
      and category_id is null
      and brand_id is null
      and gender_value is not null
      and product_id is null
    )
    or
    (
      rule_type = 'product'
      and status_value is null
      and category_id is null
      and brand_id is null
      and gender_value is null
      and product_id is not null
    )
  )
  not valid;

-- Current product-status model: only In Stock / Sold Out.
alter table public.promotion_rules
  drop constraint if exists promotion_rules_status_value_valid;

alter table public.promotion_rules
  add constraint promotion_rules_status_value_valid
  check (
    status_value is null
    or status_value in ('in_stock', 'sold_out')
  )
  not valid;

-- Avoid duplicate identical rules within one promotion.
create unique index if not exists
  promotion_rules_unique_all_rule_idx
on public.promotion_rules (promotion_id)
where rule_type = 'all';

create unique index if not exists
  promotion_rules_unique_status_rule_idx
on public.promotion_rules (
  promotion_id,
  status_value
)
where rule_type = 'status';

create unique index if not exists
  promotion_rules_unique_category_rule_idx
on public.promotion_rules (
  promotion_id,
  category_id
)
where rule_type = 'category';

create unique index if not exists
  promotion_rules_unique_brand_rule_idx
on public.promotion_rules (
  promotion_id,
  brand_id
)
where rule_type = 'brand';

create unique index if not exists
  promotion_rules_unique_gender_rule_idx
on public.promotion_rules (
  promotion_id,
  gender_value
)
where rule_type = 'gender';

create unique index if not exists
  promotion_rules_unique_product_rule_idx
on public.promotion_rules (
  promotion_id,
  product_id
)
where rule_type = 'product';

-- ---------------------------------------------------------
-- VALIDATE EXISTING DATA WHEN SAFE
-- ---------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from public.promotions
    where discount_value <= 0
  ) then
    alter table public.promotions
      validate constraint promotions_discount_value_positive;
  end if;

  if not exists (
    select 1
    from public.promotions
    where discount_type = 'percentage'
      and discount_value > 100
  ) then
    alter table public.promotions
      validate constraint promotions_percentage_max_100;
  end if;

  if not exists (
    select 1
    from public.promotions
    where length(btrim(name)) = 0
  ) then
    alter table public.promotions
      validate constraint promotions_name_not_blank;
  end if;

  if not exists (
    select 1
    from public.promotions
    where length(btrim(banner_text)) = 0
  ) then
    alter table public.promotions
      validate constraint promotions_banner_not_blank;
  end if;

  if not exists (
    select 1
    from public.promotion_rules
    where not (
      (
        rule_type = 'all'
        and status_value is null
        and category_id is null
        and brand_id is null
        and gender_value is null
        and product_id is null
      )
      or
      (
        rule_type = 'status'
        and status_value is not null
        and category_id is null
        and brand_id is null
        and gender_value is null
        and product_id is null
      )
      or
      (
        rule_type = 'category'
        and status_value is null
        and category_id is not null
        and brand_id is null
        and gender_value is null
        and product_id is null
      )
      or
      (
        rule_type = 'brand'
        and status_value is null
        and category_id is null
        and brand_id is not null
        and gender_value is null
        and product_id is null
      )
      or
      (
        rule_type = 'gender'
        and status_value is null
        and category_id is null
        and brand_id is null
        and gender_value is not null
        and product_id is null
      )
      or
      (
        rule_type = 'product'
        and status_value is null
        and category_id is null
        and brand_id is null
        and gender_value is null
        and product_id is not null
      )
    )
  ) then
    alter table public.promotion_rules
      validate constraint promotion_rules_target_matches_type;
  end if;

  if not exists (
    select 1
    from public.promotion_rules
    where status_value is not null
      and status_value not in ('in_stock', 'sold_out')
  ) then
    alter table public.promotion_rules
      validate constraint promotion_rules_status_value_valid;
  end if;
end
$$;
