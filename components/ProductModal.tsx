"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Instagram,
  MessageCircle,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import StorefrontImage from "@/components/StorefrontImage";

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

  const imageUrl =
    selectedVariant?.image_url ||
    product.image_url ||
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

  const originalPriceLabel =
    formatInquiryPrice(originalPrice);

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
      ? "Hi Amna's Edit! I'd like to know if this item or selected color will be restocked:"
      : "Hi Amna's Edit! I'm interested in this item:",
    "",
    `Product: ${product.name}`,
    ...(product.brand
      ? [`Brand: ${product.brand}`]
      : []),
    `Status: ${STATUS_LABELS[product.status]}`,
    ...(selectedVariant
      ? [
          `Color: ${selectedVariant.color_name}`,
          `Color availability: ${
            selectedVariant.is_available
              ? "Available"
              : "Sold Out"
          }`,
        ]
      : []),
    ...(displayPriceLabel
      ? [
          `Price: ${displayPriceLabel}${
            hasDiscount && originalPriceLabel
              ? ` (was ${originalPriceLabel})`
              : ""
          }`,
        ]
      : []),
    ...(hasDiscount && promotion
      ? [`Promotion: ${promotion.name}`]
      : []),
    ...(pageUrl
      ? [`Page: ${pageUrl}`]
      : []),
    ...(imageUrl
      ? [`Product image: ${imageUrl}`]
      : []),
    "",
    "Could you please confirm availability and ordering details?",
  ];

  const inquiryText = textLines.join("\n");

  if (number) {
    return `https://wa.me/${number.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(
      inquiryText
    )}`;
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
}: {
  product: Product;
  promotion: PromotionWithRules | null;
  siteContacts: SiteContactSettings;
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  close: () => void;
  pageMode?: boolean;
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
                    18,
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

          <p className="modal-description">
            {product.description ||
              "A carefully selected piece from Amna's Edit."}
          </p>

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

          {displayDetails && (
            <div className="modal-info-block">
              <h4>
                Details
              </h4>

              <p>
                {displayDetails}
              </p>
            </div>
          )}

          {product.delivery_return && (
            <div className="modal-info-block">
              <h4>
                Delivery & Returns
              </h4>

              <p>
                {
                  product.delivery_return
                }
              </p>
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

          {!pageMode && product.slug && (
            <div className="product-share-link-wrap">
              <button
                type="button"
                className="product-permalink"
                onClick={copyProductLink}
                aria-label={`Copy link for ${product.name}`}
              >
                Copy product link
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

          <div
            className="modal-info-block"
            style={{ marginTop: 22 }}
          >
            <h4>
              Customer Reviews
            </h4>

            {reviewsLoadError ? (
              <div className="error" role="alert">
                {reviewsLoadError}
              </div>
            ) : reviews.length > 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <strong
                    style={{
                      fontSize: 16,
                      color: "var(--pink-deep)",
                    }}
                  >
                    {"★".repeat(Math.round(reviewAverage))}
                  </strong>

                  <span
                    style={{
                      color: "var(--ink)",
                      fontSize: 12,
                    }}
                  >
                    {reviewAverage.toFixed(1)} / 5
                  </span>

                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 11,
                    }}
                  >
                    ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        padding: "12px 0",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--pink-deep)",
                            fontSize: 12,
                            letterSpacing: "1px",
                          }}
                        >
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>

                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: 10,
                          }}
                        >
                          Verified review
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "var(--muted)",
                          fontSize: 12,
                          lineHeight: 1.7,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {review.review_text}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p
                style={{
                  margin: "0 0 16px",
                  color: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                No reviews yet. Be the first to share your experience.
              </p>
            )}

            <form
              onSubmit={submitReview}
              style={{
                display: "grid",
                gap: 10,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                }}
              >
                <label>
                  Website
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  color: "var(--muted)",
                  fontSize: 11,
                }}
              >
                Your name (kept private)

                <input
                  value={reviewName}
                  onChange={(e) =>
                    setReviewName(e.target.value)
                  }
                  placeholder="Your name"
                  minLength={1}
                  maxLength={80}
                  autoComplete="name"
                  required
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  color: "var(--muted)",
                  fontSize: 11,
                }}
              >
                Rating

                <select
                  value={reviewRating}
                  onChange={(e) =>
                    setReviewRating(Number(e.target.value))
                  }
                >
                  <option value={5}>5 — Excellent</option>
                  <option value={4}>4 — Very good</option>
                  <option value={3}>3 — Good</option>
                  <option value={2}>2 — Fair</option>
                  <option value={1}>1 — Poor</option>
                </select>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 6,
                  color: "var(--muted)",
                  fontSize: 11,
                }}
              >
                Your review

                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) =>
                    setReviewText(e.target.value)
                  }
                  placeholder="Share your experience with this piece..."
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </label>

              {reviewError && (
                <div
                  className="error"
                  role="alert"
                >
                  {reviewError}
                </div>
              )}

              {reviewMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    background: "#edf7ef",
                    color: "#47704d",
                    padding: "10px 12px",
                    borderRadius: 5,
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  {reviewMessage}
                </div>
              )}

              <button
                type="submit"
                className="button secondary"
                disabled={reviewSubmitting}
              >
                {reviewSubmitting
                  ? "Submitting..."
                  : "Submit Review"}
              </button>
            </form>
          </div>

          {recommendedProducts.length > 0 && (
            <div
              style={{
                marginTop: 30,
                paddingTop: 22,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  marginBottom: 14,
                }}
              >
                <p
                  className="kicker"
                  style={{ marginBottom: 6 }}
                >
                  YOU MAY ALSO LIKE
                </p>
                <h4
                  style={{
                    margin: 0,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 22,
                    fontWeight: 400,
                  }}
                >
                  Pieces worth exploring
                </h4>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {recommendedProducts.map((recommendedProduct) => (
                  <button
                    type="button"
                    key={recommendedProduct.id}
                    onClick={() =>
                      onOpenProduct(recommendedProduct)
                    }
                    style={{
                      border: "1px solid var(--line)",
                      background: "#fff",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "1 / 1.12",
                        background: "#f7edf0",
                        overflow: "hidden",
                      }}
                    >
                      {recommendedProduct.image_url ? (
                        <StorefrontImage
                          src={recommendedProduct.image_url}
                          alt={recommendedProduct.name}
                          width={600}
                          height={672}
                          sizes="(max-width: 700px) 44vw, 260px"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="image-placeholder">
                          <span>Amna&apos;s Edit</span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "10px 10px 12px",
                      }}
                    >
                      <div className="eyebrow">
                        {recommendedProduct.brand || "Curated Edit"}
                      </div>
                      <div
                        style={{
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: 15,
                          color: "var(--ink)",
                          lineHeight: 1.25,
                        }}
                      >
                        {recommendedProduct.name}
                      </div>
                      {recommendedProduct.price !== null && (
                        <div
                          style={{
                            marginTop: 6,
                            color: "var(--muted)",
                            fontSize: 11,
                          }}
                        >
                          Rs. {recommendedProduct.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
