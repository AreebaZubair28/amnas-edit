"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Instagram,
  MessageCircle,
  Link2,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import StorefrontImage from "@/components/StorefrontImage";
import { whatsAppChatUrl } from "@/lib/whatsapp";

import {
  Product,
  ProductVariant,
  STATUS_LABELS,
  STATUS_CLASS,
} from "@/types/product";

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
  id: string;
  promotion_id: string;
  rule_type: PromotionRuleType;
  status_value: string | null;
  category_id: string | null;
  brand_id: string | null;
  gender_value: Product["gender"] | null;
  product_id: string | null;
  created_at: string;
};

export type PromotionWithRules = Promotion & {
  rules: PromotionRule[];
};

export type SiteContactSettings = {
  instagram_url: string;
  whatsapp_number: string;
  tiktok_url: string;
};

type ProductReview = {
  id: string;
  product_id: string;
  rating: number;
  review_text: string;
  is_approved: boolean;
  created_at: string;
};

type AnalyticsEventType =
  | "product_view"
  | "whatsapp_click"
  | "instagram_click";

function formatInquiryPrice(
  price: number | null
): string | null {
  if (price === null) {
    return null;
  }

  return `Rs. ${price.toLocaleString()}`;
}

function makeWhatsApp(
  product: Product,
  siteWhatsappNumber: string,
  selectedVariant: ProductVariant | null,
  originalPrice: number | null,
  displayPrice: number | null,
  promotion: PromotionWithRules | null
): string | null {
  /*
   * Website Settings remains the global source of truth
   * for WhatsApp inquiries. The message includes enough
   * product context for the owner to immediately identify
   * what the customer is asking about.
   */
  const number =
    siteWhatsappNumber.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "";

  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(
      /\/+$/,
      ""
    ) || "";

  const browserOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const productBaseUrl =
    configuredSiteUrl || browserOrigin;

  const pageUrl =
    product.slug && productBaseUrl
      ? `${productBaseUrl}/products/${encodeURIComponent(
          product.slug
        )}`
      : typeof window !== "undefined"
        ? window.location.href
        : "";

  const displayPriceLabel =
    formatInquiryPrice(displayPrice);

  const hasDiscount =
    promotion &&
    originalPrice !== null &&
    displayPrice !== null &&
    displayPrice < originalPrice;

  const selectedColorSoldOut =
    selectedVariant?.is_available === false;

  const isSoldOut =
    product.status === "sold_out" ||
    selectedColorSoldOut;

  const textLines = [
    isSoldOut
      ? "Hi Amna's Edit! I'm interested in this product."
      : "Hi Amna's Edit! I'm interested in this product.",
    "",
    `Product: ${product.name}`,
    ...(selectedVariant
      ? [`Color: ${selectedVariant.color_name}`]
      : []),
    ...(displayPriceLabel
      ? [`${hasDiscount ? "Sale price" : "Price"}: ${displayPriceLabel}`]
      : []),
    ...(pageUrl ? ["", `Product link: ${pageUrl}`] : []),
    "",
    isSoldOut
      ? "Could you please confirm restock availability?"
      : "Could you please confirm availability?",
  ];

  const inquiryText = textLines.join("\n");

  const chatUrl = whatsAppChatUrl(number);
  if (chatUrl) {
    return `${chatUrl}?text=${encodeURIComponent(inquiryText)}`;
  }

  const productFallback =
    product.whatsapp_url?.trim() || "";

  return productFallback || null;
}

function calculateDiscountedPrice(
  price: number,
  promotion: Promotion
): number {
  if (
    promotion.discount_type ===
    "percentage"
  ) {
    const discount =
      price *
      (promotion.discount_value /
        100);

    return Math.max(
      0,
      price - discount
    );
  }

  return Math.max(
    0,
    price -
    promotion.discount_value
  );
}

