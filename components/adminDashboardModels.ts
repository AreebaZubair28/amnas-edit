import type { Product, Gender } from "@/types/product";

/* =========================================================
   BASIC TYPES
========================================================= */

export type Brand = {
  id: string;
  name: string;
  slug: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type ProductWithRefs = Product & {
  brand_id: string | null;
  category_id: string | null;
};

export type EditorProduct = Partial<Product> & {
  brand_id?: string | null;
  category_id?: string | null;
};

export type VariantEditor = {
  id?: string;
  product_id?: string;
  color_name: string;
  image_url: string;
  gallery: string[];
  details: string;
  price: number | null;
  is_available: boolean;
};

/* =========================================================
   PROMOTION TYPES
========================================================= */

export type PromotionDiscountType =
  | "percentage"
  | "fixed";

export type PromotionRuleType =
  | "all"
  | "status"
  | "category"
  | "brand"
  | "gender"
  | "product";

export type Promotion = {
  id: string;
  name: string;
  banner_text: string;
  discount_type: PromotionDiscountType;
  discount_value: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
};

export type PromotionRule = {
  id?: string;
  promotion_id?: string;
  rule_type: PromotionRuleType;
  status_value: string | null;
  category_id: string | null;
  brand_id: string | null;
  gender_value: Gender | null;
  product_id: string | null;
  created_at?: string;
};

export type PromotionEditor = {
  id?: string;
  name: string;
  banner_text: string;
  discount_type: PromotionDiscountType;
  discount_value: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
};

export type PromotionStatus =
  | "upcoming"
  | "active"
  | "ended"
  | "disabled";
export type SiteSettings = {
  about_title: string;
  about_text: string;
  delivery_policy: string;
  return_policy: string;
  in_stock_policy: string;
  customs_hold_delay_policy: string;
  privacy_policy: string;
  terms_conditions: string;
  instagram_url: string;
  whatsapp_number: string;
  tiktok_url: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  is_approved: boolean;
  created_at: string;
};

export type AnalyticsAggregate = {
  product_id: string;
  views: number;
  whatsapp_clicks: number;
  instagram_clicks: number;
};

export const blankSiteSettings: SiteSettings = {
  about_title: "",
  about_text: "",
  delivery_policy: "",
  return_policy: "",
  in_stock_policy: "",
  customs_hold_delay_policy: "",
  privacy_policy: "",
  terms_conditions: "",
  instagram_url: "",
  whatsapp_number: "",
  tiktok_url: "",
};

export const blankPromotion: PromotionEditor = {
  name: "",
  banner_text: "",
  discount_type: "percentage",
  discount_value: 14,
  start_at: "",
  end_at: "",
  is_active: true,
};

export const blankRule: PromotionRule = {
  rule_type: "all",
  status_value: null,
  category_id: null,
  brand_id: null,
  gender_value: null,
  product_id: null,
};

/* =========================================================
   PRODUCT DEFAULTS
========================================================= */

export const blank: EditorProduct = {
  name: "",
  brand: "",
  category: "Bags",
  brand_id: null,
  category_id: null,
  status: "in_stock",
  gender: "female",
  price: null,
  description: "",
  details: "",
  delivery_return: "",
  image_url: "",
  gallery: [],
  whatsapp_url: "",
  instagram_url: "",
  featured: false,
};

export const blankVariant: VariantEditor = {
  color_name: "",
  image_url: "",
  gallery: [],
  details: "",
  price: null,
  is_available: true,
};

/* =========================================================
   DATE HELPERS
========================================================= */

export function toDateTimeLocal(
  value: string
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function dateTimeLocalToISO(
  value: string
): string {
  return new Date(value).toISOString();
}

export function getPromotionStatus(
  promotion: Promotion
): PromotionStatus {
  if (!promotion.is_active) {
    return "disabled";
  }

  const now = Date.now();

  const start = new Date(
    promotion.start_at
  ).getTime();

  const end = new Date(
    promotion.end_at
  ).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now > end) {
    return "ended";
  }

  return "active";
}

export function promotionDateLabel(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export function promotionStatusLabel(
  status: PromotionStatus
): string {
  switch (status) {
    case "upcoming":
      return "SCHEDULED";

    case "active":
      return "ACTIVE NOW";

    case "ended":
      return "ENDED";

    case "disabled":
      return "DISABLED";

    default:
      return "UNKNOWN";
  }
}