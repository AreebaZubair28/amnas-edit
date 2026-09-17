"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Package,
  Eye,
  Search,
  X,
  Upload,
  Palette,
  Tag,
  CalendarDays,
  Percent,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Product,
  ProductStatus,
  Gender,
  ProductVariant,
  STATUS_LABELS,
  STATUS_CLASS,
} from "@/types/product";

/* =========================================================
   BASIC TYPES
========================================================= */

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductWithRefs = Product & {
  brand_id: string | null;
  category_id: string | null;
};

type EditorProduct = Partial<Product> & {
  brand_id?: string | null;
  category_id?: string | null;
};

type VariantEditor = {
  id?: string;
  product_id?: string;
  color_name: string;
  image_url: string;
  gallery: string[];
  details: string;
  price: number | null;
};

/* =========================================================
   PROMOTION TYPES
========================================================= */

type PromotionDiscountType =
  | "percentage"
  | "fixed";

type PromotionRuleType =
  | "all"
  | "status"
  | "category"
  | "brand"
  | "gender"
  | "product";

type Promotion = {
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

type PromotionRule = {
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

type PromotionEditor = {
  id?: string;
  name: string;
  banner_text: string;
  discount_type: PromotionDiscountType;
  discount_value: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
};

type PromotionStatus =
  | "upcoming"
  | "active"
  | "ended"
  | "disabled";
type SiteSettings = {
  about_title: string;
  about_text: string;
  delivery_policy: string;
  return_policy: string;
  preorder_policy: string;
  in_stock_policy: string;
  customs_hold_delay_policy: string;
  privacy_policy: string;
  terms_conditions: string;
  instagram_url: string;
  whatsapp_number: string;
  tiktok_url: string;
};

type ProductReview = {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  is_approved: boolean;
  created_at: string;
};

const blankSiteSettings: SiteSettings = {
  about_title: "",
  about_text: "",
  delivery_policy: "",
  return_policy: "",
  preorder_policy: "",
  in_stock_policy: "",
  customs_hold_delay_policy: "",
  privacy_policy: "",
  terms_conditions: "",
  instagram_url: "",
  whatsapp_number: "",
  tiktok_url: "",
};

const blankPromotion: PromotionEditor = {
  name: "",
  banner_text: "",
  discount_type: "percentage",
  discount_value: 14,
  start_at: "",
  end_at: "",
  is_active: true,
};

const blankRule: PromotionRule = {
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

const blank: EditorProduct = {
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

const blankVariant: VariantEditor = {
  color_name: "",
  image_url: "",
  gallery: [],
  details: "",
  price: null,
};

/* =========================================================
   DATE HELPERS
========================================================= */

function toDateTimeLocal(
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

function dateTimeLocalToISO(
  value: string
): string {
  return new Date(value).toISOString();
}

function getPromotionStatus(
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

function promotionDateLabel(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function promotionStatusLabel(
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

/* =========================================================
   COMPONENT
========================================================= */

export type AdminSection =
  | "overview"
  | "products"
  | "promotions"
  | "reviews"
  | "settings";

export default function AdminDashboard({
  section = "overview",
}: {
  section?: AdminSection;
}) {
  const router = useRouter();

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [
    products,
    setProducts,
  ] = useState<ProductWithRefs[]>([]);

  const [brands, setBrands] =
    useState<Brand[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    variants,
    setVariants,
  ] = useState<ProductVariant[]>([]);

  const [
    userEmail,
    setUserEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    editor,
    setEditor,
  ] =
    useState<EditorProduct | null>(
      null
    );

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("All");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    brandFilter,
    setBrandFilter,
  ] = useState("All");

  const [
    genderFilter,
    setGenderFilter,
  ] = useState("All");

  const [
    priceRangeFilter,
    setPriceRangeFilter,
  ] = useState("All");

  const [
    error,
    setError,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    variantUploading,
    setVariantUploading,
  ] = useState(false);

  const [
    variantEditor,
    setVariantEditor,
  ] =
    useState<VariantEditor | null>(
      null
    );

  const [
    selectedProductId,
    setSelectedProductId,
  ] =
    useState<string | null>(null);

  const [
    pendingVariants,
    setPendingVariants,
  ] = useState<VariantEditor[]>([]);

  /* =======================================================
     PROMOTIONS
  ======================================================= */

  const [
    promotions,
    setPromotions,
  ] = useState<Promotion[]>([]);

  const [
    promotionRules,
    setPromotionRules,
  ] = useState<
    Record<string, PromotionRule[]>
  >({});

  const [
    promotionEditor,
    setPromotionEditor,
  ] =
    useState<PromotionEditor | null>(
      null
    );

  const [
    editingPromotionRules,
    setEditingPromotionRules,
  ] = useState<PromotionRule[]>([]);
  /* =======================================================
     WEBSITE SETTINGS
  ======================================================= */

  const [
    siteSettings,
    setSiteSettings,
  ] = useState<SiteSettings>(
    blankSiteSettings
  );

  const [
    settingsSaving,
    setSettingsSaving,
  ] = useState(false);

  /* =======================================================
     REVIEWS
  ======================================================= */

  const [
    reviews,
    setReviews,
  ] = useState<ProductReview[]>([]);

  const [
    reviewsLoading,
    setReviewsLoading,
  ] = useState(true);


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const load = async () => {
    setError("");

    /*
     * Supabase intentionally persists its auth session
     * in the browser. We use sessionStorage as an
     * additional owner-access marker so that:
     *
     * - Refreshing /admin keeps the owner logged in.
     * - Closing the browser tab/window clears the marker.
     * - Reopening /admin therefore requires login again.
     */
    const ownerSession =
      sessionStorage.getItem(
        "amnas-edit-owner-session"
      );

    if (
      ownerSession !==
      "authenticated"
    ) {
      await supabase().auth.signOut();
      router.replace("/login");
      return;
    }

    const client = supabase();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      sessionStorage.removeItem(
        "amnas-edit-owner-session"
      );

      router.replace("/login");
      return;
    }
    setUserEmail(user.email || "");

    const [
      productsResult,
      brandsResult,
      categoriesResult,
      promotionsResult,
    ] = await Promise.all([
      client
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      client
        .from("brands")
        .select("id, name, slug")
        .order("name", {
          ascending: true,
        }),

      client
        .from("categories")
        .select("id, name, slug")
        .order("name", {
          ascending: true,
        }),

      client
        .from("promotions")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (productsResult.error) {
      setError(
        productsResult.error.message
      );
    }

    if (brandsResult.error) {
      setError(
        brandsResult.error.message
      );
    }

    if (categoriesResult.error) {
      setError(
        categoriesResult.error.message
      );
    }

    if (promotionsResult.error) {
      setError(
        promotionsResult.error.message
      );
    }

    setProducts(
      (productsResult.data as ProductWithRefs[]) ||
      []
    );

    setBrands(
      (brandsResult.data as Brand[]) || []
    );

    setCategories(
      (categoriesResult.data as Category[]) ||
      []
    );

    const loadedPromotions =
      (promotionsResult.data as Promotion[]) ||
      [];

    setPromotions(
      loadedPromotions
    );

    setReviewsLoading(true);

    const {
      data: reviewsData,
      error: reviewsError,
    } = await client
      .from("product_reviews")
      .select(
        "id, product_id, customer_name, rating, review_text, is_approved, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (reviewsError) {
      setError(reviewsError.message);
      setReviews([]);
    } else {
      setReviews(
        (reviewsData as ProductReview[]) ||
        []
      );
    }

    setReviewsLoading(false);


    /*
     * Load website settings.
     *
     * These values are intentionally stored in
     * Supabase so the owner can change policies,
     * About text, and contact links without
     * editing the website code.
     */
    const {
      data: settingsData,
      error: settingsError,
    } = await client
      .from("site_settings")
      .select("setting_key, setting_value");

    if (settingsError) {
      setError(
        settingsError.message
      );
    } else if (settingsData) {
      const loadedSettings = {
        ...blankSiteSettings,
      };

      for (
        const row of settingsData as {
          setting_key: string;
          setting_value: string;
        }[]
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            loadedSettings,
            row.setting_key
          )
        ) {
          loadedSettings[
            row.setting_key as keyof SiteSettings
          ] = row.setting_value;
        }
      }

      setSiteSettings(
        loadedSettings
      );
    }

    setLoading(false);

    if (
      loadedPromotions.length >
      0
    ) {
      const {
        data: rulesData,
        error: rulesError,
      } = await client
        .from("promotion_rules")
        .select("*")
        .in(
          "promotion_id",
          loadedPromotions.map(
            (promotion) =>
              promotion.id
          )
        )
        .order("created_at", {
          ascending: true,
        });

      if (rulesError) {
        setError(
          rulesError.message
        );
        return;
      }

      const grouped: Record<
        string,
        PromotionRule[]
      > = {};

      for (
        const promotion of
        loadedPromotions
      ) {
        grouped[
          promotion.id
        ] = [];
      }

      for (
        const rule of
        (rulesData as PromotionRule[]) ||
        []
      ) {
        if (!rule.promotion_id) {
          continue;
        }

        if (
          !grouped[
          rule.promotion_id
          ]
        ) {
          grouped[
            rule.promotion_id
          ] = [];
        }

        grouped[
          rule.promotion_id
        ].push(rule);
      }

      setPromotionRules(
        grouped
      );
    } else {
      setPromotionRules({});
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* =======================================================
     VARIANTS
  ======================================================= */

  async function loadVariants(
    productId: string
  ) {
    const {
      data,
      error,
    } = await supabase()
      .from(
        "product_variants"
      )
      .select("*")
      .eq(
        "product_id",
        productId
      )
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setVariants(
      (data as ProductVariant[]) ||
      []
    );
  }

  /* =======================================================
     AUTH
  ======================================================= */

  async function logout() {
    sessionStorage.removeItem(
      "amnas-edit-owner-session"
    );
    await supabase().auth.signOut();
    router.push("/");
  }

  /* =======================================================
     NEW PRODUCT
  ======================================================= */

  function openNewProduct() {
    const defaultCategory =
      categories.find(
        (category) =>
          category.name === "Bags"
      );

    setSelectedProductId(null);
    setVariants([]);
    setPendingVariants([]);

    setEditor({
      ...blank,
      category_id:
        defaultCategory?.id ||
        null,
    });
  }

  /* =======================================================
     EDIT PRODUCT
  ======================================================= */

  async function openEditProduct(
    product: ProductWithRefs
  ) {
    setPendingVariants([]);

    setEditor({
      ...product,
      brand_id:
        product.brand_id,
      category_id:
        product.category_id,
    });

    setSelectedProductId(
      product.id
    );

    await loadVariants(
      product.id
    );
  }

  /* =======================================================
     PRODUCT IMAGE
  ======================================================= */

  async function uploadImage(
    file: File
  ) {
    setError("");

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Image must be 8MB or smaller."
      );
      return;
    }

    setUploading(true);

    const client = supabase();

    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const path =
      `${crypto.randomUUID()}.${ext}`;

    const {
      error: uploadError,
    } = await client.storage
      .from("product-images")
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      setError(
        uploadError.message
      );
      setUploading(false);
      return;
    }

    const { data } =
      client.storage
        .from("product-images")
        .getPublicUrl(
          path
        );

    setEditor((prev) =>
      prev
        ? {
          ...prev,
          image_url:
            data.publicUrl,
        }
        : prev
    );

    setUploading(false);
  }

  /* =======================================================
     VARIANT IMAGE
  ======================================================= */

  async function uploadVariantImage(
    file: File
  ) {
    setError("");

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Image must be 8MB or smaller."
      );
      return;
    }

    setVariantUploading(
      true
    );

    const client = supabase();

    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const path =
      `${crypto.randomUUID()}.${ext}`;

    const {
      error: uploadError,
    } = await client.storage
      .from("product-images")
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      setError(
        uploadError.message
      );
      setVariantUploading(
        false
      );
      return;
    }

    const { data } =
      client.storage
        .from("product-images")
        .getPublicUrl(
          path
        );

    setVariantEditor((prev) =>
      prev
        ? {
          ...prev,
          image_url:
            data.publicUrl,
        }
        : prev
    );

    setVariantUploading(
      false
    );
  }

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  async function save(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (
      !editor?.name?.trim()
    ) {
      setError(
        "Product name is required."
      );
      return;
    }

    if (!editor.brand_id) {
      setError(
        "Please select a brand."
      );
      return;
    }

    if (
      !editor.category_id
    ) {
      setError(
        "Please select a category."
      );
      return;
    }

    const selectedBrand =
      brands.find(
        (brand) =>
          brand.id ===
          editor.brand_id
      );

    const selectedCategory =
      categories.find(
        (category) =>
          category.id ===
          editor.category_id
      );

    if (!selectedBrand) {
      setError(
        "Selected brand could not be found."
      );
      return;
    }

    if (!selectedCategory) {
      setError(
        "Selected category could not be found."
      );
      return;
    }

    const client =
      supabase();

    const payload = {
      name: editor.name.trim(),

      brand:
        selectedBrand.name,

      category:
        selectedCategory.name,

      brand_id:
        selectedBrand.id,

      category_id:
        selectedCategory.id,

      status:
        editor.status ||
        "in_stock",

      gender:
        editor.gender ||
        "unisex",

      price:
        editor.price ?? null,

      description:
        editor.description ||
        "",

      details:
        editor.details ||
        "",

      delivery_return:
        editor.delivery_return ||
        "",

      image_url:
        editor.image_url ||
        null,

      gallery:
        editor.gallery ||
        [],

      whatsapp_url:
        editor.whatsapp_url ||
        null,

      instagram_url:
        editor.instagram_url ||
        null,

      featured:
        !!editor.featured,
    };

    if (editor.id) {
      const result =
        await client
          .from("products")
          .update(
            payload
          )
          .eq(
            "id",
            editor.id
          );

      if (result.error) {
        setError(
          result.error.message
        );
        return;
      }

      setEditor(null);
      await load();
      return;
    }

    const result =
      await client
        .from("products")
        .insert(
          payload
        )
        .select("id")
        .single();

    if (result.error) {
      setError(
        result.error.message
      );
      return;
    }

    const newProductId =
      result.data.id;

    if (
      pendingVariants.length >
      0
    ) {
      const variantPayload =
        pendingVariants.map(
          (variant) => ({
            product_id:
              newProductId,

            color_name:
              variant.color_name.trim(),

            image_url:
              variant.image_url ||
              null,

            gallery:
              variant.gallery ||
              [],

            details:
              variant.details ||
              "",

            price:
              variant.price ??
              null,
          })
        );

      const variantResult =
        await client
          .from(
            "product_variants"
          )
          .insert(
            variantPayload
          );

      if (
        variantResult.error
      ) {
        setError(
          `Product was created, but colors could not be saved: ${variantResult.error.message}`
        );

        await load();
        return;
      }
    }

    setPendingVariants(
      []
    );

    setVariants([]);

    setSelectedProductId(
      newProductId
    );

    setEditor(null);

    await load();
  }

  /* =======================================================
     SAVE COLOR
  ======================================================= */

  async function saveVariant() {
    setError("");

    if (
      !variantEditor?.color_name.trim()
    ) {
      setError(
        "Color name is required."
      );
      return;
    }

    if (
      !selectedProductId
    ) {
      if (variantEditor.id) {
        setError(
          "This color cannot be edited yet."
        );
        return;
      }

      const duplicate =
        pendingVariants.some(
          (variant) =>
            variant.color_name
              .trim()
              .toLowerCase() ===
            variantEditor.color_name
              .trim()
              .toLowerCase()
        );

      if (duplicate) {
        setError(
          "This color has already been added."
        );
        return;
      }

      setPendingVariants(
        (prev) => [
          ...prev,
          {
            ...variantEditor,
            color_name:
              variantEditor.color_name.trim(),
          },
        ]
      );

      setVariantEditor(
        null
      );

      return;
    }

    const client =
      supabase();

    const payload = {
      product_id:
        selectedProductId,

      color_name:
        variantEditor.color_name.trim(),

      image_url:
        variantEditor.image_url ||
        null,

      gallery:
        variantEditor.gallery ||
        [],

      details:
        variantEditor.details ||
        "",

      price:
        variantEditor.price ??
        null,
    };

    const result =
      variantEditor.id
        ? await client
          .from(
            "product_variants"
          )
          .update(
            payload
          )
          .eq(
            "id",
            variantEditor.id
          )
        : await client
          .from(
            "product_variants"
          )
          .insert(
            payload
          );

    if (result.error) {
      setError(
        result.error.message
      );
      return;
    }

    setVariantEditor(
      null
    );

    await loadVariants(
      selectedProductId
    );
  }

  function removePendingVariant(
    index: number
  ) {
    setPendingVariants(
      (prev) =>
        prev.filter(
          (_, i) =>
            i !== index
        )
    );
  }

  async function removeVariant(
    id: string
  ) {
    if (
      !confirm(
        "Delete this color variant?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase()
        .from(
          "product_variants"
        )
        .delete()
        .eq(
          "id",
          id
        );

    if (error) {
      setError(
        error.message
      );
      return;
    }

    if (
      selectedProductId
    ) {
      await loadVariants(
        selectedProductId
      );
    }
  }

  /* =======================================================
     REMOVE PRODUCT
  ======================================================= */

  async function remove(
    id: string
  ) {
    if (
      !confirm(
        "Delete this product? This cannot be undone."
      )
    ) {
      return;
    }

    const { error } =
      await supabase()
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
      setError(
        error.message
      );
    } else {
      await load();
    }
  }

  /* =======================================================
     PROMOTION HELPERS
  ======================================================= */

  function ruleLabel(
    rule: PromotionRule
  ): string {
    switch (
    rule.rule_type
    ) {
      case "all":
        return "All products";

      case "status":
        if (
          rule.status_value ===
          "in_stock"
        ) {
          return "In Stock";
        }

        if (
          rule.status_value ===
          "coming_soon"
        ) {
          return "Coming In";
        }

        if (
          rule.status_value ===
          "preorder"
        ) {
          return "Preorder / Sourced";
        }

        return "Status";

      case "category":
        return (
          categories.find(
            (category) =>
              category.id ===
              rule.category_id
          )?.name ||
          "Category"
        );

      case "brand":
        return (
          brands.find(
            (brand) =>
              brand.id ===
              rule.brand_id
          )?.name ||
          "Brand"
        );

      case "gender":
        if (
          rule.gender_value ===
          "female"
        ) {
          return "Women";
        }

        if (
          rule.gender_value ===
          "male"
        ) {
          return "Men";
        }

        if (
          rule.gender_value ===
          "unisex"
        ) {
          return "Unisex";
        }

        return "Gender";

      case "product":
        return (
          products.find(
            (product) =>
              product.id ===
              rule.product_id
          )?.name ||
          "Product"
        );

      default:
        return "Rule";
    }
  }

  function openNewPromotion() {
    setPromotionEditor({
      ...blankPromotion,
      start_at: "",
      end_at: "",
    });

    setEditingPromotionRules([
      {
        ...blankRule,
      },
    ]);
  }

  async function openEditPromotion(
    promotion: Promotion
  ) {
    const {
      data,
      error,
    } = await supabase()
      .from(
        "promotion_rules"
      )
      .select("*")
      .eq(
        "promotion_id",
        promotion.id
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      setError(
        error.message
      );
      return;
    }

    setPromotionEditor({
      id: promotion.id,
      name: promotion.name,
      banner_text:
        promotion.banner_text,
      discount_type:
        promotion.discount_type,
      discount_value:
        promotion.discount_value,
      start_at:
        toDateTimeLocal(
          promotion.start_at
        ),
      end_at:
        toDateTimeLocal(
          promotion.end_at
        ),
      is_active:
        promotion.is_active,
    });

    setEditingPromotionRules(
      data &&
        data.length > 0
        ? (data as PromotionRule[])
        : [
          {
            ...blankRule,
          },
        ]
    );
  }

  function updatePromotionRule(
    index: number,
    updates: Partial<PromotionRule>
  ) {
    setEditingPromotionRules(
      (previous) =>
        previous.map(
          (rule, ruleIndex) =>
            ruleIndex ===
              index
              ? {
                ...rule,
                ...updates,
              }
              : rule
        )
    );
  }

  function addPromotionRule() {
    setEditingPromotionRules(
      (previous) => [
        ...previous,
        {
          ...blankRule,
        },
      ]
    );
  }

  function removePromotionRule(
    index: number
  ) {
    setEditingPromotionRules(
      (previous) => {
        if (
          previous.length ===
          1
        ) {
          return [
            {
              ...blankRule,
            },
          ];
        }

        return previous.filter(
          (
            _,
            ruleIndex
          ) =>
            ruleIndex !==
            index
        );
      }
    );
  }

  async function savePromotion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const {
      data: { user },
    } =
      await supabase().auth.getUser();

    if (!user) {
      setError(
        "Your owner session is no longer authenticated. Please sign out and log in again."
      );
      return;
    }

    if (
      !promotionEditor?.name.trim()
    ) {
      setError(
        "Promotion name is required."
      );
      return;
    }

    if (
      !promotionEditor.banner_text.trim()
    ) {
      setError(
        "Banner text is required."
      );
      return;
    }

    if (
      promotionEditor.discount_value <
      0
    ) {
      setError(
        "Discount value cannot be negative."
      );
      return;
    }

    if (
      promotionEditor.discount_type ===
      "percentage" &&
      promotionEditor.discount_value >
      100
    ) {
      setError(
        "Percentage discount cannot be greater than 100."
      );
      return;
    }

    if (
      !promotionEditor.start_at ||
      !promotionEditor.end_at
    ) {
      setError(
        "Start and end dates are required."
      );
      return;
    }

    const startDate =
      new Date(
        promotionEditor.start_at
      );

    const endDate =
      new Date(
        promotionEditor.end_at
      );

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      setError(
        "End date must be after the start date."
      );
      return;
    }

    if (
      editingPromotionRules.length ===
      0
    ) {
      setError(
        "Please add at least one promotion rule."
      );
      return;
    }

    for (
      const rule of
      editingPromotionRules
    ) {
      if (
        rule.rule_type ===
        "status" &&
        !rule.status_value
      ) {
        setError(
          "Please select a status for every status rule."
        );
        return;
      }

      if (
        rule.rule_type ===
        "category" &&
        !rule.category_id
      ) {
        setError(
          "Please select a category for every category rule."
        );
        return;
      }

      if (
        rule.rule_type ===
        "brand" &&
        !rule.brand_id
      ) {
        setError(
          "Please select a brand for every brand rule."
        );
        return;
      }

      if (
        rule.rule_type ===
        "gender" &&
        !rule.gender_value
      ) {
        setError(
          "Please select a gender for every gender rule."
        );
        return;
      }

      if (
        rule.rule_type ===
        "product" &&
        !rule.product_id
      ) {
        setError(
          "Please select a product for every product rule."
        );
        return;
      }
    }

    const client =
      supabase();

    const promotionPayload = {
      name:
        promotionEditor.name.trim(),

      banner_text:
        promotionEditor.banner_text.trim(),

      discount_type:
        promotionEditor.discount_type,

      discount_value:
        promotionEditor.discount_value,

      start_at:
        dateTimeLocalToISO(
          promotionEditor.start_at
        ),

      end_at:
        dateTimeLocalToISO(
          promotionEditor.end_at
        ),

      is_active:
        promotionEditor.is_active,
    };

    let promotionId =
      promotionEditor.id;

    if (promotionId) {
      const {
        error: updateError,
      } = await client
        .from("promotions")
        .update(
          promotionPayload
        )
        .eq(
          "id",
          promotionId
        );

      if (updateError) {
        setError(
          updateError.message
        );
        return;
      }

      const {
        error:
        deleteRulesError,
      } = await client
        .from(
          "promotion_rules"
        )
        .delete()
        .eq(
          "promotion_id",
          promotionId
        );

      if (deleteRulesError) {
        setError(
          deleteRulesError.message
        );
        return;
      }
    } else {
      const newPromotionId =
        crypto.randomUUID();

      const {
        error: insertError,
      } = await client
        .from("promotions")
        .insert({
          id: newPromotionId,
          ...promotionPayload,
        });

      if (insertError) {
        setError(
          insertError.message
        );
        return;
      }

      promotionId =
        newPromotionId;
    }

    if (!promotionId) {
      setError(
        "Promotion could not be saved."
      );
      return;
    }

    const rulePayload =
      editingPromotionRules.map(
        (rule) => ({
          promotion_id:
            promotionId,

          rule_type:
            rule.rule_type,

          status_value:
            rule.rule_type ===
              "status"
              ? rule.status_value
              : null,

          category_id:
            rule.rule_type ===
              "category"
              ? rule.category_id
              : null,

          brand_id:
            rule.rule_type ===
              "brand"
              ? rule.brand_id
              : null,

          gender_value:
            rule.rule_type ===
              "gender"
              ? rule.gender_value
              : null,

          product_id:
            rule.rule_type ===
              "product"
              ? rule.product_id
              : null,
        })
      );

    const {
      error:
      rulesInsertError,
    } = await client
      .from(
        "promotion_rules"
      )
      .insert(
        rulePayload
      );

    if (
      rulesInsertError
    ) {
      setError(
        rulesInsertError.message
      );
      return;
    }

    setPromotionEditor(
      null
    );

    setEditingPromotionRules(
      []
    );

    await load();
  }

  async function removePromotion(
    id: string
  ) {
    if (
      !confirm(
        "Delete this promotion? Its rules will also be deleted."
      )
    ) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase()
      .from("promotions")
      .delete()
      .eq(
        "id",
        id
      );

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    await load();
  }

  /* =======================================================
     WEBSITE SETTINGS
  ======================================================= */

  function updateSiteSetting(
    key: keyof SiteSettings,
    value: string
  ) {
    setSiteSettings(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  }

  async function saveSiteSettings() {
    setError("");
    setSettingsSaving(true);

    try {
      const client = supabase();

      const rows = (
        Object.keys(siteSettings) as Array<
          keyof SiteSettings
        >
      ).map((key) => ({
        setting_key: key,
        setting_value:
          siteSettings[key] || "",
        updated_at:
          new Date().toISOString(),
      }));

      const {
        error: settingsError,
      } = await client
        .from("site_settings")
        .upsert(
          rows,
          {
            onConflict:
              "setting_key",
          }
        );

      if (settingsError) {
        setError(
          settingsError.message
        );
        return;
      }
    } finally {
      setSettingsSaving(false);
    }
  }

  /* =======================================================
     REVIEWS
  ======================================================= */

  async function updateReviewApproval(
    id: string,
    isApproved: boolean
  ) {
    setError("");

    const {
      error: reviewError,
    } = await supabase()
      .from("product_reviews")
      .update({
        is_approved: isApproved,
      })
      .eq("id", id);

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    setReviews((previous) =>
      previous.map((review) =>
        review.id === id
          ? {
              ...review,
              is_approved: isApproved,
            }
          : review
      )
    );
  }

  async function removeReview(
    id: string
  ) {
    if (
      !confirm(
        "Delete this review? This cannot be undone."
      )
    ) {
      return;
    }

    setError("");

    const {
      error: reviewError,
    } = await supabase()
      .from("product_reviews")
      .delete()
      .eq("id", id);

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    setReviews((previous) =>
      previous.filter(
        (review) =>
          review.id !== id
      )
    );
  }

  /* =======================================================
     INVENTORY STATISTICS
  ======================================================= */

  const categoryStats = useMemo(
    () =>
      categories.map((category) => ({
        name: category.name,
        count: products.filter(
          (product) =>
            product.category ===
            category.name
        ).length,
      })),
    [categories, products]
  );

  const brandStats = useMemo(
    () =>
      brands.map((brand) => ({
        name: brand.name,
        count: products.filter(
          (product) =>
            product.brand ===
            brand.name
        ).length,
      })),
    [brands, products]
  );

  const genderStats = useMemo(
    () => [
      {
        name: "Women",
        count: products.filter(
          (product) =>
            product.gender === "female"
        ).length,
      },
      {
        name: "Men",
        count: products.filter(
          (product) =>
            product.gender === "male"
        ).length,
      },
      {
        name: "Unisex",
        count: products.filter(
          (product) =>
            product.gender === "unisex"
        ).length,
      },
    ],
    [products]
  );

  const pendingReviewsCount = useMemo(
    () =>
      reviews.filter(
        (review) =>
          !review.is_approved
      ).length,
    [reviews]
  );

  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filtered =
    useMemo(
      () =>
        products.filter((p) => {
          const matchesSearch =
            `${p.name} ${p.brand} ${p.category}`
              .toLowerCase()
              .includes(
                query.toLowerCase()
              );

          const matchesCategory =
            categoryFilter === "All" ||
            p.category ===
            categoryFilter;

          const matchesStatus =
            statusFilter === "All" ||
            p.status ===
            statusFilter;

          const matchesBrand =
            brandFilter === "All" ||
            p.brand ===
            brandFilter;

          const matchesGender =
            genderFilter === "All" ||
            p.gender ===
            genderFilter;

          let matchesPrice = true;

          if (
            priceRangeFilter !==
            "All"
          ) {
            if (
              p.price === null
            ) {
              matchesPrice = false;
            } else {
              switch (
              priceRangeFilter
              ) {
                case "under_25000":
                  matchesPrice =
                    p.price < 25000;
                  break;

                case "25000_35000":
                  matchesPrice =
                    p.price >= 25000 &&
                    p.price <= 35000;
                  break;

                case "35000_50000":
                  matchesPrice =
                    p.price >= 35000 &&
                    p.price <= 50000;
                  break;

                case "50000_100000":
                  matchesPrice =
                    p.price >= 50000 &&
                    p.price <= 100000;
                  break;

                case "above_100000":
                  matchesPrice =
                    p.price > 100000;
                  break;

                default:
                  matchesPrice = true;
              }
            }
          }

          return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus &&
            matchesBrand &&
            matchesGender &&
            matchesPrice
          );
        }),
      [
        products,
        query,
        categoryFilter,
        statusFilter,
        brandFilter,
        genderFilter,
        priceRangeFilter,
      ]
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="admin-page">
        <div className="empty">
          Checking your account...
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <a
            href="/"
            className="logo"
          >
            Amna&apos;s{" "}
            <span>Edit</span>
          </a>

          <span className="admin-pill">
            OWNER
          </span>
        </div>

        <div className="admin-user">
          <span>
            {userEmail}
          </span>

          <button
            onClick={logout}
            className="ghost"
            type="button"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </header>

      <nav
        aria-label="Owner dashboard navigation"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          padding: "0 24px 20px",
        }}
      >
        {[
          ["/admin", "Overview", "overview"],
          ["/admin/products", "Products", "products"],
          ["/admin/promotions", "Promotions", "promotions"],
          ["/admin/reviews", "Reviews", "reviews"],
          ["/admin/settings", "Website Settings", "settings"],
        ].map(([href, label, key]) => (
          <a
            key={href}
            href={href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 12px",
              border: "1px solid var(--line)",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 11,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              background: section === key ? "#f8e3ea" : "#fff",
              color: section === key ? "var(--pink-deep)" : "var(--ink)",
              fontWeight: section === key ? 700 : 500,
            }}
          >
            {label}
            {key === "reviews" && pendingReviewsCount > 0 ? (
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--pink-deep)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {pendingReviewsCount}
              </span>
            ) : null}
          </a>
        ))}
      </nav>

      <section className="admin-content">
        {error && (
          <div className="error admin-error">
            {error}
          </div>
        )}

        {section === "products" && (<>
        {/* =================================================
            PRODUCT HEADER
        ================================================= */}

        <div className="admin-title">
          <div>
            <p className="kicker">
              OWNER DASHBOARD
            </p>

            <h1>
              Manage your edit.
            </h1>
          </div>

          <button
            className="button primary"
            onClick={
              openNewProduct
            }
            type="button"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

          </>
        )}

        {section === "overview" && (<>
        {/* =================================================
            STATS
        ================================================= */}

        <div className="stats">
          <div>
            <Package />

            <strong>
              {products.length}
            </strong>

            <span>
              Total products
            </span>
          </div>

          <div>
            <Eye />

            <strong>
              {
                products.filter(
                  (p) =>
                    p.status ===
                    "in_stock"
                ).length
              }
            </strong>

            <span>
              In stock
            </span>
          </div>

          <div>
            <Package />

            <strong>
              {
                products.filter(
                  (p) =>
                    p.status ===
                    "coming_soon"
                ).length
              }
            </strong>

            <span>
              Coming in
            </span>
          </div>

          <div>
            <Package />

            <strong>
              {
                products.filter(
                  (p) =>
                    p.status ===
                    "preorder"
                ).length
              }
            </strong>

            <span>
              Preorders
            </span>
          </div>
        </div>

        {/* =================================================
            CATEGORY STATISTICS
        ================================================= */}

        <div
          className="admin-title"
          style={{
            marginTop: 45,
            marginBottom: 20,
          }}
        >
          <div>
            <p className="kicker">
              CATEGORY BREAKDOWN
            </p>

            <h2 className="admin-section-title">
              Products by category.
            </h2>
          </div>
        </div>

        <div className="stats">
          {categoryStats.map((category) => (
            <div key={category.name}>
              <Package />

              <strong>
                {category.count}
              </strong>

              <span>
                {category.name}
              </span>
            </div>
          ))}
        </div>

        {/* =================================================
            BRAND STATISTICS
        ================================================= */}

        <div
          className="admin-title"
          style={{
            marginTop: 35,
            marginBottom: 20,
          }}
        >
          <div>
            <p className="kicker">
              BRAND BREAKDOWN
            </p>

            <h2 className="admin-section-title">
              Products by brand.
            </h2>
          </div>
        </div>

        <div className="stats">
          {brandStats.map((brand) => (
            <div key={brand.name}>
              <Package />

              <strong>
                {brand.count}
              </strong>

              <span>
                {brand.name}
              </span>
            </div>
          ))}
        </div>

        {/* =================================================
            GENDER STATISTICS
        ================================================= */}

        <div
          className="admin-title"
          style={{
            marginTop: 35,
            marginBottom: 20,
          }}
        >
          <div>
            <p className="kicker">
              GENDER BREAKDOWN
            </p>

            <h2 className="admin-section-title">
              Products by audience.
            </h2>
          </div>
        </div>

        <div className="stats">
          {genderStats.map((gender) => (
            <div key={gender.name}>
              <Package />

              <strong>
                {gender.count}
              </strong>

              <span>
                {gender.name}
              </span>
            </div>
          ))}
        </div>

          </>
        )}

        {section === "reviews" && (<>
        {/* =================================================
            REVIEWS SECTION
        ================================================= */}

        <div
          className="admin-title"
          style={{
            marginTop: 55,
            marginBottom: 24,
          }}
        >
          <div>
            <p className="kicker">
              CUSTOMER REVIEWS
            </p>

            <h2 className="admin-section-title">
              Reviews & approvals.
            </h2>

            <p className="settings-intro">
              Approve reviews before they appear publicly.
              Customer names stay private on the customer-facing website.
            </p>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="variant-empty">
            <span>
              Loading reviews...
            </span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="variant-empty">
            <span>
              No customer reviews yet.
            </span>

            <small>
              Reviews submitted by customers will appear here.
            </small>
          </div>
        ) : (
          <div className="promotions-list">
            {reviews.map((review) => {
              const productName =
                products.find(
                  (product) =>
                    product.id ===
                    review.product_id
                )?.name ||
                "Unknown product";

              return (
                <article
                  key={review.id}
                  className="promotion-card"
                >
                  <div className="promotion-main">
                    <div className="promotion-icon">
                      <span
                        style={{
                          fontSize: 18,
                          lineHeight: 1,
                        }}
                      >
                        ★
                      </span>
                    </div>

                    <div className="promotion-info">
                      <div className="promotion-title-row">
                        <div className="promotion-title-content">
                          <h3>
                            {productName}
                          </h3>

                          <span
                            className={`promotion-status ${
                              review.is_approved
                                ? "promotion-status-active"
                                : "promotion-status-upcoming"
                            }`}
                          >
                            {review.is_approved
                              ? "APPROVED"
                              : "PENDING"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--pink-deep)",
                            fontSize: 13,
                            letterSpacing: 1,
                          }}
                        >
                          {"★".repeat(
                            Math.max(
                              0,
                              Math.min(
                                5,
                                review.rating
                              )
                            )
                          )}
                          {"☆".repeat(
                            Math.max(
                              0,
                              5 -
                                Math.max(
                                  0,
                                  Math.min(
                                    5,
                                    review.rating
                                  )
                                )
                            )
                          )}
                        </span>

                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: 10,
                          }}
                        >
                          {review.rating}/5
                        </span>

                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: 10,
                          }}
                        >
                          {review.customer_name}
                        </span>
                      </div>

                      <p className="promotion-banner">
                        {review.review_text}
                      </p>

                      <span
                        style={{
                          color: "var(--muted)",
                          fontSize: 10,
                        }}
                      >
                        {new Date(
                          review.created_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div
                    className="promotion-actions"
                    style={{
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        updateReviewApproval(
                          review.id,
                          !review.is_approved
                        )
                      }
                    >
                      {review.is_approved
                        ? "Hide Review"
                        : "Approve Review"}
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete review"
                      onClick={() =>
                        removeReview(
                          review.id
                        )
                      }
                    >
                      <Trash2
                        size={17}
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {reviews.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: -20,
              marginBottom: 35,
            }}
          >
            <span className="promotion-rule">
              {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </span>

            <span className="promotion-rule">
              {pendingReviewsCount}{" "}
              pending
            </span>
          </div>
        )}

          </>
        )}

        {section === "promotions" && (<>
        {/* =================================================
            PROMOTIONS SECTION
        ================================================= */}

        <div className="admin-title promotion-heading">
          <div>
            <p className="kicker">
              SALES & PROMOTIONS
            </p>

            <h2 className="admin-section-title">
              Occasional offers.
            </h2>
          </div>

          <button
            className="button primary"
            type="button"
            onClick={
              openNewPromotion
            }
          >
            <Tag size={17} />
            New Sale
          </button>
        </div>

        {promotions.length ===
          0 ? (
          <div className="variant-empty promotion-empty">
            <Tag size={22} />

            <span>
              No sales or promotions
              created yet.
            </span>

            <small>
              Create a sale and choose
              exactly which products it
              applies to.
            </small>
          </div>
        ) : (
          <div className="promotions-list">
            {promotions.map(
              (promotion) => {
                const rules =
                  promotionRules[
                  promotion.id
                  ] || [];

                const promotionStatus =
                  getPromotionStatus(
                    promotion
                  );

                return (
                  <article
                    className={`promotion-card promotion-card-${promotionStatus}`}
                    key={
                      promotion.id
                    }
                  >
                    <div className="promotion-main">
                      <div className="promotion-icon">
                        {promotion.discount_type ===
                          "percentage" ? (
                          <Percent
                            size={
                              20
                            }
                          />
                        ) : (
                          <Tag
                            size={
                              20
                            }
                          />
                        )}
                      </div>

                      <div className="promotion-info">
                        <div className="promotion-title-row">
                          <div className="promotion-title-content">
                            <h3>
                              {
                                promotion.name
                              }
                            </h3>

                            <span
                              className={`promotion-status promotion-status-${promotionStatus}`}
                            >
                              {
                                promotionStatusLabel(
                                  promotionStatus
                                )
                              }
                            </span>
                          </div>
                        </div>

                        <p className="promotion-banner">
                          {
                            promotion.banner_text
                          }
                        </p>

                        <div className="promotion-details">
                          <div className="promotion-discount">
                            <span className="promotion-detail-label">
                              Discount
                            </span>

                            <strong>
                              {promotion.discount_type ===
                                "percentage"
                                ? `${promotion.discount_value}% OFF`
                                : `Rs.${promotion.discount_value.toLocaleString()} OFF`}
                            </strong>
                          </div>

                          <div className="promotion-dates">
                            <span className="promotion-detail-label">
                              Duration
                            </span>

                            <div className="promotion-date-range">
                              <span>
                                <CalendarDays
                                  size={
                                    13
                                  }
                                />

                                {
                                  promotionDateLabel(
                                    promotion.start_at
                                  )
                                }
                              </span>

                              <span className="promotion-date-arrow">
                                →
                              </span>

                              <span>
                                <CalendarDays
                                  size={
                                    13
                                  }
                                />

                                {
                                  promotionDateLabel(
                                    promotion.end_at
                                  )
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="promotion-rules-section">
                          <span className="promotion-detail-label">
                            Applies to
                          </span>

                          <div className="promotion-rules">
                            {rules.length ===
                              0 ? (
                              <span className="promotion-rule">
                                No rules
                              </span>
                            ) : (
                              rules.map(
                                (
                                  rule,
                                  ruleIndex
                                ) => (
                                  <span
                                    className="promotion-rule"
                                    key={
                                      rule.id ||
                                      `${promotion.id}-${ruleIndex}`
                                    }
                                  >
                                    {
                                      ruleLabel(
                                        rule
                                      )
                                    }
                                  </span>
                                )
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="promotion-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit promotion"
                        onClick={() =>
                          openEditPromotion(
                            promotion
                          )
                        }
                      >
                        <Pencil
                          size={
                            17
                          }
                        />
                      </button>

                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete promotion"
                        onClick={() =>
                          removePromotion(
                            promotion.id
                          )
                        }
                      >
                        <Trash2
                          size={
                            17
                          }
                        />
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

          </>
        )}

        {section === "settings" && (<>
        {/* =================================================
            WEBSITE SETTINGS
        ================================================= */}

        <div className="admin-title settings-heading">
          <div>
            <p className="kicker">
              WEBSITE SETTINGS
            </p>

            <h2 className="admin-section-title">
              Keep your website up to date.
            </h2>

            <p className="settings-intro">
              Edit policies, About content, and
              contact links here. Changes are
              saved to your website settings and
              can be updated later without editing
              the code.
            </p>
          </div>

          <button
            className="button primary"
            type="button"
            onClick={saveSiteSettings}
            disabled={settingsSaving}
          >
            {settingsSaving
              ? "Saving..."
              : "Save Website Settings"}
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-section">
            <div className="settings-section-heading">
              <h3>
                About
              </h3>

              <p>
                This content can be used for the
                customer-facing About section.
              </p>
            </div>

            <div className="form-grid">
              <label>
                About title

                <input
                  value={siteSettings.about_title}
                  onChange={(e) =>
                    updateSiteSetting(
                      "about_title",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Curated, not crowded."
                />
              </label>

              <label>
                About text

                <textarea
                  rows={4}
                  value={siteSettings.about_text}
                  onChange={(e) =>
                    updateSiteSetting(
                      "about_text",
                      e.target.value
                    )
                  }
                  placeholder="Write your About content here..."
                />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-heading">
              <h3>
                Policies
              </h3>

              <p>
                Leave these blank until you are
                ready to add your final policy text.
              </p>
            </div>

            <div className="settings-policy-grid">
              <label>
                Delivery Policy

                <textarea
                  rows={5}
                  value={siteSettings.delivery_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "delivery_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your delivery policy..."
                />
              </label>

              <label>
                Return / Exchange Policy

                <textarea
                  rows={5}
                  value={siteSettings.return_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "return_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your return or exchange policy..."
                />
              </label>

              <label>
                Preorder Policy

                <textarea
                  rows={5}
                  value={siteSettings.preorder_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "preorder_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your preorder policy..."
                />
              </label>

              <label>
                In-Stock Policy

                <textarea
                  rows={5}
                  value={siteSettings.in_stock_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "in_stock_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your in-stock policy..."
                />
              </label>

              <label>
                Customs Hold &amp; Delay Policy

                <textarea
                  rows={5}
                  value={siteSettings.customs_hold_delay_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "customs_hold_delay_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your customs hold and delay policy..."
                />
              </label>

              <label>
                Privacy Policy

                <textarea
                  rows={5}
                  value={siteSettings.privacy_policy}
                  onChange={(e) =>
                    updateSiteSetting(
                      "privacy_policy",
                      e.target.value
                    )
                  }
                  placeholder="Add your privacy policy..."
                />
              </label>

              <label>
                Terms &amp; Conditions

                <textarea
                  rows={5}
                  value={siteSettings.terms_conditions}
                  onChange={(e) =>
                    updateSiteSetting(
                      "terms_conditions",
                      e.target.value
                    )
                  }
                  placeholder="Add your terms and conditions..."
                />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-heading">
              <h3>
                Contact &amp; Social Links
              </h3>

              <p>
                Keep your public contact details in
                one place so they can be changed later.
              </p>
            </div>

            <div className="form-grid">
              <label>
                Instagram URL

                <input
                  type="url"
                  value={siteSettings.instagram_url}
                  onChange={(e) =>
                    updateSiteSetting(
                      "instagram_url",
                      e.target.value
                    )
                  }
                  placeholder="https://instagram.com/..."
                />
              </label>

              <label>
                WhatsApp Number

                <input
                  value={siteSettings.whatsapp_number}
                  onChange={(e) =>
                    updateSiteSetting(
                      "whatsapp_number",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 923001234567"
                />
              </label>

              <label>
                TikTok URL

                <input
                  type="url"
                  value={siteSettings.tiktok_url}
                  onChange={(e) =>
                    updateSiteSetting(
                      "tiktok_url",
                      e.target.value
                    )
                  }
                  placeholder="https://www.tiktok.com/@..."
                />
              </label>
            </div>
          </div>
        </div>

          </>
        )}

        {section === "products" && (<>
        {/* =================================================
            PRODUCT SEARCH
        ================================================= */}

        <div className="admin-toolbar">
          <div className="search">
            <Search size={17} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Search products..."
            />
          </div>

          <div className="select-wrap">
            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="in_stock">
                In Stock
              </option>

              <option value="coming_soon">
                Coming In
              </option>

              <option value="preorder">
                Preorder / Sourced
              </option>
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={
                categoryFilter
              }
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={
                      category.name
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={
                brandFilter
              }
              onChange={(e) =>
                setBrandFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Brands
              </option>

              {brands.map(
                (brand) => (
                  <option
                    key={brand.id}
                    value={
                      brand.name
                    }
                  >
                    {brand.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={
                genderFilter
              }
              onChange={(e) =>
                setGenderFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All
              </option>

              <option value="female">
                Women
              </option>

              <option value="male">
                Men
              </option>

              <option value="unisex">
                Unisex
              </option>
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={
                priceRangeFilter
              }
              onChange={(e) =>
                setPriceRangeFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Prices
              </option>

              <option value="under_25000">
                Under Rs. 25,000
              </option>

              <option value="25000_35000">
                Rs. 25,000 – 35,000
              </option>

              <option value="35000_50000">
                Rs. 35,000 – 50,000
              </option>

              <option value="50000_100000">
                Rs. 50,000 – 100,000
              </option>

              <option value="above_100000">
                Above Rs. 100,000
              </option>
            </select>
          </div>
        </div>

        {/* =================================================
            PRODUCT TABLE
        ================================================= */}

        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  Product
                </th>

                <th>
                  Brand
                </th>

                <th>
                  Category
                </th>

                <th>
                  Status
                </th>

                <th>
                  Price
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (p) => (
                  <tr
                    key={p.id}
                  >
                    <td>
                      <div className="table-product">
                        {p.image_url ? (
                          <img
                            src={
                              p.image_url
                            }
                            alt=""
                          />
                        ) : (
                          <div className="tiny-placeholder">
                            AE
                          </div>
                        )}

                        <span>
                          {p.name}
                        </span>
                      </div>
                    </td>

                    <td>
                      {p.brand ||
                        "—"}
                    </td>

                    <td>
                      {p.category}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${STATUS_CLASS[p.status]}`}
                      >
                        {
                          STATUS_LABELS[
                          p.status
                          ]
                        }
                      </span>
                    </td>

                    <td>
                      {p.price ===
                        null
                        ? "—"
                        : `Rs.${p.price.toLocaleString()}`}
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title="Edit"
                          type="button"
                          onClick={() =>
                            openEditProduct(
                              p
                            )
                          }
                        >
                          <Pencil
                            size={
                              17
                            }
                          />
                        </button>

                        <button
                          className="icon-btn danger"
                          title="Delete"
                          type="button"
                          onClick={() =>
                            remove(
                              p.id
                            )
                          }
                        >
                          <Trash2
                            size={
                              17
                            }
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
          </>
        )}

      </section>

      {/* =====================================================
          PRODUCT EDITOR
      ===================================================== */}

      {section === "products" && editor && (
        <div className="modal-backdrop">
          <div className="editor-modal">
            <button
              className="icon-btn modal-close"
              onClick={() =>
                setEditor(null)
              }
              type="button"
            >
              <X />
            </button>

            <p className="kicker">
              {editor.id
                ? "EDIT PRODUCT"
                : "NEW PRODUCT"}
            </p>

            <h2>
              {editor.id
                ? "Update piece"
                : "Add a new piece"}
            </h2>

            <form
              onSubmit={save}
              className="editor-form"
            >
              <div className="form-grid">
                <label>
                  Product name

                  <input
                    required
                    value={
                      editor.name ||
                      ""
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        name:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Brand

                  <select
                    required
                    value={
                      editor.brand_id ||
                      ""
                    }
                    onChange={(e) => {
                      const selected =
                        brands.find(
                          (brand) =>
                            brand.id ===
                            e.target
                              .value
                        );

                      setEditor({
                        ...editor,
                        brand_id:
                          e.target
                            .value ||
                          null,
                        brand:
                          selected?.name ||
                          "",
                      });
                    }}
                  >
                    <option value="">
                      Select a brand
                    </option>

                    {brands.map(
                      (brand) => (
                        <option
                          key={
                            brand.id
                          }
                          value={
                            brand.id
                          }
                        >
                          {
                            brand.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Category

                  <select
                    required
                    value={
                      editor.category_id ||
                      ""
                    }
                    onChange={(e) => {
                      const selected =
                        categories.find(
                          (
                            category
                          ) =>
                            category.id ===
                            e.target
                              .value
                        );

                      setEditor({
                        ...editor,
                        category_id:
                          e.target
                            .value ||
                          null,
                        category:
                          selected?.name ||
                          "",
                      });
                    }}
                  >
                    <option value="">
                      Select a category
                    </option>

                    {categories.map(
                      (
                        category
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Status

                  <select
                    value={
                      editor.status ||
                      "in_stock"
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        status:
                          e.target
                            .value as ProductStatus,
                      })
                    }
                  >
                    <option value="in_stock">
                      In Stock
                    </option>

                    <option value="coming_soon">
                      Coming In
                    </option>

                    <option value="preorder">
                      Preorder / Sourced
                    </option>
                  </select>
                </label>

                <label>
                  Audience

                  <select
                    value={
                      editor.gender ||
                      "unisex"
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        gender:
                          e.target
                            .value as Gender,
                      })
                    }
                  >
                    <option value="female">
                      Women
                    </option>

                    <option value="male">
                      Men
                    </option>

                    <option value="unisex">
                      Unisex
                    </option>
                  </select>
                </label>

                <label>
                  Price (PKR)

                  <input
                    type="number"
                    min="0"
                    value={
                      editor.price ??
                      ""
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        price:
                          e.target
                            .value
                            ? Number(
                              e.target
                                .value
                            )
                            : null,
                      })
                    }
                  />
                </label>
              </div>

              <div className="upload-section">
                <label>
                  Main product image
                </label>

                <div className="upload-row">
                  <label className="upload-button">
                    <Upload
                      size={16}
                    />

                    {uploading
                      ? "Uploading..."
                      : "Upload image"}

                    <input
                      type="file"
                      accept="image/*"
                      disabled={
                        uploading
                      }
                      onChange={(e) => {
                        const file =
                          e.target
                            .files?.[0];

                        if (file) {
                          uploadImage(
                            file
                          );
                        }

                        e.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  <span className="upload-help">
                    JPG, PNG, WEBP • max 8MB
                  </span>
                </div>

                {editor.image_url && (
                  <div className="image-preview">
                    <img
                      src={
                        editor.image_url
                      }
                      alt="Product preview"
                    />

                    <button
                      type="button"
                      className="remove-image"
                      onClick={() =>
                        setEditor({
                          ...editor,
                          image_url:
                            "",
                        })
                      }
                    >
                      <X
                        size={
                          15
                        }
                      />
                      Remove
                    </button>
                  </div>
                )}

                <details className="url-fallback">
                  <summary>
                    Or use an image URL
                  </summary>

                  <input
                    value={
                      editor.image_url ||
                      ""
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        image_url:
                          e.target
                            .value,
                      })
                    }
                    placeholder="https://..."
                  />
                </details>
              </div>

              <label>
                Description

                <textarea
                  rows={4}
                  value={
                    editor.description ||
                    ""
                  }
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      description:
                        e.target
                          .value,
                    })
                  }
                />
              </label>

              <label>
                Details

                <textarea
                  rows={4}
                  value={
                    editor.details ||
                    ""
                  }
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      details:
                        e.target
                          .value,
                    })
                  }
                  placeholder="Material, dimensions, features, condition, etc."
                />
              </label>

              <label>
                Delivery & Return

                <textarea
                  rows={4}
                  value={
                    editor.delivery_return ||
                    ""
                  }
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      delivery_return:
                        e.target
                          .value,
                    })
                  }
                  placeholder="Delivery time, return/exchange policy, etc."
                />
              </label>

              <div className="form-grid">
                <label>
                  WhatsApp link

                  <input
                    value={
                      editor.whatsapp_url ||
                      ""
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        whatsapp_url:
                          e.target
                            .value,
                      })
                    }
                    placeholder="Optional — uses site WhatsApp by default"
                  />
                </label>

                <label>
                  Instagram link

                  <input
                    value={
                      editor.instagram_url ||
                      ""
                    }
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        instagram_url:
                          e.target
                            .value,
                      })
                    }
                    placeholder="Optional — uses site Instagram by default"
                  />
                </label>
              </div>

              <label className="check">
                <input
                  type="checkbox"
                  checked={
                    !!editor.featured
                  }
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      featured:
                        e.target
                          .checked,
                    })
                  }
                />

                Feature this product
              </label>

              <div className="variant-section">
                <div className="variant-header">
                  <div>
                    <p className="kicker">
                      PRODUCT COLORS
                    </p>

                    <h3>
                      Available colors
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setVariantEditor({
                        ...blankVariant,
                        product_id:
                          editor.id,
                      })
                    }
                  >
                    <Palette
                      size={16}
                    />
                    Add Color
                  </button>
                </div>

                {!editor.id &&
                  pendingVariants.length ===
                  0 && (
                    <div className="variant-empty">
                      <Palette
                        size={
                          20
                        }
                      />

                      <span>
                        No color variants
                        added yet.
                      </span>
                    </div>
                  )}

                {!editor.id &&
                  pendingVariants.length >
                  0 && (
                    <div className="variant-list">
                      {pendingVariants.map(
                        (
                          variant,
                          index
                        ) => (
                          <div
                            className="variant-card"
                            key={`${variant.color_name}-${index}`}
                          >
                            {variant.image_url ? (
                              <img
                                src={
                                  variant.image_url
                                }
                                alt={
                                  variant.color_name
                                }
                              />
                            ) : (
                              <div className="variant-placeholder">
                                <Palette
                                  size={
                                    22
                                  }
                                />
                              </div>
                            )}

                            <div className="variant-info">
                              <strong>
                                {
                                  variant.color_name
                                }
                              </strong>
                            </div>

                            <div className="variant-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Edit color"
                                onClick={() =>
                                  setVariantEditor(
                                    {
                                      ...variant,
                                    }
                                  )
                                }
                              >
                                <Pencil
                                  size={
                                    16
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete color"
                                onClick={() =>
                                  removePendingVariant(
                                    index
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                {editor.id &&
                  variants.length ===
                  0 && (
                    <div className="variant-empty">
                      <Palette
                        size={
                          20
                        }
                      />

                      <span>
                        No color variants
                        added yet.
                      </span>
                    </div>
                  )}

                {editor.id &&
                  variants.length >
                  0 && (
                    <div className="variant-list">
                      {variants.map(
                        (
                          variant
                        ) => (
                          <div
                            className="variant-card"
                            key={
                              variant.id
                            }
                          >
                            {variant.image_url ? (
                              <img
                                src={
                                  variant.image_url
                                }
                                alt={
                                  variant.color_name
                                }
                              />
                            ) : (
                              <div className="variant-placeholder">
                                <Palette
                                  size={
                                    22
                                  }
                                />
                              </div>
                            )}

                            <div className="variant-info">
                              <strong>
                                {
                                  variant.color_name
                                }
                              </strong>

                              {variant.price !==
                                null && (
                                  <span>
                                    Rs.{" "}
                                    {variant.price.toLocaleString()}
                                  </span>
                                )}
                            </div>

                            <div className="variant-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Edit color"
                                onClick={() =>
                                  setVariantEditor(
                                    {
                                      id:
                                        variant.id,
                                      product_id:
                                        variant.product_id,
                                      color_name:
                                        variant.color_name,
                                      image_url:
                                        variant.image_url ||
                                        "",
                                      gallery:
                                        variant.gallery ||
                                        [],
                                      details:
                                        variant.details ||
                                        "",
                                      price:
                                        variant.price,
                                    }
                                  )
                                }
                              >
                                <Pencil
                                  size={
                                    16
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete color"
                                onClick={() =>
                                  removeVariant(
                                    variant.id
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <div className="editor-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setEditor(null)
                  }
                >
                  Cancel
                </button>

                <button
                  className="button primary"
                  type="submit"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          COLOR EDITOR
      ===================================================== */}

      {variantEditor && (
        <div className="modal-backdrop">
          <div className="editor-modal variant-modal">
            <button
              className="icon-btn modal-close"
              onClick={() =>
                setVariantEditor(null)
              }
              type="button"
            >
              <X />
            </button>

            <p className="kicker">
              {variantEditor.id
                ? "EDIT COLOR"
                : "NEW COLOR"}
            </p>

            <h2>
              {variantEditor.id
                ? "Update color"
                : "Add a color"}
            </h2>

            <div className="editor-form">
              <label>
                Color name

                <input
                  required
                  value={
                    variantEditor.color_name
                  }
                  onChange={(e) =>
                    setVariantEditor({
                      ...variantEditor,
                      color_name:
                        e.target
                          .value,
                    })
                  }
                  placeholder="e.g. Black, Brown, Beige"
                />
              </label>

              <div className="upload-section">
                <label>
                  Color image
                </label>

                <div className="upload-row">
                  <label className="upload-button">
                    <Upload
                      size={16}
                    />

                    {variantUploading
                      ? "Uploading..."
                      : "Upload image"}

                    <input
                      type="file"
                      accept="image/*"
                      disabled={
                        variantUploading
                      }
                      onChange={(e) => {
                        const file =
                          e.target
                            .files?.[0];

                        if (file) {
                          uploadVariantImage(
                            file
                          );
                        }

                        e.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  <span className="upload-help">
                    JPG, PNG, WEBP • max 8MB
                  </span>
                </div>

                {variantEditor.image_url && (
                  <div className="image-preview">
                    <img
                      src={
                        variantEditor.image_url
                      }
                      alt={
                        variantEditor.color_name
                      }
                    />

                    <button
                      type="button"
                      className="remove-image"
                      onClick={() =>
                        setVariantEditor({
                          ...variantEditor,
                          image_url:
                            "",
                        })
                      }
                    >
                      <X
                        size={
                          15
                        }
                      />
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <label>
                Price (optional)

                <input
                  type="number"
                  min="0"
                  value={
                    variantEditor.price ??
                    ""
                  }
                  onChange={(e) =>
                    setVariantEditor({
                      ...variantEditor,
                      price:
                        e.target.value
                          ? Number(
                            e.target
                              .value
                          )
                          : null,
                    })
                  }
                  placeholder="Leave empty to use main product price"
                />
              </label>

              <label>
                Color-specific details

                <textarea
                  rows={5}
                  value={
                    variantEditor.details
                  }
                  onChange={(e) =>
                    setVariantEditor({
                      ...variantEditor,
                      details:
                        e.target
                          .value,
                    })
                  }
                  placeholder="Details specific to this color..."
                />
              </label>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <div className="editor-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setVariantEditor(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="button primary"
                  onClick={
                    saveVariant
                  }
                  disabled={
                    variantUploading
                  }
                >
                  Save Color
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PROMOTION EDITOR
      ===================================================== */}

      {section === "promotions" && promotionEditor && (
        <div className="modal-backdrop">
          <div className="editor-modal promotion-modal">
            <button
              className="icon-btn modal-close"
              onClick={() =>
                setPromotionEditor(
                  null
                )
              }
              type="button"
            >
              <X />
            </button>

            <p className="kicker">
              {promotionEditor.id
                ? "EDIT SALE"
                : "NEW SALE"}
            </p>

            <h2>
              {promotionEditor.id
                ? "Update promotion"
                : "Create a sale"}
            </h2>

            <form
              onSubmit={
                savePromotion
              }
              className="editor-form"
            >
              <label>
                Sale name

                <input
                  required
                  value={
                    promotionEditor.name
                  }
                  onChange={(e) =>
                    setPromotionEditor(
                      {
                        ...promotionEditor,
                        name:
                          e.target
                            .value,
                      }
                    )
                  }
                  placeholder="e.g. Independence Day Sale"
                />
              </label>

              <label>
                Website banner text

                <input
                  required
                  value={
                    promotionEditor.banner_text
                  }
                  onChange={(e) =>
                    setPromotionEditor(
                      {
                        ...promotionEditor,
                        banner_text:
                          e.target
                            .value,
                      }
                    )
                  }
                  placeholder="e.g. Independence Day Sale — Up to 14% OFF"
                />
              </label>

              <div className="form-grid">
                <label>
                  Discount type

                  <select
                    value={
                      promotionEditor.discount_type
                    }
                    onChange={(e) =>
                      setPromotionEditor(
                        {
                          ...promotionEditor,
                          discount_type:
                            e.target
                              .value as PromotionDiscountType,
                        }
                      )
                    }
                  >
                    <option value="percentage">
                      Percentage (%)
                    </option>

                    <option value="fixed">
                      Fixed amount (PKR)
                    </option>
                  </select>
                </label>

                <label>
                  Discount value

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={
                      promotionEditor.discount_type ===
                        "percentage"
                        ? 100
                        : undefined
                    }
                    value={
                      promotionEditor.discount_value
                    }
                    onChange={(e) =>
                      setPromotionEditor(
                        {
                          ...promotionEditor,
                          discount_value:
                            e.target.value
                              ? Number(
                                e.target
                                  .value
                              )
                              : 0,
                        }
                      )
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Start date &amp; time

                  <input
                    type="datetime-local"
                    required
                    value={
                      promotionEditor.start_at
                    }
                    onChange={(e) =>
                      setPromotionEditor(
                        {
                          ...promotionEditor,
                          start_at:
                            e.target
                              .value,
                        }
                      )
                    }
                  />
                </label>

                <label>
                  End date &amp; time

                  <input
                    type="datetime-local"
                    required
                    value={
                      promotionEditor.end_at
                    }
                    onChange={(e) =>
                      setPromotionEditor(
                        {
                          ...promotionEditor,
                          end_at:
                            e.target
                              .value,
                        }
                      )
                    }
                  />
                </label>
              </div>

              <label className="check">
                <input
                  type="checkbox"
                  checked={
                    promotionEditor.is_active
                  }
                  onChange={(e) =>
                    setPromotionEditor(
                      {
                        ...promotionEditor,
                        is_active:
                          e.target
                            .checked,
                      }
                    )
                  }
                />

                Promotion enabled
              </label>

              <div className="promotion-rule-editor">
                <div className="variant-header">
                  <div>
                    <p className="kicker">
                      SALE APPLIES TO
                    </p>

                    <h3>
                      Promotion rules
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={
                      addPromotionRule
                    }
                  >
                    <Plus
                      size={16}
                    />
                    Add Rule
                  </button>
                </div>

                {editingPromotionRules.map(
                  (
                    rule,
                    index
                  ) => (
                    <div
                      className="promotion-rule-editor-card"
                      key={
                        rule.id ||
                        index
                      }
                    >
                      <div className="form-grid">
                        <label>
                          Rule type

                          <select
                            value={
                              rule.rule_type
                            }
                            onChange={(e) =>
                              updatePromotionRule(
                                index,
                                {
                                  rule_type:
                                    e.target
                                      .value as PromotionRuleType,
                                  status_value:
                                    null,
                                  category_id:
                                    null,
                                  brand_id:
                                    null,
                                  gender_value:
                                    null,
                                  product_id:
                                    null,
                                }
                              )
                            }
                          >
                            <option value="all">
                              All products
                            </option>

                            <option value="status">
                              By status
                            </option>

                            <option value="category">
                              By category
                            </option>

                            <option value="brand">
                              By brand
                            </option>

                            <option value="gender">
                              By gender
                            </option>

                            <option value="product">
                              Specific product
                            </option>
                          </select>
                        </label>

                        {rule.rule_type ===
                          "status" && (
                            <label>
                              Status

                              <select
                                value={
                                  rule.status_value ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePromotionRule(
                                    index,
                                    {
                                      status_value:
                                        e.target
                                          .value,
                                    }
                                  )
                                }
                              >
                                <option value="">
                                  Select status
                                </option>

                                <option value="in_stock">
                                  In Stock
                                </option>

                                <option value="coming_soon">
                                  Coming In
                                </option>

                                <option value="preorder">
                                  Preorder / Sourced
                                </option>
                              </select>
                            </label>
                          )}

                        {rule.rule_type ===
                          "category" && (
                            <label>
                              Category

                              <select
                                value={
                                  rule.category_id ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePromotionRule(
                                    index,
                                    {
                                      category_id:
                                        e.target
                                          .value ||
                                        null,
                                    }
                                  )
                                }
                              >
                                <option value="">
                                  Select category
                                </option>

                                {categories.map(
                                  (
                                    category
                                  ) => (
                                    <option
                                      key={
                                        category.id
                                      }
                                      value={
                                        category.id
                                      }
                                    >
                                      {
                                        category.name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          )}

                        {rule.rule_type ===
                          "brand" && (
                            <label>
                              Brand

                              <select
                                value={
                                  rule.brand_id ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePromotionRule(
                                    index,
                                    {
                                      brand_id:
                                        e.target
                                          .value ||
                                        null,
                                    }
                                  )
                                }
                              >
                                <option value="">
                                  Select brand
                                </option>

                                {brands.map(
                                  (
                                    brand
                                  ) => (
                                    <option
                                      key={
                                        brand.id
                                      }
                                      value={
                                        brand.id
                                      }
                                    >
                                      {
                                        brand.name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          )}

                        {rule.rule_type ===
                          "gender" && (
                            <label>
                              Gender

                              <select
                                value={
                                  rule.gender_value ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePromotionRule(
                                    index,
                                    {
                                      gender_value:
                                        e.target
                                          .value
                                          ? (e.target
                                            .value as Gender)
                                          : null,
                                    }
                                  )
                                }
                              >
                                <option value="">
                                  Select gender
                                </option>

                                <option value="female">
                                  Women
                                </option>

                                <option value="male">
                                  Men
                                </option>

                                <option value="unisex">
                                  Unisex
                                </option>
                              </select>
                            </label>
                          )}

                        {rule.rule_type ===
                          "product" && (
                            <label>
                              Product

                              <select
                                value={
                                  rule.product_id ||
                                  ""
                                }
                                onChange={(e) =>
                                  updatePromotionRule(
                                    index,
                                    {
                                      product_id:
                                        e.target
                                          .value ||
                                        null,
                                    }
                                  )
                                }
                              >
                                <option value="">
                                  Select product
                                </option>

                                {products.map(
                                  (
                                    product
                                  ) => (
                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                    >
                                      {
                                        product.name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          )}

                        {rule.rule_type ===
                          "all" && (
                            <div className="promotion-rule-description">
                              This sale applies
                              to the entire
                              website collection.
                            </div>
                          )}
                      </div>

                      <button
                        type="button"
                        className="button secondary promotion-remove-rule"
                        onClick={() =>
                          removePromotionRule(
                            index
                          )
                        }
                      >
                        <Trash2
                          size={14}
                        />
                        Remove rule
                      </button>
                    </div>
                  )
                )}
              </div>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <div className="editor-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setPromotionEditor(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button primary"
                >
                  Save Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
