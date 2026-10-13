"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  SlidersHorizontal,
  Instagram,
  MessageCircle,
  Music2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import ProductModal from "@/components/ProductModal";
import StorefrontImage from "@/components/StorefrontImage";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { usePromotionClock } from "@/hooks/usePromotionClock";

import {
  Product,
  STATUS_LABELS,
  STATUS_CLASS,
  Gender,
} from "@/types/product";

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
  id: string;
  promotion_id: string;
  rule_type: PromotionRuleType;
  status_value: string | null;
  category_id: string | null;
  brand_id: string | null;
  gender_value: Gender | null;
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


/* =========================================================
   SEARCH HELPERS
========================================================= */

function normalizeSearchText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/[^a-z0-9]/g, "");
}

function searchWords(
  value: string
): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeWord(
  word: string
): string {
  const value = word.toLowerCase();

  if (
    value.endsWith("ies") &&
    value.length > 4
  ) {
    return (
      value.slice(0, -3) +
      "y"
    );
  }

  if (
    value.endsWith("es") &&
    value.length > 4 &&
    !value.endsWith("ses")
  ) {
    return value.slice(0, -2);
  }

  if (
    value.endsWith("s") &&
    value.length > 3
  ) {
    return value.slice(0, -1);
  }

  return value;
}

function levenshtein(
  a: string,
  b: string
): number {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const previous =
    Array.from(
      {
        length:
          b.length + 1,
      },
      (_, index) => index
    );

  for (
    let i = 1;
    i <= a.length;
    i++
  ) {
    const current = [i];

    for (
      let j = 1;
      j <= b.length;
      j++
    ) {
      const insert =
        current[j - 1] + 1;

      const remove =
        previous[j] + 1;

      const replace =
        previous[j - 1] +
        (a[i - 1] === b[j - 1]
          ? 0
          : 1);

      current[j] = Math.min(
        insert,
        remove,
        replace
      );
    }

    for (
      let j = 0;
      j < current.length;
      j++
    ) {
      previous[j] =
        current[j];
    }
  }

  return previous[b.length];
}

function fuzzyWordMatch(
  searchWord: string,
  productWord: string
): boolean {
  const search =
    normalizeWord(searchWord);

  const product =
    normalizeWord(productWord);

  if (!search || !product) {
    return false;
  }

  if (search === product) {
    return true;
  }

  if (
    product.includes(search) ||
    search.includes(product)
  ) {
    return true;
  }

  if (search.length <= 2) {
    return false;
  }

  const distance =
    levenshtein(
      search,
      product
    );

  const allowedDistance =
    search.length <= 4
      ? 1
      : 2;

  return (
    distance <=
    allowedDistance
  );
}

function abbreviationMatch(
  query: string,
  words: string[]
): boolean {
  const normalizedQuery =
    normalizeSearchText(query);

  if (
    normalizedQuery.length <
    2 ||
    words.length === 0
  ) {
    return false;
  }

  const initials = words
    .map(
      (word) =>
        normalizeWord(word).charAt(
          0
        )
    )
    .join("");

  if (
    initials.includes(
      normalizedQuery
    )
  ) {
    return true;
  }

  let queryIndex = 0;

  for (
    const initial of initials
  ) {
    if (
      initial ===
      normalizedQuery[
      queryIndex
      ]
    ) {
      queryIndex++;

      if (
        queryIndex ===
        normalizedQuery.length
      ) {
        return true;
      }
    }
  }

  return false;
}