function formatPromotionDiscount(
  promotion: Promotion
): string {
  if (
    promotion.discount_type ===
    "percentage"
  ) {
    return `${promotion.discount_value}% OFF`;
  }

  return `Rs. ${promotion.discount_value.toLocaleString()} OFF`;
}

function makeInstagramChatUrl(
  instagramUrl: string
): string | null {
  const value = instagramUrl.trim();

  if (!value) {
    return null;
  }

  if (value.includes("ig.me/")) {
    return value;
  }

  try {
    const parsed = new URL(
      value.startsWith("http")
        ? value
        : `https://instagram.com/${value.replace(/^@/, "")}`
    );

    const parts = parsed.pathname
      .split("/")
      .filter(Boolean);

    const username =
      parts.length > 0
        ? parts[0].replace(/^@/, "")
        : "";

    if (username) {
      return `https://ig.me/m/${username}`;
    }
  } catch {
    return null;
  }

  return null;
}

function getRecommendedProducts(
  currentProduct: Product,
  products: Product[]
): Product[] {
  return products
    .filter((product) => product.id !== currentProduct.id)
    .map((product) => {
      let score = 0;

      if (
        product.category_id &&
        currentProduct.category_id &&
        product.category_id === currentProduct.category_id
      ) {
        score += 5;
      }

      if (
        product.brand_id &&
        currentProduct.brand_id &&
        product.brand_id === currentProduct.brand_id
      ) {
        score += 4;
      }

      if (
        product.gender &&
        product.gender === currentProduct.gender
      ) {
        score += 2;
      }

      if (product.category === currentProduct.category) {
        score += 2;
      }

      if (product.brand && product.brand === currentProduct.brand) {
        score += 1;
      }

      return {
        product,
        score,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.product.name.localeCompare(b.product.name);
    })
    .slice(0, 4)
    .map(({ product }) => product);
}

async function recordAnalyticsEvent(
  productId: string,
  eventType: AnalyticsEventType
) {
  try {
    const response = await fetch(
      "/api/analytics",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          event_type: eventType,
        }),
        keepalive: true,
      }
    );

    if (!response.ok) {
      if (response.status !== 429) {
        console.error(
          "Analytics event could not be recorded. Status:",
          response.status
        );
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Unexpected analytics error:",
      error
    );
    return false;
  }
}

