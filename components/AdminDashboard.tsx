"use client";

/* eslint-disable @next/next/no-img-element -- Admin-only previews/thumbnails; public storefront images use optimized Next.js Image. */

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
  MessageCircle,
  Instagram,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { optimizeProductImage } from "@/lib/imageUpload";
import { storagePathsFromUrls } from "@/lib/storageImages";
import {
  Product,
  ProductStatus,
  Gender,
  ProductVariant,
  STATUS_LABELS,
  STATUS_CLASS,
} from "@/types/product";

import {
  blankSiteSettings, blankPromotion, blankRule, blank, blankVariant,
  toDateTimeLocal, dateTimeLocalToISO, getPromotionStatus,
  promotionDateLabel, promotionStatusLabel,
} from "./adminDashboardModels";
import type {
  Brand, Category, ProductWithRefs, EditorProduct, VariantEditor,
  PromotionDiscountType, PromotionRuleType, Promotion, PromotionRule,
  PromotionEditor, SiteSettings, ProductReview,
  AnalyticsAggregate,
} from "./adminDashboardModels";

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
    newBrandName,
    setNewBrandName,
  ] = useState("");

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("");

  const [
    taxonomySaving,
    setTaxonomySaving,
  ] = useState(false);

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

  const [
    analyticsRows,
    setAnalyticsRows,
  ] = useState<AnalyticsAggregate[]>([]);

  const [
    analyticsLoading,
    setAnalyticsLoading,
  ] = useState(false);

  const [
    analyticsError,
    setAnalyticsError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    productSaving,
    setProductSaving,
  ] = useState(false);

  const [
    variantSaving,
    setVariantSaving,
  ] = useState(false);

  const [
    promotionSaving,
    setPromotionSaving,
  ] = useState(false);

  const [
    reviewActionId,
    setReviewActionId,
  ] = useState<string | null>(
    null
  );

  const [
    settingsDirty,
    setSettingsDirty,
  ] = useState(false);

  const hasUnsavedWork =
    !!editor ||
    !!variantEditor ||
    !!promotionEditor ||
    settingsDirty;

  useEffect(() => {
    if (!hasUnsavedWork) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [hasUnsavedWork]);

  function beginAdminAction() {
    setError("");
    setSuccessMessage("");
  }

  function confirmDiscardChanges() {
    return confirm(
      "Discard the changes you have not saved?"
    );
  }


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const load = async () => {
    setError("");

    const client = supabase();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const {
      data: isOwner,
      error: ownerError,
    } = await client.rpc("is_owner");

    if (
      ownerError ||
      isOwner !== true
    ) {
      await client.auth.signOut();
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
    const timer =
      window.setTimeout(() => {
        void load();
      }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // Initial admin bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      section !== "overview" ||
      loading
    ) {
      return;
    }

    let active = true;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const {
        data,
        error: analyticsLoadError,
      } = await supabase().rpc(
        "get_owner_analytics_summary",
        {
          p_days: 30,
        }
      );

      if (!active) {
        return;
      }

      if (analyticsLoadError) {
        console.error(
          "Analytics could not be loaded:",
          analyticsLoadError
        );
        setAnalyticsRows([]);
        setAnalyticsError(
          "Business analytics couldn't be loaded right now."
        );
      } else {
        setAnalyticsRows(
          (data as AnalyticsAggregate[]) ||
            []
        );
      }

      setAnalyticsLoading(false);
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [section, loading]);

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
    if (
      hasUnsavedWork &&
      !confirm(
        "You have unsaved changes. Sign out anyway?"
      )
    ) {
      return;
    }

    await supabase().auth.signOut();
    router.replace("/");
  }

  /* =======================================================
     NEW PRODUCT
  ======================================================= */

  function openNewProduct() {
    beginAdminAction();

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
    beginAdminAction();
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

  const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;

  const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  function validateImageFile(
    file: File
  ) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type
      )
    ) {
      return "Please upload a JPG, PNG, or WEBP image.";
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      return "Image must be 5MB or smaller. For best performance, resize large phone photos before uploading.";
    }

    return "";
  }

  /* =======================================================
     BRANDS + CATEGORIES
  ======================================================= */

  function slugifyTaxonomyName(
    value: string
  ) {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function addBrand() {
    beginAdminAction();

    const name =
      newBrandName.trim();

    if (!name) {
      setError(
        "Enter a brand name."
      );
      return;
    }

    if (
      brands.some(
        (brand) =>
          brand.name
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      setError(
        "That brand already exists."
      );
      return;
    }

    const slug =
      slugifyTaxonomyName(name);

    if (!slug) {
      setError(
        "Please enter a valid brand name."
      );
      return;
    }

    setTaxonomySaving(true);

    const {
      data,
      error: brandError,
    } = await supabase()
      .from("brands")
      .insert({
        name,
        slug,
      })
      .select("id, name, slug")
      .single();

    setTaxonomySaving(false);

    if (brandError) {
      setError(
        brandError.message
      );
      return;
    }

    setBrands((previous) =>
      [...previous, data as Brand].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      )
    );

    setNewBrandName("");
    setSuccessMessage(
      "Brand added successfully."
    );
  }

  async function addCategory() {
    beginAdminAction();

    const name =
      newCategoryName.trim();

    if (!name) {
      setError(
        "Enter a category name."
      );
      return;
    }

    if (
      categories.some(
        (category) =>
          category.name
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      setError(
        "That category already exists."
      );
      return;
    }

    const slug =
      slugifyTaxonomyName(name);

    if (!slug) {
      setError(
        "Please enter a valid category name."
      );
      return;
    }

    setTaxonomySaving(true);

    const {
      data,
      error: categoryError,
    } = await supabase()
      .from("categories")
      .insert({
        name,
        slug,
      })
      .select("id, name, slug")
      .single();

    setTaxonomySaving(false);

    if (categoryError) {
      setError(
        categoryError.message
      );
      return;
    }

    setCategories((previous) =>
      [
        ...previous,
        data as Category,
      ].sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      )
    );

    setNewCategoryName("");
    setSuccessMessage(
      "Category added successfully."
    );
  }

  async function removeBrand(
    brand: Brand
  ) {
    beginAdminAction();

    const usageCount =
      products.filter(
        (product) =>
          product.brand_id ===
          brand.id
      ).length;

    if (usageCount > 0) {
      setError(
        `${brand.name} is used by ${usageCount} product${usageCount === 1 ? "" : "s"}. Reassign those products before deleting this brand.`
      );
      return;
    }

    if (
      !confirm(
        `Delete the brand "${brand.name}"?`
      )
    ) {
      return;
    }

    setTaxonomySaving(true);

    const {
      error: brandError,
    } = await supabase()
      .from("brands")
      .delete()
      .eq("id", brand.id);

    setTaxonomySaving(false);

    if (brandError) {
      setError(
        brandError.message
      );
      return;
    }

    setBrands((previous) =>
      previous.filter(
        (item) =>
          item.id !== brand.id
      )
    );

    setSuccessMessage(
      "Brand deleted successfully."
    );
  }

  async function removeCategory(
    category: Category
  ) {
    beginAdminAction();

    const usageCount =
      products.filter(
        (product) =>
          product.category_id ===
          category.id
      ).length;

    if (usageCount > 0) {
      setError(
        `${category.name} is used by ${usageCount} product${usageCount === 1 ? "" : "s"}. Reassign those products before deleting this category.`
      );
      return;
    }

    if (
      !confirm(
        `Delete the category "${category.name}"?`
      )
    ) {
      return;
    }

    setTaxonomySaving(true);

    const {
      error: categoryError,
    } = await supabase()
      .from("categories")
      .delete()
      .eq(
        "id",
        category.id
      );

    setTaxonomySaving(false);

    if (categoryError) {
      setError(
        categoryError.message
      );
      return;
    }

    setCategories((previous) =>
      previous.filter(
        (item) =>
          item.id !==
          category.id
      )
    );

    setSuccessMessage(
      "Category deleted successfully."
    );
  }

  /* =======================================================
     PRODUCT IMAGE
  ======================================================= */

  async function uploadImage(
    file: File
  ) {
    setError("");

    const validationError =
      validateImageFile(file);

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    setUploading(true);

    const client = supabase();

    let optimizedFile: File;

    try {
      optimizedFile =
        await optimizeProductImage(
          file
        );
    } catch (optimizationError) {
      console.error(
        "Image optimization failed:",
        optimizationError
      );

      setError(
        "The image could not be prepared for upload. Please try another JPG, PNG, or WEBP image."
      );
      setUploading(false);
      return;
    }

    const path =
      `${crypto.randomUUID()}.webp`;

    const {
      error: uploadError,
    } = await client.storage
      .from("product-images")
      .upload(
        path,
        optimizedFile,
        {
          cacheControl:
            "31536000",
          contentType:
            "image/webp",
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

  async function uploadOptimizedToStorage(
    file: File
  ): Promise<string | null> {
    const validationError =
      validateImageFile(file);

    if (validationError) {
      setError(validationError);
      return null;
    }

    let optimizedFile: File;

    try {
      optimizedFile =
        await optimizeProductImage(file);
    } catch (optimizationError) {
      console.error(
        "Image optimization failed:",
        optimizationError
      );
      setError(
        "The image could not be prepared for upload. Please try another JPG, PNG, or WEBP image."
      );
      return null;
    }

    const client = supabase();
    const path =
      `${crypto.randomUUID()}.webp`;

    const { error: uploadError } =
      await client.storage
        .from("product-images")
        .upload(
          path,
          optimizedFile,
          {
            cacheControl:
              "31536000",
            contentType:
              "image/webp",
            upsert: false,
          }
        );

    if (uploadError) {
      setError(uploadError.message);
      return null;
    }

    const { data } =
      client.storage
        .from("product-images")
        .getPublicUrl(path);

    return data.publicUrl;
  }

  async function uploadVariantImage(
    file: File
  ) {
    setError("");
    setVariantUploading(true);

    const publicUrl =
      await uploadOptimizedToStorage(
        file
      );

    if (publicUrl) {
      setVariantEditor((prev) =>
        prev
          ? {
              ...prev,
              image_url: publicUrl,
            }
          : prev
      );
    }

    setVariantUploading(false);
  }

  async function uploadProductGalleryImages(
    files: File[]
  ) {
    if (!editor) {
      return;
    }

    const currentGallery =
      editor.gallery || [];

    const remainingSlots =
      Math.max(
        0,
        7 - currentGallery.length
      );

    const selectedFiles =
      files.slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      setError(
        "You can add up to 7 additional product images."
      );
      return;
    }

    setError("");
    setUploading(true);

    const uploaded: string[] = [];

    for (const file of selectedFiles) {
      const publicUrl =
        await uploadOptimizedToStorage(
          file
        );

      if (publicUrl) {
        uploaded.push(publicUrl);
      }
    }

    if (uploaded.length > 0) {
      setEditor((prev) =>
        prev
          ? {
              ...prev,
              gallery: [
                ...(prev.gallery || []),
                ...uploaded,
              ],
            }
          : prev
      );
    }

    setUploading(false);
  }

  async function uploadVariantGalleryImages(
    files: File[]
  ) {
    if (!variantEditor) {
      return;
    }

    const currentGallery =
      variantEditor.gallery || [];

    const remainingSlots =
      Math.max(
        0,
        7 - currentGallery.length
      );

    const selectedFiles =
      files.slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      setError(
        "You can add up to 7 additional images for this color."
      );
      return;
    }

    setError("");
    setVariantUploading(true);

    const uploaded: string[] = [];

    for (const file of selectedFiles) {
      const publicUrl =
        await uploadOptimizedToStorage(
          file
        );

      if (publicUrl) {
        uploaded.push(publicUrl);
      }
    }

    if (uploaded.length > 0) {
      setVariantEditor((prev) =>
        prev
          ? {
              ...prev,
              gallery: [
                ...(prev.gallery || []),
                ...uploaded,
              ],
            }
          : prev
      );
    }

    setVariantUploading(false);
  }

  function moveGalleryImage(
    images: string[],
    fromIndex: number,
    toIndex: number
  ) {
    const next = [...images];
    const [image] =
      next.splice(fromIndex, 1);
    next.splice(toIndex, 0, image);
    return next;
  }

  async function removeStoredImages(
    urls: Array<string | null | undefined>
  ) {
    const paths = storagePathsFromUrls(urls);

    if (paths.length === 0) return;

    const { error } = await supabase()
      .storage
      .from("product-images")
      .remove(paths);

    if (error) {
      console.error(
        "Old product images could not be removed from storage:",
        error
      );
    }
  }

  function imageUrlsFromProduct(
    product: Product | null | undefined
  ) {
    if (!product) return [];

    return [
      product.image_url,
      ...(product.gallery || []),
    ];
  }

  function imageUrlsFromVariant(
    variant: ProductVariant | null | undefined
  ) {
    if (!variant) return [];

    return [
      variant.image_url,
      ...(variant.gallery || []),
    ];
  }

  function removedImageUrls(
    before: Array<string | null | undefined>,
    after: Array<string | null | undefined>
  ) {
    const keep = new Set(
      after.filter((url): url is string => !!url)
    );

    return before.filter(
      (url): url is string => !!url && !keep.has(url)
    );
  }

  const colorVariantsForStatus =
    selectedProductId
      ? variants
      : pendingVariants;

  const hasColorVariants =
    colorVariantsForStatus.length > 0;

  const derivedColorStatus: ProductStatus =
    hasColorVariants &&
    colorVariantsForStatus.some(
      (variant) =>
        variant.is_available
    )
      ? "in_stock"
      : hasColorVariants
        ? "sold_out"
        : (editor?.status ||
          "in_stock");

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  async function save(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    beginAdminAction();

    if (
      productSaving
    ) {
      return;
    }

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

    if (
      editor.price !== null &&
      editor.price !== undefined &&
      editor.price < 0
    ) {
      setError(
        "Product price cannot be negative."
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

    setProductSaving(true);

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
        hasColorVariants
          ? derivedColorStatus
          : editor.status ||
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
      const originalProduct =
        products.find(
          (product) =>
            product.id === editor.id
        );

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
        setProductSaving(false);
        return;
      }

      await removeStoredImages(
        removedImageUrls(
          imageUrlsFromProduct(originalProduct),
          [payload.image_url, ...(payload.gallery || [])]
        )
      );

      setEditor(null);
      setProductSaving(false);
      setSuccessMessage(
        "Product updated successfully."
      );
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
      setProductSaving(false);
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

            is_available:
              variant.is_available,
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

        setProductSaving(false);
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
    setProductSaving(false);
    setSuccessMessage(
      "Product created successfully."
    );

    await load();
  }

  /* =======================================================
     SAVE COLOR
  ======================================================= */

  async function saveVariant() {
    beginAdminAction();

    if (
      variantSaving
    ) {
      return;
    }

    if (
      !variantEditor?.color_name.trim()
    ) {
      setError(
        "Color name is required."
      );
      return;
    }

    if (
      variantEditor.price !== null &&
      variantEditor.price < 0
    ) {
      setError(
        "Color price cannot be negative."
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

      setSuccessMessage(
        "Color added. It will be saved with the product."
      );

      return;
    }

    const duplicateExistingColor =
      variants.some(
        (variant) =>
          variant.id !==
            variantEditor.id &&
          variant.color_name
            .trim()
            .toLowerCase() ===
          variantEditor.color_name
            .trim()
            .toLowerCase()
      );

    if (
      duplicateExistingColor
    ) {
      setError(
        "This color has already been added."
      );
      return;
    }

    setVariantSaving(true);

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

      is_available:
        variantEditor.is_available,
    };

    const originalVariant =
      variantEditor.id
        ? variants.find(
            (variant) =>
              variant.id === variantEditor.id
          )
        : null;

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
      setVariantSaving(false);
      return;
    }

    if (originalVariant) {
      await removeStoredImages(
        removedImageUrls(
          imageUrlsFromVariant(originalVariant),
          [payload.image_url, ...(payload.gallery || [])]
        )
      );
    }

    setVariantEditor(
      null
    );
    setVariantSaving(false);
    setSuccessMessage(
      variantEditor.id
        ? "Color updated successfully."
        : "Color added successfully."
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

    const variantToDelete =
      variants.find(
        (variant) =>
          variant.id === id
      );

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

    await removeStoredImages(
      imageUrlsFromVariant(variantToDelete)
    );

    setSuccessMessage(
      "Color deleted successfully."
    );

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

    const productToDelete =
      products.find(
        (product) =>
          product.id === id
      );

    const client = supabase();

    const {
      data: variantRows,
      error: variantLoadError,
    } = await client
      .from("product_variants")
      .select("image_url, gallery")
      .eq("product_id", id);

    if (variantLoadError) {
      setError(
        `Product could not be deleted safely because its color images could not be checked: ${variantLoadError.message}`
      );
      return;
    }

    const { error } =
      await client
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
      setError(
        error.message
      );
    } else {
      const variantImageUrls =
        (variantRows || []).flatMap(
          (variant) => [
            variant.image_url,
            ...(variant.gallery || []),
          ]
        );

      await removeStoredImages([
        ...imageUrlsFromProduct(productToDelete),
        ...variantImageUrls,
      ]);

      setSuccessMessage(
        "Product deleted successfully."
      );
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
          "sold_out"
        ) {
          return "Sold Out";
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
    beginAdminAction();

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

    beginAdminAction();

    if (
      promotionSaving
    ) {
      return;
    }

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
      promotionEditor.discount_value <=
      0
    ) {
      setError(
        "Discount value must be greater than 0."
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

    setPromotionSaving(true);

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
        setPromotionSaving(false);
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
        setPromotionSaving(false);
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
        setPromotionSaving(false);
        return;
      }

      promotionId =
        newPromotionId;
    }

    if (!promotionId) {
      setError(
        "Promotion could not be saved."
      );
      setPromotionSaving(false);
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
      setPromotionSaving(false);
      return;
    }

    setPromotionEditor(
      null
    );

    setEditingPromotionRules(
      []
    );

    setPromotionSaving(false);
    setSuccessMessage(
      "Promotion saved successfully."
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

    setSuccessMessage(
      "Promotion deleted successfully."
    );
    await load();
  }

  /* =======================================================
     WEBSITE SETTINGS
  ======================================================= */

  function updateSiteSetting(
    key: keyof SiteSettings,
    value: string
  ) {
    setSettingsDirty(true);

    setSiteSettings(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  }

  async function saveSiteSettings() {
    beginAdminAction();

    if (
      settingsSaving
    ) {
      return;
    }

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

      setSettingsDirty(false);
      setSuccessMessage(
        "Website settings saved successfully."
      );
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
    beginAdminAction();

    if (reviewActionId) {
      return;
    }

    setReviewActionId(id);

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
      setReviewActionId(null);
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

    setReviewActionId(null);
    setSuccessMessage(
      isApproved
        ? "Review approved successfully."
        : "Review hidden successfully."
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

    beginAdminAction();

    if (reviewActionId) {
      return;
    }

    setReviewActionId(id);

    const {
      error: reviewError,
    } = await supabase()
      .from("product_reviews")
      .delete()
      .eq("id", id);

    if (reviewError) {
      setError(reviewError.message);
      setReviewActionId(null);
      return;
    }

    setReviews((previous) =>
      previous.filter(
        (review) =>
          review.id !== id
      )
    );

    setReviewActionId(null);
    setSuccessMessage(
      "Review deleted successfully."
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

  const analyticsSummary =
    useMemo(() => {
      let views = 0;
      let whatsappClicks = 0;
      let instagramClicks = 0;

      const byProduct = new Map<
        string,
        {
          views: number;
          whatsapp: number;
          instagram: number;
        }
      >();

      for (
        const row of
        analyticsRows
      ) {
        const productViews =
          Number(row.views) || 0;
        const productWhatsapp =
          Number(
            row.whatsapp_clicks
          ) || 0;
        const productInstagram =
          Number(
            row.instagram_clicks
          ) || 0;

        views += productViews;
        whatsappClicks +=
          productWhatsapp;
        instagramClicks +=
          productInstagram;

        byProduct.set(
          row.product_id,
          {
            views: productViews,
            whatsapp:
              productWhatsapp,
            instagram:
              productInstagram,
          }
        );
      }

      const productRows =
        products
          .map((product) => {
            const eventCounts =
              byProduct.get(
                product.id
              ) || {
                views: 0,
                whatsapp: 0,
                instagram: 0,
              };

            const inquiryClicks =
              eventCounts.whatsapp +
              eventCounts.instagram;

            return {
              id: product.id,
              name: product.name,
              brand:
                product.brand ||
                "Unbranded",
              category:
                product.category ||
                "Uncategorized",
              views:
                eventCounts.views,
              whatsapp:
                eventCounts.whatsapp,
              instagram:
                eventCounts.instagram,
              inquiryClicks,
            };
          })
          .filter(
            (item) =>
              item.views > 0 ||
              item.inquiryClicks > 0
          )
          .sort(
            (a, b) =>
              b.inquiryClicks -
                a.inquiryClicks ||
              b.views - a.views
          );

      function groupInterest(
        field:
          | "brand"
          | "category"
      ) {
        const grouped =
          new Map<
            string,
            {
              name: string;
              views: number;
              inquiries: number;
            }
          >();

        for (
          const row of productRows
        ) {
          const name =
            row[field];

          const current =
            grouped.get(name) || {
              name,
              views: 0,
              inquiries: 0,
            };

          current.views +=
            row.views;
          current.inquiries +=
            row.inquiryClicks;

          grouped.set(
            name,
            current
          );
        }

        return Array.from(
          grouped.values()
        )
          .sort(
            (a, b) =>
              b.inquiries -
                a.inquiries ||
              b.views - a.views
          )
          .slice(0, 5);
      }

      return {
        views,
        whatsappClicks,
        instagramClicks,
        inquiryClicks:
          whatsappClicks +
          instagramClicks,
        productRows:
          productRows.slice(
            0,
            8
          ),
        topBrands:
          groupInterest(
            "brand"
          ),
        topCategories:
          groupInterest(
            "category"
          ),
      };
    }, [
      analyticsRows,
      products,
    ]);

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
          <Link
            href="/"
            className="logo"
          >
            Amna&apos;s{" "}
            <span>Edit</span>
          </Link>

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
          <div
            className="error admin-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="admin-success"
            role="status"
          >
            {successMessage}
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
                    "sold_out"
                ).length
              }
            </strong>

            <span>
              Sold out
            </span>
          </div>
        </div>

        {/* =================================================
            CUSTOMER INTEREST ANALYTICS
        ================================================= */}

        <div
          className="admin-title analytics-heading"
        >
          <div>
            <p className="kicker">
              CUSTOMER INTEREST
            </p>

            <h2 className="admin-section-title">
              Last 30 days.
            </h2>

            <p className="analytics-subtitle">
              Privacy-conscious interaction data:
              product views and inquiry clicks only.
            </p>
          </div>
        </div>

        {analyticsError ? (
          <div
            className="error admin-error"
            role="alert"
          >
            {analyticsError}
          </div>
        ) : analyticsLoading ? (
          <div className="empty analytics-empty">
            Loading business insights...
          </div>
        ) : (
          <>
            <div className="stats analytics-stats">
              <div>
                <Eye />

                <strong>
                  {
                    analyticsSummary.views
                  }
                </strong>

                <span>
                  Product views
                </span>
              </div>

              <div>
                <MessageCircle />

                <strong>
                  {
                    analyticsSummary.whatsappClicks
                  }
                </strong>

                <span>
                  WhatsApp clicks
                </span>
              </div>

              <div>
                <Instagram />

                <strong>
                  {
                    analyticsSummary.instagramClicks
                  }
                </strong>

                <span>
                  Instagram clicks
                </span>
              </div>

              <div>
                <BarChart3 />

                <strong>
                  {
                    analyticsSummary.inquiryClicks
                  }
                </strong>

                <span>
                  Total inquiry clicks
                </span>
              </div>
            </div>

            {analyticsSummary
              .productRows.length === 0 ? (
              <div className="empty analytics-empty">
                Analytics will appear here as
                customers view products and use
                the inquiry buttons.
              </div>
            ) : (
              <div className="analytics-grid">
                <div className="analytics-card analytics-card-wide">
                  <div className="analytics-card-heading">
                    <div>
                      <p className="kicker">
                        TOP PRODUCTS
                      </p>

                      <h3>
                        Products generating interest.
                      </h3>
                    </div>
                  </div>

                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>
                            Product
                          </th>
                          <th>
                            Views
                          </th>
                          <th>
                            WhatsApp
                          </th>
                          <th>
                            Instagram
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {analyticsSummary.productRows.map(
                          (row) => (
                            <tr
                              key={
                                row.id
                              }
                            >
                              <td>
                                <strong>
                                  {
                                    row.name
                                  }
                                </strong>

                                <span>
                                  {
                                    row.brand
                                  }
                                </span>
                              </td>

                              <td>
                                {
                                  row.views
                                }
                              </td>

                              <td>
                                {
                                  row.whatsapp
                                }
                              </td>

                              <td>
                                {
                                  row.instagram
                                }
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="analytics-card">
                  <p className="kicker">
                    TOP CATEGORIES
                  </p>

                  <h3>
                    Category interest.
                  </h3>

                  <div className="analytics-ranking">
                    {analyticsSummary.topCategories.map(
                      (item) => (
                        <div
                          key={
                            item.name
                          }
                        >
                          <span>
                            {
                              item.name
                            }
                          </span>

                          <strong>
                            {
                              item.inquiries
                            } inquiries ·{" "}
                            {
                              item.views
                            } views
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="analytics-card">
                  <p className="kicker">
                    TOP BRANDS
                  </p>

                  <h3>
                    Brand interest.
                  </h3>

                  <div className="analytics-ranking">
                    {analyticsSummary.topBrands.map(
                      (item) => (
                        <div
                          key={
                            item.name
                          }
                        >
                          <span>
                            {
                              item.name
                            }
                          </span>

                          <strong>
                            {
                              item.inquiries
                            } inquiries ·{" "}
                            {
                              item.views
                            } views
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

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
                      disabled={
                        reviewActionId !== null
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
                      aria-label="Delete review"
                      onClick={() =>
                        removeReview(
                          review.id
                        )
                      }
                      disabled={
                        reviewActionId !== null
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
                        aria-label={`Edit ${promotion.name}`}
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
                        aria-label={`Delete ${promotion.name}`}
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
              : settingsDirty
                ? "Save Changes"
                : "Saved"}
          </button>
        </div>

        <div className="settings-card taxonomy-card">
          <div className="settings-section">
            <div className="settings-section-heading">
              <h3>
                Catalogue organization
              </h3>

              <p>
                Add or remove the brands and
                categories used when creating
                products. Items currently assigned
                to products cannot be deleted.
              </p>
            </div>

            <div className="taxonomy-grid">
              <div className="taxonomy-panel">
                <div className="taxonomy-panel-heading">
                  <div>
                    <h4>
                      Brands
                    </h4>

                    <p>
                      {brands.length} available
                    </p>
                  </div>
                </div>

                <div className="taxonomy-add-row">
                  <input
                    value={newBrandName}
                    onChange={(event) =>
                      setNewBrandName(
                        event.target.value
                      )
                    }
                    placeholder="Add a brand"
                    aria-label="New brand name"
                    disabled={taxonomySaving}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        void addBrand();
                      }
                    }}
                  />

                  <button
                    className="button primary"
                    type="button"
                    onClick={addBrand}
                    disabled={
                      taxonomySaving ||
                      !newBrandName.trim()
                    }
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="taxonomy-list">
                  {brands.length === 0 ? (
                    <p className="taxonomy-empty">
                      No brands added yet.
                    </p>
                  ) : (
                    brands.map((brand) => {
                      const usageCount =
                        products.filter(
                          (product) =>
                            product.brand_id ===
                            brand.id
                        ).length;

                      return (
                        <div
                          className="taxonomy-item"
                          key={brand.id}
                        >
                          <div>
                            <strong>
                              {brand.name}
                            </strong>

                            <span>
                              {usageCount} product
                              {usageCount === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <button
                            className="icon-btn danger"
                            type="button"
                            onClick={() =>
                              removeBrand(
                                brand
                              )
                            }
                            disabled={
                              taxonomySaving ||
                              usageCount > 0
                            }
                            aria-label={`Delete ${brand.name}`}
                            title={
                              usageCount > 0
                                ? "Reassign products before deleting this brand."
                                : `Delete ${brand.name}`
                            }
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="taxonomy-panel">
                <div className="taxonomy-panel-heading">
                  <div>
                    <h4>
                      Categories
                    </h4>

                    <p>
                      {categories.length} available
                    </p>
                  </div>
                </div>

                <div className="taxonomy-add-row">
                  <input
                    value={newCategoryName}
                    onChange={(event) =>
                      setNewCategoryName(
                        event.target.value
                      )
                    }
                    placeholder="Add a category"
                    aria-label="New category name"
                    disabled={taxonomySaving}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        void addCategory();
                      }
                    }}
                  />

                  <button
                    className="button primary"
                    type="button"
                    onClick={addCategory}
                    disabled={
                      taxonomySaving ||
                      !newCategoryName.trim()
                    }
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="taxonomy-list">
                  {categories.length === 0 ? (
                    <p className="taxonomy-empty">
                      No categories added yet.
                    </p>
                  ) : (
                    categories.map(
                      (category) => {
                        const usageCount =
                          products.filter(
                            (product) =>
                              product.category_id ===
                              category.id
                          ).length;

                        return (
                          <div
                            className="taxonomy-item"
                            key={
                              category.id
                            }
                          >
                            <div>
                              <strong>
                                {
                                  category.name
                                }
                              </strong>

                              <span>
                                {
                                  usageCount
                                } product
                                {usageCount ===
                                1
                                  ? ""
                                  : "s"}
                              </span>
                            </div>

                            <button
                              className="icon-btn danger"
                              type="button"
                              onClick={() =>
                                removeCategory(
                                  category
                                )
                              }
                              disabled={
                                taxonomySaving ||
                                usageCount > 0
                              }
                              aria-label={`Delete ${category.name}`}
                              title={
                                usageCount > 0
                                  ? "Reassign products before deleting this category."
                                  : `Delete ${category.name}`
                              }
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
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

              <option value="sold_out">
                Sold Out
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
                            loading="lazy"
                            decoding="async"
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
                          aria-label={`Edit ${p.name}`}
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
                          aria-label={`Delete ${p.name}`}
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
          <div
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor-title"
          >
            <button
              className="icon-btn modal-close"
              onClick={() => {
                if (
                  confirmDiscardChanges()
                ) {
                  setEditor(null);
                }
              }}
              type="button"
              disabled={productSaving}
              aria-label="Close product editor"
            >
              <X />
            </button>

            <p className="kicker">
              {editor.id
                ? "EDIT PRODUCT"
                : "NEW PRODUCT"}
            </p>

            <h2 id="product-editor-title">
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
                      hasColorVariants
                        ? derivedColorStatus
                        : editor.status ||
                          "in_stock"
                    }
                    disabled={
                      hasColorVariants
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

                    <option value="sold_out">
                      Sold Out
                    </option>
                  </select>

                  {hasColorVariants && (
                    <span className="upload-help">
                      Automatic from color statuses: if any color is In Stock, the product is In Stock. If all colors are Sold Out, the product is Sold Out.
                    </span>
                  )}
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
                  Product cover image
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
                      accept="image/jpeg,image/png,image/webp"
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
                    Used on catalogue cards and as a fallback • automatically optimized to WEBP
                  </span>
                </div>

                {editor.image_url && (
                  <div className="image-preview">
                    <img
                      src={
                        editor.image_url
                      }
                      alt="Product preview"
                      loading="lazy"
                      decoding="async"
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


              <div className="upload-section">
                <label>
                  General product gallery
                </label>

                <div className="upload-row">
                  <label className="upload-button">
                    <Upload size={16} />
                    {uploading
                      ? "Uploading..."
                      : "Add gallery images"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploading}
                      onChange={(e) => {
                        const files =
                          Array.from(
                            e.target.files || []
                          );

                        if (files.length > 0) {
                          void uploadProductGalleryImages(
                            files
                          );
                        }

                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <span className="upload-help">
                    For products without colors • if colors are added, upload each color&apos;s images below
                  </span>
                </div>

                {(editor.gallery || []).length > 0 && (
                  <div className="admin-gallery-grid">
                    {(editor.gallery || []).map(
                      (image, index) => (
                        <div
                          className="admin-gallery-item"
                          key={`${image}-${index}`}
                        >
                          <img
                            src={image}
                            alt={`Product gallery ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                          />

                          <div className="admin-gallery-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              disabled={index === 0}
                              onClick={() =>
                                setEditor({
                                  ...editor,
                                  gallery: moveGalleryImage(
                                    editor.gallery || [],
                                    index,
                                    index - 1
                                  ),
                                })
                              }
                              aria-label={`Move image ${index + 1} left`}
                              title="Move left"
                            >
                              ←
                            </button>

                            <button
                              type="button"
                              className="icon-btn"
                              disabled={
                                index ===
                                (editor.gallery || []).length - 1
                              }
                              onClick={() =>
                                setEditor({
                                  ...editor,
                                  gallery: moveGalleryImage(
                                    editor.gallery || [],
                                    index,
                                    index + 1
                                  ),
                                })
                              }
                              aria-label={`Move image ${index + 1} right`}
                              title="Move right"
                            >
                              →
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setEditor({
                                  ...editor,
                                  gallery: (editor.gallery || []).filter(
                                    (_, imageIndex) =>
                                      imageIndex !== index
                                  ),
                                })
                              }
                              aria-label={`Remove image ${index + 1}`}
                              title="Remove image"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
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

              <div className="admin-guidance-note">
                <strong>Image setup:</strong>{" "}
                If this product has colors, create every visible color below
                and give each color its own main image/gallery. The product
                cover above remains the catalogue/SEO fallback.
              </div>

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
                              loading="lazy"
                                decoding="async"
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
                                aria-label="Edit color"
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
                                aria-label="Delete color"
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
                              loading="lazy"
                                decoding="async"
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
                                aria-label="Edit color"
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
                                      is_available:
                                        variant.is_available,
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
                                aria-label="Delete color"
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
                  onClick={() => {
                    if (
                      confirmDiscardChanges()
                    ) {
                      setEditor(null);
                    }
                  }}
                  disabled={
                    productSaving
                  }
                >
                  Cancel
                </button>

                <button
                  className="button primary"
                  type="submit"
                  disabled={
                    productSaving ||
                    uploading
                  }
                >
                  {productSaving
                    ? "Saving..."
                    : "Save Product"}
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
          <div
            className="editor-modal variant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="variant-editor-title"
          >
            <button
              className="icon-btn modal-close"
              onClick={() => {
                if (
                  confirmDiscardChanges()
                ) {
                  setVariantEditor(null);
                }
              }}
              type="button"
              disabled={
                variantSaving
              }
              aria-label="Close color editor"
            >
              <X />
            </button>

            <p className="kicker">
              {variantEditor.id
                ? "EDIT COLOR"
                : "NEW COLOR"}
            </p>

            <h2 id="variant-editor-title">
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
                  Main image for this color
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
                      accept="image/jpeg,image/png,image/webp"
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
                    JPG, PNG, WEBP • max 5MB • automatically optimized to WEBP
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


              <div className="upload-section">
                <label>
                  Gallery for this color
                </label>

                <div className="upload-row">
                  <label className="upload-button">
                    <Upload size={16} />
                    {variantUploading
                      ? "Uploading..."
                      : "Add color gallery"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={variantUploading}
                      onChange={(e) => {
                        const files =
                          Array.from(
                            e.target.files || []
                          );

                        if (files.length > 0) {
                          void uploadVariantGalleryImages(
                            files
                          );
                        }

                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <span className="upload-help">
                    Up to 7 additional images for this color • automatically optimized
                  </span>
                </div>

                {variantEditor.gallery.length > 0 && (
                  <div className="admin-gallery-grid">
                    {variantEditor.gallery.map(
                      (image, index) => (
                        <div
                          className="admin-gallery-item"
                          key={`${image}-${index}`}
                        >
                          <img
                            src={image}
                            alt={`${variantEditor.color_name || "Color"} image ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                          />

                          <div className="admin-gallery-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              disabled={index === 0}
                              onClick={() =>
                                setVariantEditor({
                                  ...variantEditor,
                                  gallery: moveGalleryImage(
                                    variantEditor.gallery,
                                    index,
                                    index - 1
                                  ),
                                })
                              }
                              aria-label={`Move color image ${index + 1} left`}
                            >
                              ←
                            </button>

                            <button
                              type="button"
                              className="icon-btn"
                              disabled={
                                index ===
                                variantEditor.gallery.length - 1
                              }
                              onClick={() =>
                                setVariantEditor({
                                  ...variantEditor,
                                  gallery: moveGalleryImage(
                                    variantEditor.gallery,
                                    index,
                                    index + 1
                                  ),
                                })
                              }
                              aria-label={`Move color image ${index + 1} right`}
                            >
                              →
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setVariantEditor({
                                  ...variantEditor,
                                  gallery: variantEditor.gallery.filter(
                                    (_, imageIndex) =>
                                      imageIndex !== index
                                  ),
                                })
                              }
                              aria-label={`Remove color image ${index + 1}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )
                    )}
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
                Color status

                <select
                  value={
                    variantEditor.is_available
                      ? "in_stock"
                      : "sold_out"
                  }
                  onChange={(e) =>
                    setVariantEditor({
                      ...variantEditor,
                      is_available:
                        e.target.value ===
                        "in_stock",
                    })
                  }
                >
                  <option value="in_stock">
                    In Stock
                  </option>

                  <option value="sold_out">
                    Sold Out
                  </option>
                </select>
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
                  onClick={() => {
                    if (
                      confirmDiscardChanges()
                    ) {
                      setVariantEditor(
                        null
                      );
                    }
                  }}
                  disabled={
                    variantSaving
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
                    variantUploading ||
                    variantSaving
                  }
                >
                  {variantSaving
                    ? "Saving..."
                    : "Save Color"}
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
          <div
            className="editor-modal promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-editor-title"
          >
            <button
              className="icon-btn modal-close"
              onClick={() => {
                if (
                  confirmDiscardChanges()
                ) {
                  setPromotionEditor(
                    null
                  );
                }
              }}
              type="button"
              disabled={
                promotionSaving
              }
              aria-label="Close promotion editor"
            >
              <X />
            </button>

            <p className="kicker">
              {promotionEditor.id
                ? "EDIT SALE"
                : "NEW SALE"}
            </p>

            <h2 id="promotion-editor-title">
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

                                <option value="sold_out">
                                  Sold Out
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
                  onClick={() => {
                    if (
                      confirmDiscardChanges()
                    ) {
                      setPromotionEditor(
                        null
                      );
                    }
                  }}
                  disabled={
                    promotionSaving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    promotionSaving
                  }
                >
                  {promotionSaving
                    ? "Saving..."
                    : "Save Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