function productMatchesSearch(
  product: Product,
  rawQuery: string
): boolean {
  const query =
    rawQuery.trim();

  if (!query) {
    return true;
  }

  const searchableText = [
    product.name,
    product.brand,
    product.category,
  ]
    .filter(Boolean)
    .join(" ");

  const queryNormalized =
    normalizeSearchText(query);

  const productNormalized =
    normalizeSearchText(
      searchableText
    );

  if (
    productNormalized.includes(
      queryNormalized
    )
  ) {
    return true;
  }

  const queryWords =
    searchWords(query);

  const productWords =
    searchWords(
      searchableText
    );

  if (
    abbreviationMatch(
      query,
      productWords
    )
  ) {
    return true;
  }

  if (
    queryWords.length > 1
  ) {
    const everyQueryWordMatches =
      queryWords.every(
        (queryWord) =>
          productWords.some(
            (productWord) =>
              fuzzyWordMatch(
                queryWord,
                productWord
              )
          )
      );

    if (
      everyQueryWordMatches
    ) {
      return true;
    }
  }

  if (
    queryWords.length === 1
  ) {
    const queryWord =
      queryWords[0];

    return productWords.some(
      (productWord) =>
        fuzzyWordMatch(
          queryWord,
          productWord
        )
    );
  }

  if (
    queryNormalized.length >= 3
  ) {
    return productWords.some(
      (productWord) => {
        const normalizedProductWord =
          normalizeWord(
            productWord
          );

        return (
          normalizedProductWord.includes(
            queryNormalized
          ) ||
          queryNormalized.includes(
            normalizedProductWord
          )
        );
      }
    );
  }

  return false;
}

/* =========================================================
   PROMOTION HELPERS
========================================================= */

function promotionRuleMatchesProduct(
  rule: PromotionRule,
  product: Product
): boolean {
  switch (
  rule.rule_type
  ) {
    case "all":
      return true;

    case "status":
      return (
        rule.status_value ===
        product.status
      );

    case "category":
      return (
        rule.category_id ===
        product.category_id
      );

    case "brand":
      return (
        rule.brand_id ===
        product.brand_id
      );

    case "gender":
      return (
        rule.gender_value ===
        product.gender
      );

    case "product":
      return (
        rule.product_id ===
        product.id
      );

    default:
      return false;
  }
}