export default function ProductModal({
  product,
  promotion,
  siteContacts,
  allProducts,
  onOpenProduct,
  close,
  pageMode = false,
  onBackProduct,
}: {
  product: Product;
  promotion: PromotionWithRules | null;
  siteContacts: SiteContactSettings;
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  close: () => void;
  pageMode?: boolean;
  onBackProduct?: () => void;
}) {
  const [
    variants,
    setVariants,
  ] = useState<
    ProductVariant[]
  >([]);

  const [
    selectedVariant,
    setSelectedVariant,
  ] =
    useState<ProductVariant | null>(
      null
    );

  const [
    selectedGalleryImage,
    setSelectedGalleryImage,
  ] = useState<string | null>(null);

  const [
    loadingVariants,
    setLoadingVariants,
  ] = useState(true);

  const [
    variantLoadError,
    setVariantLoadError,
  ] = useState("");

  const [
    reviews,
    setReviews,
  ] = useState<ProductReview[]>([]);

  const [
    reviewName,
    setReviewName,
  ] = useState("");

  const [
    reviewRating,
    setReviewRating,
  ] = useState(5);

  const [
    reviewText,
    setReviewText,
  ] = useState("");

  const [
    reviewSubmitting,
    setReviewSubmitting,
  ] = useState(false);

  const [
    reviewMessage,
    setReviewMessage,
  ] = useState("");

  const [
    copyLinkMessage,
    setCopyLinkMessage,
  ] = useState("");

  const [
    reviewError,
    setReviewError,
  ] = useState("");

  const [
    reviewsLoadError,
    setReviewsLoadError,
  ] = useState("");

  const modalRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageMode) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusModal =
      window.requestAnimationFrame(() => {
        modalRef.current?.focus();
      });

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (
        event.key !== "Tab" ||
        !modalRef.current
      ) {
        return;
      }

      const focusable =
        Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (element) =>
            element.getAttribute(
              "aria-hidden"
            ) !== "true"
        );

      if (focusable.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last =
        focusable[
          focusable.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        focusModal
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
      document.body.style.overflow =
        previousOverflow;
      previousActiveElement?.focus();
    };
  }, [product.id, pageMode, close]);

  useEffect(() => {
    let active = true;

    async function loadVariants() {
      setLoadingVariants(true);
      setVariantLoadError("");

      const {
        data,
        error,
      } = await supabase()
        .from("product_variants")
        .select("*")
        .eq(
          "product_id",
          product.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (!active) {
        return;
      }

      if (error) {
        console.error("Failed to load product variants:", error);
        setVariants([]);
        setVariantLoadError(
          "Color options couldn't be loaded right now."
        );
      } else {
        const loaded =
          (data as ProductVariant[]) ||
          [];

        setVariants(loaded);

        /*
         * If this product has color variants, the detailed view
         * should always represent a real color rather than showing
         * the product-level cover image as an unnamed color.
         *
         * The first saved color becomes the default selection.
         * Products without color variants continue using their
         * normal product-level image and gallery.
         */
        setSelectedVariant(
          loaded.find(
            (variant) =>
              variant.is_available
          ) ||
            loaded[0] ||
            null
        );
      }

      setLoadingVariants(false);
    }

    loadVariants();

    return () => {
      active = false;
    };
  }, [product.id]);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      setReviewsLoadError("");

      const {
        data,
        error,
      } = await supabase()
        .from("public_product_reviews")
        .select(
          "id, product_id, rating, review_text, is_approved, created_at"
        )
        .eq("product_id", product.id)
        .eq("is_approved", true)
        .order("created_at", {
          ascending: false,
        });

      if (!active) {
        return;
      }

      if (error) {
        console.error("Failed to load product reviews:", error);
        setReviews([]);
        setReviewsLoadError(
          "Reviews couldn't be loaded right now."
        );
      } else {
        setReviews(
          (data as ProductReview[]) || []
        );
      }
    }

    loadReviews();

    return () => {
      active = false;
    };
  }, [product.id]);

  useEffect(() => {
    /*
     * Record a product view whenever the product modal is opened.
     *
     * Duplicate protection now lives on the server in /api/analytics.
     * That endpoint ignores another view for the same product from the
     * same fingerprint within the short duplicate window (30 seconds).
     *
     * This also safely handles React development-mode effect replays,
     * so browser sessionStorage deduplication is no longer needed.
     */
    void recordAnalyticsEvent(
      product.id,
      "product_view"
    );
  }, [product.id]);

  async function submitReview(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setReviewError("");
    setReviewMessage("");

    if (!reviewName.trim()) {
      setReviewError("Please enter your name.");
      return;
    }

    if (!reviewText.trim()) {
      setReviewError("Please write a review.");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating from 1 to 5.");
      return;
    }

    if (reviewText.trim().length < 5) {
      setReviewError(
        "Please write at least 5 characters in your review."
      );
      return;
    }

    setReviewSubmitting(true);

    try {
      const formData = new FormData(
        event.currentTarget
      );

      const response = await fetch(
        "/api/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            product_id: product.id,
            customer_name:
              reviewName.trim(),
            rating: reviewRating,
            review_text:
              reviewText.trim(),

            // Honeypot field. Real users never
            // interact with this input.
            website:
              formData.get(
                "website"
              ) || "",
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        if (
          response.status === 429
        ) {
          setReviewError(
            result?.message ||
              "You've submitted reviews too quickly. Please wait a little before trying again."
          );
        } else {
          setReviewError(
            result?.message ||
              "Your review couldn't be submitted right now. Please try again."
          );
        }

        return;
      }

      setReviewName("");
      setReviewRating(5);
      setReviewText("");
      setReviewMessage(
        "Thank you! Your review has been submitted and will appear after approval."
      );
    } catch (error) {
      console.error(
        "Unexpected review submission error:",
        error
      );
      setReviewError(
        "Your review couldn't be submitted right now. Please try again."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  const reviewAverage =
    reviews.length > 0
      ? reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      ) / reviews.length
      : 0;

  const galleryImages = Array.from(
    new Set(
      [
        selectedVariant?.image_url ||
          product.image_url,
        ...(
          selectedVariant
            ? selectedVariant.gallery || []
            : product.gallery || []
        ),
      ].filter(
        (image): image is string =>
          !!image?.trim()
      )
    )
  );

  const displayImage =
    selectedGalleryImage &&
    galleryImages.includes(
      selectedGalleryImage
    )
      ? selectedGalleryImage
      : galleryImages[0] || null;

  const originalPrice =
    selectedVariant?.price ??
    product.price;

  const displayPrice =
    promotion &&
      originalPrice !==
      null
      ? calculateDiscountedPrice(
        originalPrice,
        promotion
      )
      : originalPrice;

  const displayDetails =
    selectedVariant?.details ||
    product.details ||
    "";

  const selectedVariantSoldOut =
    selectedVariant?.is_available === false;

  const currentSelectionSoldOut =
    product.status === "sold_out" ||
    selectedVariantSoldOut;

  const displayedStatus =
    currentSelectionSoldOut
      ? "sold_out"
      : "in_stock";

  const wa =
    makeWhatsApp(
      product,
      siteContacts.whatsapp_number,
      selectedVariant,
      originalPrice,
      displayPrice,
      promotion
    );

  /*
   * Website Settings is the global Instagram
   * destination. Product-specific Instagram URLs
   * remain a fallback only when no global URL exists.
   */
  const instagramDestination =
    siteContacts.instagram_url.trim() ||
    process.env
      .NEXT_PUBLIC_INSTAGRAM_URL ||
    product.instagram_url ||
    "";

  const ig =
    makeInstagramChatUrl(
      instagramDestination
    );

  const recommendedProducts =
    getRecommendedProducts(
      product,
      allProducts
    );

  const configuredProductSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(
      /\/+$/,
      ""
    ) || "";

  const productPageBaseUrl =
    configuredProductSiteUrl ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "");

  const productPageUrl =
    product.slug && productPageBaseUrl
      ? `${productPageBaseUrl}/products/${encodeURIComponent(
          product.slug
        )}`
      : "";

  async function copyProductLink() {
    if (!productPageUrl) {
      setCopyLinkMessage(
        "Product link is not available right now."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(productPageUrl);
      setCopyLinkMessage("Product link copied.");

      window.setTimeout(() => {
        setCopyLinkMessage("");
      }, 2500);
    } catch (error) {
      console.error(
        "Could not copy product link:",
        error
      );

      setCopyLinkMessage(
        "Could not copy the link. Please try again."
      );
    }
  }

  const ProductTitleTag =
    pageMode ? "h1" : "h2";

  return (
    <div
      className={
        pageMode
          ? "product-page-shell"
          : "modal-backdrop"
      }
      onClick={
        pageMode ? undefined : close
      }
    >
      <div
        ref={modalRef}
        className={`product-modal${
          pageMode
            ? " product-page-modal"
            : ""
        }`}
        role={
          pageMode
            ? undefined
            : "dialog"
        }
        aria-modal={
          pageMode
            ? undefined
            : true
        }
        aria-labelledby={`product-modal-title-${product.id}`}
        tabIndex={
          pageMode ? undefined : -1
        }
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {pageMode ? (
          <a
            className="product-page-back"
            href="/collection"
            aria-label="Back to collection"
          >
            ← Back to collection
          </a>
        ) : (
          <button
            className="icon-btn modal-close"
            onClick={close}
            type="button"
            aria-label="Close product details"
          >
            <X size={20} />
          </button>
        )}

        <div className="modal-media">
          {displayImage ? (
            <>
              <div className="modal-main-image">
                <StorefrontImage
                  src={displayImage}
                  alt={
                    selectedVariant
                      ? `${product.name} - ${selectedVariant.color_name}`
                      : product.name
                  }
                  width={1200}
                  height={1500}
                  sizes="(max-width: 900px) 100vw, 50vw"
                  priority
                />
              </div>

              {galleryImages.length > 1 && (
                <div
                  className="product-gallery-thumbnails"
                  aria-label={`Images for ${
                    selectedVariant
                      ? `${product.name}, ${selectedVariant.color_name}`
                      : product.name
                  }`}
                >
                  {galleryImages.map(
                    (image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        className={`product-gallery-thumbnail${
                          displayImage === image
                            ? " active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedGalleryImage(
                            image
                          )
                        }
                        aria-label={`Show image ${
                          index + 1
                        } of ${
                          galleryImages.length
                        }`}
                        aria-pressed={
                          displayImage === image
                        }
                      >
                        <StorefrontImage
                          src={image}
                          alt=""
                          width={148}
                          height={176}
                          sizes="74px"
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="modal-main-image">
              <div className="image-placeholder large">
                <span>
                  Amna&apos;s Edit
                </span>
              </div>
            </div>
          )}


        </div>

        <div className="modal-details">
        {onBackProduct && (
          <button type="button" className="product-history-back" onClick={onBackProduct}>
            <ArrowLeft size={16} aria-hidden="true" /> Previous product
          </button>
        )}
          <span
            className={`status-badge ${STATUS_CLASS[displayedStatus]}`}
          >
            {
              STATUS_LABELS[
                displayedStatus
              ]
            }
          </span>

          {promotion && (
            <span
              style={{
                display:
                  "inline-block",
                width:
                  "fit-content",
                marginTop:
                  10,
                background:
                  "#f8e3ea",
                color:
                  "#99536b",
                fontSize: 9,
                letterSpacing:
                  "1px",
                textTransform:
                  "uppercase",
                padding:
                  "7px 9px",
                borderRadius:
                  20,
                fontWeight: 700,
              }}
            >
              {formatPromotionDiscount(
                promotion
              )}
            </span>
          )}

          <div className="eyebrow">
            {product.brand}
          </div>

          <ProductTitleTag
            id={`product-modal-title-${product.id}`}
          >
            {product.name}
          </ProductTitleTag>

          {currentSelectionSoldOut && (
            <p className="sold-out-note">
              {selectedVariantSoldOut &&
              product.status !== "sold_out"
                ? `${selectedVariant?.color_name} is currently sold out. You can still ask us about restock availability.`
                : "This piece is currently sold out. You can still ask us about restock availability."}
            </p>
          )}

          {originalPrice !==
            null && (
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 10,
                  flexWrap:
                    "wrap",
                  marginBottom:
                    8,
                }}
              >
                {promotion &&
                  displayPrice !==
                  null ? (
                  <>
                    <span
                      style={{
                        fontSize:
                          14,
                        color:
                          "var(--muted)",
                        textDecoration:
                          "line-through",
                      }}
                    >
                      Rs.{" "}
                      {originalPrice.toLocaleString()}
                    </span>

                    <span
                      className="modal-price"
                      style={{
                        margin:
                          0,
                        color:
                          "var(--pink-deep)",
                        fontWeight:
                          700,
                      }}
                    >
                      Rs.{" "}
                      {Math.round(
                        displayPrice
                      ).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <div className="modal-price">
                    Rs.{" "}
                    {originalPrice.toLocaleString()}
                  </div>
                )}
              </div>
            )}

          <div className="product-description-summary">
            {product.description && product.description.length > 190 ? (
              <details className="product-detail-disclosure">
                <summary>Description <span className="product-disclosure-hint">Read more</span></summary>
                <p className="modal-description">{product.description}</p>
              </details>
            ) : (
              <p className="modal-description">
                {product.description || "A carefully selected piece from Amna's Edit."}
              </p>
            )}
          </div>

          {variantLoadError && (
            <div className="error" role="alert">
              {variantLoadError}
            </div>
          )}

          {!loadingVariants &&
            variants.length >
            0 && (
              <div
                className="color-selector"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <div className="color-selector-header">
                  <span>
                    Color
                  </span>

                  <strong>
                    {
                      selectedVariant?.color_name
                    }
                  </strong>
                </div>

                <div className="color-options">
                  {variants.map(
                    (
                      variant
                    ) => (
                      <button
                        type="button"
                        key={
                          variant.id
                        }
                        className={`color-option ${selectedVariant?.id ===
                          variant.id
                          ? "active"
                          : ""
                          }`}
                        onClick={() =>
                          setSelectedVariant(
                            variant
                          )
                        }
                        style={
                          !variant.is_available
                            ? {
                                opacity: 0.5,
                                filter:
                                  "grayscale(0.55)",
                              }
                            : undefined
                        }
                        title={`${variant.color_name}${
                          variant.is_available
                            ? ""
                            : " — Sold Out"
                        }`}
                        aria-label={`Select ${variant.color_name}${
                          variant.is_available
                            ? ""
                            : ", sold out"
                        }`}
                        aria-pressed={
                          selectedVariant?.id ===
                          variant.id
                        }
                      >
                        {variant.image_url ? (
                          <StorefrontImage
                            src={variant.image_url}
                            alt={variant.color_name}
                            width={120}
                            height={120}
                            sizes="60px"
                          />
                        ) : (
                          <span>
                            {
                              variant.color_name
                            }
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

          <div className="modal-meta">
            <span>
              {product.category}
            </span>

            <span>
              {product.gender}
            </span>
          </div>

          {product.slug && (
            <div className="product-share-link-wrap">
              <button
                type="button"
                className="product-permalink"
                onClick={copyProductLink}
                aria-label={`Copy link for ${product.name}`}
              >
                {copyLinkMessage === "Product link copied." ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                <span>{copyLinkMessage === "Product link copied." ? "Link copied" : "Copy product link"}</span>
              </button>

              {copyLinkMessage && (
                <span
                  className="product-copy-feedback"
                  role="status"
                  aria-live="polite"
                >
                  {copyLinkMessage}
                </span>
              )}
            </div>
          )}

          {(wa || ig) ? (
            <div className="modal-actions">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="button primary"
                  onClick={() => {
                    void recordAnalyticsEvent(
                      product.id,
                      "whatsapp_click"
                    );
                  }}
                >
                  <MessageCircle size={17} />

                  {currentSelectionSoldOut
                    ? "Ask about restock"
                    : "Inquire on WhatsApp"}
                </a>
              )}

              {ig && (
                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  onClick={() => {
                    void recordAnalyticsEvent(
                      product.id,
                      "instagram_click"
                    );
                  }}
                >
                  <Instagram size={17} />
                  DM on Instagram
                </a>
              )}
            </div>
          ) : (
            <p className="contact-unavailable-note" role="status">
              Direct inquiry is temporarily unavailable. Please check back soon.
            </p>
          )}

          <div className="product-secondary-details">
          {displayDetails && (
            <details className="product-detail-disclosure">
              <summary>Product details</summary>

              <p>
                {displayDetails}
              </p>
            </details>
          )}

          {product.delivery_return && (
            <details className="product-detail-disclosure">
              <summary>Delivery &amp; returns</summary>

              <p>
                {
                  product.delivery_return
                }
              </p>
            </details>
          )}

          </div>

          <section className="product-reviews" aria-labelledby={`product-reviews-title-${product.id}`}>
            <div className="product-reviews-heading">
              <div>
                <p className="kicker">YOUR EXPERIENCE MATTERS</p>
                <h3 id={`product-reviews-title-${product.id}`}>Customer reviews</h3>
              </div>
              {reviews.length > 0 && (
                <div className="product-reviews-summary" aria-label={`${reviewAverage.toFixed(1)} out of 5 stars from ${reviews.length} reviews`}>
                  <strong>{reviewAverage.toFixed(1)} <span>/ 5</span></strong>
                  <span className="review-stars" aria-hidden="true">{"★".repeat(Math.round(reviewAverage))}{"☆".repeat(5 - Math.round(reviewAverage))}</span>
                  <small>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</small>
                </div>
              )}
            </div>

            {reviewsLoadError ? (
              <div className="error" role="alert">{reviewsLoadError}</div>
            ) : reviews.length > 0 ? (
              <div className="product-reviews-list">
                {reviews.map((review) => (
                  <article key={review.id} className="product-review-card">
                    <div className="product-review-card-header">
                      <span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                      <time dateTime={review.created_at}>
                        {new Date(review.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                      </time>
                    </div>
                    <p>{review.review_text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="product-review-empty">
                <span className="review-stars" aria-hidden="true">☆☆☆☆☆</span>
                <strong>No reviews yet</strong>
                <p>Be the first to share your experience with this piece.</p>
              </div>
            )}

            <form className="product-review-form" onSubmit={submitReview}>
              <div className="product-review-form-heading">
                <h4>Share your experience</h4>
                <p>Your name stays private. Reviews appear after approval.</p>
              </div>
              <div
                aria-hidden="true"
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
              >
                <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <label className="product-review-field">
                Your name <span className="product-review-field-hint">(not shown publicly)</span>
                <input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Enter your name"
                  minLength={1}
                  maxLength={80}
                  autoComplete="name"
                  required
                />
              </label>
              <fieldset className="product-review-rating">
                <legend>Your rating</legend>
                <div className="product-review-rating-options">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label key={rating} className="product-review-rating-option">
                      <input
                        type="radio"
                        name="rating"
                        value={rating}
                        checked={reviewRating === rating}
                        onChange={() => setReviewRating(rating)}
                        aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
                      />
                      <span aria-hidden="true">{"★".repeat(rating)}</span>
                    </label>
                  ))}
                </div>
                <span className="product-review-rating-caption">
                  {(["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const)[reviewRating]}
                </span>
              </fieldset>
              <label className="product-review-field">
                Your review
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you love about this piece?"
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </label>
              {reviewError && <div className="error" role="alert">{reviewError}</div>}
              {reviewMessage && <div className="product-review-success" role="status" aria-live="polite">{reviewMessage}</div>}
              <button type="submit" className="button primary product-review-submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </section>


        </div>

          {recommendedProducts.length > 0 && (
            <section className="product-recommendations" aria-labelledby={`recommendations-title-${product.id}`}>
              <p className="kicker">YOU MAY ALSO LIKE</p>
              <h4 id={`recommendations-title-${product.id}`}>Pieces worth exploring</h4>
              <div className="product-recommendations-grid">
                {recommendedProducts.map((recommendedProduct) => (
                  <button
                    className="product-recommendation-card"
                    type="button"
                    key={recommendedProduct.id}
                    onClick={() => onOpenProduct(recommendedProduct)}
                    aria-label={`View ${recommendedProduct.name}`}
                  >
                    <div className="product-recommendation-image">
                      {recommendedProduct.image_url ? (
                        <StorefrontImage
                          src={recommendedProduct.image_url}
                          alt={recommendedProduct.name}
                          width={600}
                          height={672}
                          sizes="(max-width: 600px) 42vw, 220px"
                        />
                      ) : (
                        <div className="image-placeholder"><span>Amna&apos;s Edit</span></div>
                      )}
                    </div>
                    <div className="product-recommendation-info">
                      <span className="eyebrow">{recommendedProduct.brand || "Curated Edit"}</span>
                      <span className="product-recommendation-name">{recommendedProduct.name}</span>
                      {recommendedProduct.price !== null && (
                        <span className="product-recommendation-price">Rs. {recommendedProduct.price.toLocaleString()}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
      </div>
    </div>
  );
}
