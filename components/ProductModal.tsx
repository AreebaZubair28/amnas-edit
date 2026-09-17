"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Instagram,
  MessageCircle,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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

type PromotionWithRules = Promotion & {
  rules: PromotionRule[];
};

type SiteContactSettings = {
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

function makeWhatsApp(
  product: Product,
  siteWhatsappNumber: string,
  selectedVariant: ProductVariant | null
) {
  /*
   * The Website Settings WhatsApp number is the
   * global source of truth for customer inquiries.
   * A product-specific WhatsApp URL is only used
   * as a fallback when no global number is configured.
   *
   * When a color is selected, the message also includes
   * that color and the image URL so the dealer can quickly
   * identify the exact article being discussed.
   */
  const number =
    siteWhatsappNumber.trim() ||
    process.env
      .NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "";

  const imageUrl =
    selectedVariant?.image_url ||
    product.image_url ||
    "";

  const textLines = [
    `Hi! I'm interested in ${product.name}${product.brand
      ? ` by ${product.brand}`
      : ""
    }.`,

    ...(selectedVariant
      ? [`Color: ${selectedVariant.color_name}`]
      : []),

    "Is it available?",

    ...(imageUrl
      ? [`Product image: ${imageUrl}`]
      : []),
  ];

  const text = textLines.join("\n");

  if (number) {
    return `https://wa.me/${number.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(
      text
    )}`;
  }

  return (
    product.whatsapp_url ||
    "#"
  );
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
): string {
  const value = instagramUrl.trim();

  if (!value) {
    return "#";
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
    return "#";
  }

  return "#";
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

export default function ProductModal({
  product,
  promotion,
  siteContacts,
  allProducts,
  onOpenProduct,
  close,
}: {
  product: Product;
  promotion: PromotionWithRules | null;
  siteContacts: SiteContactSettings;
  allProducts: Product[];
  onOpenProduct: (product: Product) => void;
  close: () => void;
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
    loadingVariants,
    setLoadingVariants,
  ] = useState(true);

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
    reviewError,
    setReviewError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVariants() {
      setLoadingVariants(
        true
      );

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

      if (!error) {
        const loaded =
          (data as ProductVariant[]) ||
          [];

        setVariants(
          loaded
        );

        /*
         * Keep the main product selected when the modal opens.
         * A customer must explicitly choose a color before the
         * variant image, price, and color-specific details appear.
         */
        setSelectedVariant(null);
      }

      setLoadingVariants(
        false
      );
    }

    loadVariants();

    return () => {
      active = false;
    };
  }, [product.id]);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      const {
        data,
        error,
      } = await supabase()
        .from("product_reviews")
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

      if (!error) {
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

    setReviewSubmitting(true);

    const { error } = await supabase()
      .from("product_reviews")
      .insert({
        product_id: product.id,
        customer_name: reviewName.trim(),
        rating: reviewRating,
        review_text: reviewText.trim(),
        is_approved: false,
      });

    if (error) {
      setReviewError(error.message);
      setReviewSubmitting(false);
      return;
    }

    setReviewName("");
    setReviewRating(5);
    setReviewText("");
    setReviewMessage(
      "Thank you! Your review has been submitted and will appear after approval."
    );
    setReviewSubmitting(false);
  }

  const reviewAverage =
    reviews.length > 0
      ? reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      ) / reviews.length
      : 0;

  const displayImage =
    selectedVariant?.image_url ||
    product.image_url;

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

  const wa =
    makeWhatsApp(
      product,
      siteContacts.whatsapp_number,
      selectedVariant
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

  return (
    <div
      className="modal-backdrop"
      onClick={close}
    >
      <div
        className="product-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          className="icon-btn modal-close"
          onClick={close}
          type="button"
        >
          <X size={20} />
        </button>

        <div className="modal-media">
          {displayImage ? (
            <div className="modal-main-image">
              <img
                src={
                  displayImage
                }
                alt={
                  selectedVariant
                    ? `${product.name} - ${selectedVariant.color_name}`
                    : product.name
                }
              />
            </div>
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
            className={`status-badge ${STATUS_CLASS[product.status]}`}
          >
            {
              STATUS_LABELS[
              product.status
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

          <h2>
            {product.name}
          </h2>

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
                        title={
                          variant.color_name
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

          <div
            className="modal-info-block"
            style={{ marginTop: 22 }}
          >
            <h4>
              Customer Reviews
            </h4>

            {reviews.length > 0 ? (
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
                  maxLength={80}
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
                  maxLength={1000}
                  required
                />
              </label>

              {reviewError && (
                <div className="error">
                  {reviewError}
                </div>
              )}

              {reviewMessage && (
                <div
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

          <div className="modal-actions">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="button primary"
            >
              <MessageCircle
                size={17}
              />

              Inquire on WhatsApp
            </a>

            <a
              href={ig}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
            >
              <Instagram
                size={17}
              />

              DM on Instagram
            </a>
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
                        <img
                          src={recommendedProduct.image_url}
                          alt={recommendedProduct.name}
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