function promotionMatchesProduct(
  promotion: PromotionWithRules,
  product: Product
): boolean {
  /*
   * A promotion matches only when ALL of its
   * rules are satisfied.
   *
   * Example:
   * Status = In Stock
   * AND
   * Category = Bags
   *
   * Only In Stock Bags receive the discount.
   */
  if (promotion.rules.length === 0) {
    return false;
  }

  return promotion.rules.every(
    (rule) =>
      promotionRuleMatchesProduct(
        rule,
        product
      )
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

function getDiscountAmount(
  price: number,
  promotion: Promotion
): number {
  return Math.max(
    0,
    price -
    calculateDiscountedPrice(
      price,
      promotion
    )
  );
}

/*
 * A promotion is "live" only for the exact window
 * between its start_at and end_at, and only while
 * is_active is true.
 *
 * `now` is passed in (rather than read via Date.now()
 * here) so callers can drive it from a ticking clock
 * and get automatic activation/deactivation without a
 * page refresh.
 */
function isPromotionActive(
  promotion: Promotion,
  now: number
): boolean {
  return (
    promotion.is_active &&
    now >=
    new Date(
      promotion.start_at
    ).getTime() &&
    now <=
    new Date(
      promotion.end_at
    ).getTime()
  );
}

/*
 * If more than one active promotion matches the
 * same product, use the promotion that gives the
 * customer the greatest actual saving.
 */
function getBestPromotion(
  product: Product,
  promotions: PromotionWithRules[]
): PromotionWithRules | null {
  const matching =
    promotions.filter(
      (promotion) =>
        promotionMatchesProduct(
          promotion,
          product
        )
    );

  if (
    matching.length === 0
  ) {
    return null;
  }

  if (
    product.price === null
  ) {
    return matching[0];
  }

  return matching.reduce(
    (
      best,
      current
    ) => {
      const bestSaving =
        getDiscountAmount(
          product.price as number,
          best
        );

      const currentSaving =
        getDiscountAmount(
          product.price as number,
          current
        );

      return currentSaving >
        bestSaving
        ? current
        : best;
    }
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

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  promotion,
  onOpen,
}: {
  product: Product;
  promotion: PromotionWithRules | null;
  onOpen: (
    p: Product
  ) => void;
}) {
  const discountedPrice =
    promotion &&
      product.price !== null
      ? calculateDiscountedPrice(
        product.price,
        promotion
      )
      : null;

  return (
    <article
      className={`product-card${
        product.status === "sold_out"
          ? " product-card-sold-out"
          : ""
      }`}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}`}
      onClick={() =>
        onOpen(product)
      }
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onOpen(product);
        }
      }}
    >
      <div className="product-image-wrap">
        {product.image_url ? (
          <StorefrontImage
            src={product.image_url}
            alt={product.name}
            width={900}
            height={1125}
            className="product-image"
            sizes="(max-width: 650px) 92vw, (max-width: 1000px) 46vw, 30vw"
          />
        ) : (
          <div className="image-placeholder">
            <span>
              Amna&apos;s Edit
            </span>
          </div>
        )}

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
              position:
                "absolute",
              top: 12,
              right: 12,
              background:
                "#292226",
              color: "#fff",
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
      </div>

      <div className="product-info">
        <div className="eyebrow">
          {product.brand ||
            "Curated Edit"}
        </div>

        <h3>
          {product.name}
        </h3>

        {product.price !==
          null && (
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 8,
                flexWrap:
                  "wrap",
              }}
            >
              {promotion &&
                discountedPrice !==
                null ? (
                <>
                  <span
                    className="price"
                    style={{
                      textDecoration:
                        "line-through",
                      color:
                        "var(--muted)",
                    }}
                  >
                    Rs.{" "}
                    {product.price.toLocaleString()}
                  </span>

                  <span
                    className="price"
                    style={{
                      color:
                        "var(--pink-deep)",
                      fontWeight: 700,
                    }}
                  >
                    Rs.{" "}
                    {Math.round(
                      discountedPrice
                    ).toLocaleString()}
                  </span>
                </>
              ) : (
                <p className="price">
                  Rs.{" "}
                  {product.price.toLocaleString()}
                </p>
              )}
            </div>
          )}
      </div>
    </article>
  );
}

/* =========================================================
   CATALOG
========================================================= */

export default function Catalog() {
  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    []
  );

  const [
    promotions,
    setPromotions,
  ] = useState<
    PromotionWithRules[]
  >([]);

  const [
    siteContacts,
    setSiteContacts,
  ] = useState<SiteContactSettings>({
    instagram_url: "",
    whatsapp_number: "",
    tiktok_url: "",
  });

  const [
    status,
    setStatus,
  ] = useState("All");

  const [
    category,
    setCategory,
  ] = useState("All");

  const [
    brand,
    setBrand,
  ] = useState("All");

  const [
    gender,
    setGender,
  ] = useState("All");

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    priceRange,
    setPriceRange,
  ] = useState("All");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    open,
    setOpen,
  ] = useState<Product | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  /*
   * Promotion timing is event-driven instead of using
   * a permanent 1-second interval. The shared hook
   * schedules a single update for the next promotion
   * start/end boundary.
   */
  const now =
    usePromotionClock(
      promotions
    );

  /*
   * Load products and all promotions,
   * regardless of their start_at / end_at.
   * Nothing here is filtered by time on the
   * server, so future and already-ended
   * promotions are still fetched. Whether a
   * promotion currently applies to customers
   * is decided client-side below (activePromotions),
   * against the live clock.
   */
  useEffect(() => {
    const load = async () => {
      setLoadError("");

      const [
        productsResult,
        promotionsResult,
        settingsResult,
      ] =
        await Promise.all([
          supabase()
            .from("products")
            .select("*")
            .order(
              "featured",
              {
                ascending: false,
              }
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase()
            .from("promotions")
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase()
            .from("site_settings")
            .select(
              "setting_key, setting_value"
            )
            .in("setting_key", [
              "instagram_url",
              "whatsapp_number",
              "tiktok_url",
            ]),
        ]);

      if (productsResult.error) {
        console.error("Failed to load products:", productsResult.error);
        setProducts([]);
        setLoadError(
          "We couldn't load the collection right now. Please check your connection and try again."
        );
      } else {
        setProducts(
          (productsResult.data as Product[]) ||
          []
        );
      }

      if (promotionsResult.error) {
        console.error("Failed to load promotions:", promotionsResult.error);
        setPromotions([]);
      } else if (promotionsResult.data) {
        const rawPromotions =
          promotionsResult.data as Promotion[];

        /*
         * Fetch their rules.
         */
        if (
          rawPromotions.length >
          0
        ) {
          const {
            data: rulesData,
            error: rulesError,
          } = await supabase()
            .from(
              "promotion_rules"
            )
            .select("*")
            .in(
              "promotion_id",
              rawPromotions.map(
                (promotion) =>
                  promotion.id
              )
            );

          if (!rulesError) {
            const loaded =
              rawPromotions.map(
                (promotion) => ({
                  ...promotion,
                  rules: (
                    (rulesData as PromotionRule[]) ||
                    []
                  ).filter(
                    (rule) =>
                      rule.promotion_id ===
                      promotion.id
                  ),
                })
              );

            setPromotions(
              loaded
            );
          } else {
            console.error("Failed to load promotion rules:", rulesError);
            setPromotions([]);
          }
        } else {
          setPromotions([]);
        }
      }

      if (settingsResult.error) {
        console.error("Failed to load contact settings:", settingsResult.error);
      } else if (settingsResult.data) {
        const nextContacts: SiteContactSettings = {
          instagram_url: "",
          whatsapp_number: "",
          tiktok_url: "",
        };

        for (const row of settingsResult.data as {
          setting_key: string;
          setting_value: string;
        }[]) {
          if (row.setting_key in nextContacts) {
            nextContacts[
              row.setting_key as keyof SiteContactSettings
            ] = row.setting_value || "";
          }
        }

        setSiteContacts(nextContacts);
      }

      setLoading(false);
    };

    load();
  }, []);

  const categories =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            products
              .map(
                (p) =>
                  p.category
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ).sort((a, b) =>
          a.localeCompare(b)
        ),
      ],
      [products]
    );

  const brands =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            products
              .map(
                (p) =>
                  p.brand
              )
              .filter(Boolean)
          )
        ),
      ],
      [products]
    );

  /*
   * Products available after the normal
   * search/filter controls.
   */
  const filtered =
    products.filter(
      (p) => {
        let matchesPrice =
          true;

        if (
          priceRange !==
          "All"
        ) {
          if (
            p.price ===
            null
          ) {
            matchesPrice =
              false;
          } else {
            const price =
              p.price;

            switch (
            priceRange
            ) {
              case "under_25000":
                matchesPrice =
                  price <
                  25000;
                break;

              case "25000_35000":
                matchesPrice =
                  price >=
                  25000 &&
                  price <=
                  35000;
                break;

              case "35000_50000":
                matchesPrice =
                  price >=
                  35000 &&
                  price <=
                  50000;
                break;

              case "50000_100000":
                matchesPrice =
                  price >=
                  50000 &&
                  price <=
                  100000;
                break;

              case "above_100000":
                matchesPrice =
                  price >
                  100000;
                break;

              default:
                matchesPrice =
                  true;
            }
          }
        }

        const matchesSearch =
          productMatchesSearch(
            p,
            query
          );

        return (
          (status ===
            "All" ||
            p.status ===
            status) &&
          (category ===
            "All" ||
            p.category ===
            category) &&
          (brand ===
            "All" ||
            p.brand ===
            brand) &&
          (gender ===
            "All" ||
            p.gender ===
            gender) &&
          matchesPrice &&
          matchesSearch
        );
      }
    );


  const sortedProducts =
    [...filtered].sort(
      (a, b) => {
        switch (sortBy) {
          case "price_low":
            return (
              (a.price ?? Number.MAX_SAFE_INTEGER) -
              (b.price ?? Number.MAX_SAFE_INTEGER)
            );

          case "price_high":
            return (
              (b.price ?? -1) -
              (a.price ?? -1)
            );

          case "in_stock_first":
            if (a.status === b.status) {
              return 0;
            }

            return a.status === "in_stock"
              ? -1
              : 1;

          case "newest":
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      }
    );

  const hasActiveFilters =
    query.trim() !== "" ||
    status !== "All" ||
    category !== "All" ||
    brand !== "All" ||
    gender !== "All" ||
    priceRange !== "All";

  function clearFilters() {
    setQuery("");
    setStatus("All");
    setCategory("All");
    setBrand("All");
    setGender("All");
    setPriceRange("All");
  }

  const priceRangeLabel =
    priceRange === "under_25000"
      ? "Under Rs. 25,000"
      : priceRange === "25000_35000"
        ? "Rs. 25,000–35,000"
        : priceRange === "35000_50000"
          ? "Rs. 35,000–50,000"
          : priceRange === "50000_100000"
            ? "Rs. 50,000–100,000"
            : priceRange === "above_100000"
              ? "Above Rs. 100,000"
              : "";

  /*
   * Promotions that are actually live right now,
   * i.e. is_active and within [start_at, end_at].
   * This re-evaluates every time `now` ticks
   * forward, so a sale turns on/off at its exact
   * start_at / end_at without needing a refresh.
   */
  const activePromotions =
    useMemo(
      () =>
        promotions.filter(
          (promotion) =>
            isPromotionActive(
              promotion,
              now
            )
        ),
      [promotions, now]
    );

  /*
   * Active banners - every currently-live
   * promotion is shown in the banner.
   */
  const activeBannerPromotions =
    activePromotions;

  /*
   * The modal needs the promotion for the
   * currently selected product. Only currently
   * live promotions are considered, so a product
   * stops showing a discount the instant its
   * promotion ends (and starts showing one the
   * instant a new promotion begins), with no
   * refresh required.
   */
  const openPromotion =
    open
      ? getBestPromotion(
        open,
        activePromotions
      )
      : null;

  const footerWhatsAppUrl =
    siteContacts.whatsapp_number.trim()
      ? `https://wa.me/${siteContacts.whatsapp_number.replace(/\D/g, "")}`
      : null;

  const footerInstagramUrl =
    siteContacts.instagram_url.trim() || null;

  const footerTikTokUrl =
    siteContacts.tiktok_url.trim() || null;

  return (
    <main>
      <a
        className="skip-link"
        href="#collection"
      >
        Skip to collection
      </a>

      {/* =====================================================
          SALE BANNER
      ===================================================== */}

      {activeBannerPromotions.length >
        0 && (
          <div
            style={{
              width: "100%",
              background:
                "#292226",
              color: "#fff",
              padding:
                "10px 20px",
              textAlign:
                "center",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: 11,
              letterSpacing:
                "1px",
              lineHeight: 1.5,
            }}
          >
            {activeBannerPromotions.map(
              (
                promotion,
                index
              ) => (
                <span
                  key={
                    promotion.id
                  }
                >
                  {index >
                    0 && (
                      <span
                        style={{
                          margin:
                            "0 12px",
                          opacity:
                            0.5,
                        }}
                      >
                        •
                      </span>
                    )}

                  {promotion.banner_text ||
                    `${formatPromotionDiscount(
                      promotion
                    )}`}
                </span>
              )
            )}
          </div>
        )}

      <header className="site-header">
        <Link
          href="/"
          className="logo"
        >
          Amna&apos;s{" "}
          <span>Edit</span>
        </Link>

        <nav aria-label="Primary navigation">
          <Link href="/">
            Home
          </Link>

          <Link href="/collection">
            Collection
          </Link>

          <Link href="/#about" className="desktop-secondary">
            About
          </Link>

        </nav>
      </header>

      <section
        id="collection"
        className="collection"
      >
        <div className="section-heading">
          <div>
            <p className="kicker">
              SHOP THE EDIT
            </p>

            <h2>
              Our Collection
            </h2>
          </div>

          <p
            className="count"
            aria-live="polite"
          >
            {filtered.length}{" "}
            pieces
          </p>
        </div>

        <div className="filters">
          <div className="search">
            <Search size={17} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Search pieces, brands..."
              aria-label="Search products"
              autoComplete="off"
            />
          </div>

          <div className="select-wrap">
            <SlidersHorizontal
              size={16}
            />

            <select
              aria-label="Filter by product status"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >
              <option value="All">
                All statuses
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
              aria-label="Filter by category"
              value={
                category
              }
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
            >
              {categories.map(
                (c) => (
                  <option
                    key={c}
                    value={c}
                  >
                    {c === "All"
                      ? "All categories"
                      : c}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="select-wrap">
            <select
              aria-label="Filter by brand"
              value={brand}
              onChange={(e) =>
                setBrand(
                  e.target.value
                )
              }
            >
              {brands.map(
                (b) => (
                  <option
                    key={b}
                    value={b}
                  >
                    {b === "All"
                      ? "All brands"
                      : b}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="select-wrap">
            <select
              aria-label="Filter by gender"
              value={gender}
              onChange={(e) =>
                setGender(
                  e.target.value
                )
              }
            >
              <option value="All">
                All audiences
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
              aria-label="Filter by price range"
              value={
                priceRange
              }
              onChange={(e) =>
                setPriceRange(
                  e.target.value
                )
              }
            >
              <option value="All">
                All prices
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

          <div className="select-wrap sort-wrap">
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value
                )
              }
            >
              <option value="newest">
                Sort: Newest
              </option>

              <option value="price_low">
                Price: Low to high
              </option>

              <option value="price_high">
                Price: High to low
              </option>

              <option value="in_stock_first">
                In Stock first
              </option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div
            className="active-filter-row"
            aria-label="Active filters"
          >
            {query.trim() && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setQuery("")
                }
              >
                Search: {query.trim()} ×
              </button>
            )}

            {status !== "All" && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setStatus("All")
                }
              >
                {STATUS_LABELS[
                  status as Product["status"]
                ]} ×
              </button>
            )}

            {category !== "All" && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setCategory("All")
                }
              >
                Category: {category} ×
              </button>
            )}

            {brand !== "All" && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setBrand("All")
                }
              >
                Brand: {brand} ×
              </button>
            )}

            {gender !== "All" && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setGender("All")
                }
              >
                {gender === "female"
                  ? "Women"
                  : gender === "male"
                    ? "Men"
                    : "Unisex"}{" "}
                ×
              </button>
            )}

            {priceRange !== "All" && (
              <button
                type="button"
                className="filter-chip"
                onClick={() =>
                  setPriceRange("All")
                }
              >
                {priceRangeLabel} ×
              </button>
            )}
          </div>
        )}

        {loadError && !loading ? (
          <div className="load-error-card" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <ProductGridSkeleton
            count={8}
          />
        ) : filtered.length ===
          0 ? (
          <div
            className="empty"
            role="status"
          >
            No pieces match
            these filters.
          </div>
        ) : (
          <div className="product-grid">
            {sortedProducts.map(
              (p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  promotion={getBestPromotion(
                    p,
                    activePromotions
                  )}
                  onOpen={setOpen}
                />
              )
            )}
          </div>
        )}
      </section>

      <footer>
        <div className="logo">
          Amna&apos;s{" "}
          <span>Edit</span>
        </div>

        <p>
          Curated pieces.
          Personal service.
        </p>

        <div className="footer-links">
          <Link
            href="/policies"
            aria-label="Policies"
          >
            Policies
          </Link>

          <Link
            href="/admin"
            className="footer-owner-link"
            aria-label="Owner access"
          >
            Owner
          </Link>

          {footerInstagramUrl && (
            <a
              href={footerInstagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
          )}

          {footerWhatsAppUrl && (
            <a
              href={footerWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          )}

          {footerTikTokUrl && (
            <a
              href={footerTikTokUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <Music2 size={18} />
            </a>
          )}
        </div>
      </footer>

      {open && (
        <ProductModal
          product={open}
          promotion={
            openPromotion
          }
          siteContacts={
            siteContacts
          }
          allProducts={products}
          onOpenProduct={setOpen}
          close={() =>
            setOpen(null)
          }
        />
      )}
    </main>
  );
}
