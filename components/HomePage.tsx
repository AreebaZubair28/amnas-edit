"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Instagram,
    MessageCircle,
    Music2,
    ArrowRight,
    Star,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import ProductModal from "@/components/ProductModal";
import {
    Product,
    STATUS_LABELS,
    STATUS_CLASS,
} from "@/types/product";

type SiteSettings = {
    about_title: string;
    about_text: string;
    instagram_url: string;
    whatsapp_number: string;
    tiktok_url: string;
};

type Review = {
    id: string;
    product_id: string;
    rating: number;
    review_text: string;
    created_at: string;
};

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

function calculateDiscountedPrice(
    price: number,
    promotion: Promotion
): number {
    if (promotion.discount_type === "percentage") {
        const discount =
            price * (promotion.discount_value / 100);

        return Math.max(0, price - discount);
    }

    return Math.max(
        0,
        price - promotion.discount_value
    );
}



function formatPromotionDiscount(
    promotion: Promotion
): string {
    if (promotion.discount_type === "percentage") {
        return `${promotion.discount_value}% OFF`;
    }

    return `Rs. ${promotion.discount_value.toLocaleString()} OFF`;
}

function getDiscountAmount(
    price: number,
    promotion: Promotion
): number {
    return Math.max(
        0,
        price - calculateDiscountedPrice(price, promotion)
    );
}

function isPromotionActive(
    promotion: Promotion,
    now: number
): boolean {
    return (
        promotion.is_active &&
        now >= new Date(promotion.start_at).getTime() &&
        now <= new Date(promotion.end_at).getTime()
    );
}

function makeWhatsAppUrl(
    number: string
): string {
    const clean = number.replace(/\D/g, "");

    if (!clean) {
        return "#";
    }

    return `https://wa.me/${clean}`;
}

function makeInstagramUrl(
    value: string
): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return "#";
    }

    if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://")
    ) {
        return trimmed;
    }

    return `https://instagram.com/${trimmed.replace(
        /^@/,
        ""
    )}`;
}

function ProductPreview({
    product,
    promotion,
    onOpen,
}: {
    product: Product;
    promotion: PromotionWithRules | null;
    onOpen: (product: Product) => void;
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
        <button
            type="button"
            className="home-product-card"
            onClick={() => onOpen(product)}
            style={{
                border: 0,
                padding: 0,
                width: "100%",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
            }}
        >
            <div className="home-product-image">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                    />
                ) : (
                    <div className="image-placeholder">
                        <span>Amna&apos;s Edit</span>
                    </div>
                )}

                <span
                    className={`status-badge ${STATUS_CLASS[product.status]}`}
                >
                    {STATUS_LABELS[product.status]}
                </span>

                {promotion && (
                    <span
                        style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            background: "#292226",
                            color: "#fff",
                            fontSize: 9,
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            padding: "7px 9px",
                            borderRadius: 20,
                            fontWeight: 700,
                        }}
                    >
                        {formatPromotionDiscount(promotion)}
                    </span>
                )}
            </div>

            <div className="home-product-info">
                <span className="eyebrow">
                    {product.brand || "Curated Edit"}
                </span>

                <h3>{product.name}</h3>

                {product.price !== null && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {promotion &&
                            discountedPrice !== null ? (
                            <>
                                <span
                                    style={{
                                        color: "var(--muted)",
                                        textDecoration: "line-through",
                                    }}
                                >
                                    Rs.{" "}
                                    {product.price.toLocaleString()}
                                </span>

                                <span
                                    style={{
                                        color: "var(--pink-deep)",
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
                            <p>
                                Rs.{" "}
                                {product.price.toLocaleString()}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}

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

export default function HomePage() {
    const [products, setProducts] =
        useState<Product[]>([]);

    const [reviews, setReviews] =
        useState<Review[]>([]);

    const [siteSettings, setSiteSettings] =
        useState<SiteSettings>({
            about_title: "",
            about_text: "",
            instagram_url: "",
            whatsapp_number: "",
            tiktok_url: "",
        });

    const [promotions, setPromotions] =
        useState<PromotionWithRules[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [now, setNow] =
        useState(Date.now());

    const [open, setOpen] =
        useState<Product | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function loadHomeData() {
            const [
                productsResult,
                reviewsResult,
                settingsResult,
                promotionsResult,
            ] = await Promise.all([
                supabase()
                    .from("products")
                    .select("*")
                    .order("featured", {
                        ascending: false,
                    })
                    .order("created_at", {
                        ascending: false,
                    }),

                supabase()
                    .from("product_reviews")
                    .select(
                        "id, product_id, rating, review_text, created_at"
                    )
                    .eq("is_approved", true)
                    .order("created_at", {
                        ascending: false,
                    }),

                supabase()
                    .from("site_settings")
                    .select(
                        "setting_key, setting_value"
                    )
                    .in("setting_key", [
                        "about_title",
                        "about_text",
                        "instagram_url",
                        "whatsapp_number",
                        "tiktok_url",
                    ]),

                supabase()
                    .from("promotions")
                    .select("*")
                    .order("created_at", {
                        ascending: false,
                    }),
            ]);

            if (!productsResult.error) {
                setProducts(
                    (productsResult.data as Product[]) ||
                    []
                );
            }

            if (!reviewsResult.error) {
                setReviews(
                    (reviewsResult.data as Review[]) ||
                    []
                );
            }

            if (
                !settingsResult.error &&
                settingsResult.data
            ) {
                const nextSettings: SiteSettings = {
                    about_title: "",
                    about_text: "",
                    instagram_url: "",
                    whatsapp_number: "",
                    tiktok_url: "",
                };

                for (
                    const row of settingsResult.data as {
                        setting_key: string;
                        setting_value: string;
                    }[]
                ) {
                    if (
                        row.setting_key in nextSettings
                    ) {
                        nextSettings[
                            row.setting_key as keyof SiteSettings
                        ] = row.setting_value || "";
                    }
                }

                setSiteSettings(nextSettings);
            }

            if (!promotionsResult.error && promotionsResult.data) {
                const rawPromotions =
                    promotionsResult.data as Promotion[];

                if (rawPromotions.length > 0) {
                    const {
                        data: rulesData,
                        error: rulesError,
                    } = await supabase()
                        .from("promotion_rules")
                        .select("*")
                        .in(
                            "promotion_id",
                            rawPromotions.map(
                                (promotion) => promotion.id
                            )
                        );

                    if (!rulesError) {
                        setPromotions(
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
                            )
                        );
                    } else {
                        setPromotions([]);
                    }
                } else {
                    setPromotions([]);
                }
            }

            setLoading(false);
        }

        loadHomeData();
    }, []);

    const activePromotions = useMemo(
        () =>
            promotions.filter((promotion) =>
                isPromotionActive(
                    promotion,
                    now
                )
            ),
        [promotions, now]
    );

    const newArrivals = useMemo(
        () =>
            [...products]
                .sort(
                    (a, b) =>
                        new Date(
                            b.created_at
                        ).getTime() -
                        new Date(
                            a.created_at
                        ).getTime()
                )
                .slice(0, 4),
        [products]
    );

    const heroProduct =
        products.find(
            (product) =>
                product.image_url
        ) || null;

    const averageRating =
        reviews.length > 0
            ? reviews.reduce(
                (sum, review) =>
                    sum + review.rating,
                0
            ) / reviews.length
            : 0;

    const instagramUrl =
        makeInstagramUrl(
            siteSettings.instagram_url
        );

    const whatsappUrl =
        makeWhatsAppUrl(
            siteSettings.whatsapp_number
        );

    const tiktokUrl =
        siteSettings.tiktok_url || "#";

    if (loading) {
        return (
            <main className="home-page">
                <div className="empty">
                    Loading Amna&apos;s Edit...
                </div>
            </main>
        );
    }

    return (
        <main className="home-page">

            {/* =====================================================
          ANNOUNCEMENT
      ===================================================== */}

            {activePromotions.length > 0 && (
                <div className="home-announcement">
                    {activePromotions.map(
                        (promotion, index) => (
                            <span
                                key={promotion.id}
                            >
                                {index > 0 && (
                                    <span className="home-announcement-dot">
                                        •
                                    </span>
                                )}

                                {promotion.banner_text ||
                                    promotion.name}
                            </span>
                        )
                    )}
                </div>
            )}

            {/* =====================================================
          HEADER
      ===================================================== */}

            <header className="site-header">
                <a
                    href="/"
                    className="logo"
                >
                    Amna&apos;s{" "}
                    <span>Edit</span>
                </a>

                <nav>
                    <a href="/">
                        Home
                    </a>

                    <a href="/collection">
                        Collection
                    </a>

                    <a href="#about">
                        About
                    </a>

                    <a
                        href="/admin"
                        className="admin-link"
                    >
                        Owner Login
                    </a>
                </nav>
            </header>

            {/* =====================================================
          HERO
      ===================================================== */}

            <section className="home-hero">
                <div className="home-hero-copy">
                    <p className="kicker">
                        THE CURATED EDIT
                    </p>

                    <h1>
                        Luxury pieces,
                        <br />
                        <em>carefully chosen.</em>
                    </h1>

                    <p className="home-hero-text">
                        Discover a considered collection
                        of bags, shoes, jewelry and more —
                        selected for effortless,
                        everyday luxury.
                    </p>

                    <div className="home-hero-actions">
                        <a
                            href="/collection"
                            className="button primary"
                        >
                            Explore Collection
                            <ArrowRight size={16} />
                        </a>

                        <a
                            href="#new-arrivals"
                            className="button secondary"
                        >
                            New Arrivals
                        </a>
                    </div>
                </div>

                <div className="home-hero-image">
                    {heroProduct?.image_url ? (
                        <img
                            src={heroProduct.image_url}
                            alt={heroProduct.name}
                        />
                    ) : (
                        <div className="home-hero-placeholder">
                            <span>
                                AMNA&apos;S
                                <br />
                                <em>EDIT</em>
                            </span>
                        </div>
                    )}

                    <div className="home-hero-label">
                        <span>
                            AMNA&apos;S EDIT
                        </span>
                        <strong>
                            Curated pieces.
                        </strong>
                    </div>
                </div>
            </section>

            {/* =====================================================
          NEW ARRIVALS
      ===================================================== */}

            <section
                id="new-arrivals"
                className="home-section"
            >
                <div className="home-section-heading">
                    <div>
                        <p className="kicker">
                            JUST IN
                        </p>

                        <h2>
                            New Arrivals
                        </h2>
                    </div>

                    <a
                        href="/collection"
                        className="home-section-link"
                    >
                        View all
                        <ArrowRight size={15} />
                    </a>
                </div>

                {newArrivals.length > 0 ? (
                    <div className="home-product-grid">
                        {newArrivals.map(
                            (product) => (
                                <ProductPreview
                                    key={product.id}
                                    product={product}
                                    promotion={getBestPromotion(
                                        product,
                                        activePromotions
                                    )}
                                    onOpen={setOpen}
                                />
                            )
                        )}
                    </div>
                ) : (
                    <div className="empty">
                        New pieces will appear here.
                    </div>
                )}
            </section>

            {/* =====================================================
          THE EDIT JOURNAL
      ===================================================== */}

            <section className="home-journal">
                <div className="home-section-heading centered">
                    <div>
                        <p className="kicker">
                            NOTES FROM THE EDIT
                        </p>

                        <h2>
                            The Edit Journal
                        </h2>

                        <p className="home-journal-intro">
                            A little more behind the pieces, the sourcing, and the way we curate Amna&apos;s Edit.
                        </p>
                    </div>
                </div>

                <div className="home-journal-grid">
                    <article className="home-journal-card">
                        <span className="eyebrow">
                            STYLE NOTE
                        </span>
                        <h3>
                            The art of choosing
                        </h3>
                        <p>
                            The best edit is not about having everything. It is about finding a few pieces that immediately feel right — the shape, the finish, the color, and the details that make you want to reach for them again.
                        </p>
                    </article>

                    <article className="home-journal-card">
                        <span className="eyebrow">
                            SOURCING NOTE
                        </span>
                        <h3>
                            Sourced with intention
                        </h3>
                        <p>
                            Some pieces are ready to explore from our current edit, while others are sourced specifically through preorder. We keep the process personal, so you can ask about availability, colors, and the pieces you have in mind.
                        </p>
                    </article>

                    <article className="home-journal-card">
                        <span className="eyebrow">
                            THE DETAILS
                        </span>
                        <h3>
                            Details matter
                        </h3>
                        <p>
                            From a different colorway to the smallest finishing detail, the little things can change how a piece feels. That is why product details, variants, and direct conversation are part of the Amna&apos;s Edit experience.
                        </p>
                    </article>
                </div>

                <div className="home-process">
                    <div className="home-process-heading">
                        <p className="kicker">
                            HOW THE EDIT WORKS
                        </p>
                        <h3>
                            Discover. Ask. Choose.
                        </h3>
                    </div>

                    <div className="home-process-grid">
                        <div className="home-process-step">
                            <span>01</span>
                            <h4>Discover</h4>
                            <p>
                                Browse the collection and save the pieces that catch your eye.
                            </p>
                        </div>

                        <div className="home-process-step">
                            <span>02</span>
                            <h4>Ask</h4>
                            <p>
                                Message us directly about availability, colors, preorders, or sourcing.
                            </p>
                        </div>

                        <div className="home-process-step">
                            <span>03</span>
                            <h4>Choose</h4>
                            <p>
                                We help you move forward with the piece that feels right for you.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* =====================================================
          ABOUT
      ===================================================== */}

            <section
                id="about"
                className="home-about"
            >
                <div className="home-about-inner">
                    <div>
                        <p className="kicker">
                            ABOUT AMNA&apos;S EDIT
                        </p>

                        <h2>
                            {siteSettings.about_title ||
                                "Curated, not crowded."}
                        </h2>
                    </div>

                    <div>
                        <p>
                            {siteSettings.about_text ||
                                "Amna's Edit brings together carefully selected pieces with a focus on style, quality, and personal service."}
                        </p>

                        <a
                            href="/collection"
                            className="button secondary"
                        >
                            Discover the Edit
                            <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* =====================================================
          CUSTOMER LOVE
      ===================================================== */}

            {reviews.length > 0 && (
                <section className="home-reviews">
                    <div className="home-section-heading centered">
                        <div>
                            <p className="kicker">
                                CUSTOMER LOVE
                            </p>

                            <h2>
                                What our clients say
                            </h2>

                            <div className="home-rating-summary">
                                <span>
                                    {"★".repeat(
                                        Math.round(
                                            averageRating
                                        )
                                    )}
                                </span>

                                <strong>
                                    {averageRating.toFixed(1)}
                                </strong>

                                <small>
                                    from {reviews.length}{" "}
                                    {reviews.length === 1
                                        ? "review"
                                        : "reviews"}
                                </small>
                            </div>
                        </div>
                    </div>

                    <div className="home-reviews-grid">
                        {reviews
                            .slice(0, 3)
                            .map((review) => (
                                <article
                                    key={review.id}
                                    className="home-review-card"
                                >
                                    <div className="home-review-stars">
                                        {Array.from({
                                            length: 5,
                                        }).map((_, index) => (
                                            <Star
                                                key={index}
                                                size={14}
                                                fill={
                                                    index <
                                                        review.rating
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        ))}
                                    </div>

                                    <p>
                                        “{review.review_text}”
                                    </p>
                                </article>
                            ))}
                    </div>
                </section>
            )}

            {/* =====================================================
          CONTACT CTA
      ===================================================== */}

            <section className="home-contact">
                <div>
                    <p className="kicker">
                        PERSONAL SERVICE
                    </p>

                    <h2>
                        Found something
                        <br />
                        <em>you love?</em>
                    </h2>

                    <p>
                        Browse the collection and
                        reach out directly for
                        availability, colors,
                        preorders, and sourcing.
                    </p>

                    <div className="home-contact-actions">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button primary"
                        >
                            <MessageCircle
                                size={17}
                            />
                            WhatsApp Us
                        </a>

                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button secondary"
                        >
                            <Instagram
                                size={17}
                            />
                            Instagram
                        </a>
                    </div>
                </div>
            </section>

            {/* =====================================================
          FOOTER
      ===================================================== */}

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
                    <a
                        href="/policies"
                        aria-label="Policies"
                    >
                        Policies
                    </a>

                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                    >
                        <Instagram size={18} />
                    </a>

                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="WhatsApp"
                    >
                        <MessageCircle
                            size={18}
                        />
                    </a>

                    <a
                        href={tiktokUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="TikTok"
                    >
                        <Music2 size={18} />
                    </a>
                </div>
            </footer>

            {open && (
                <ProductModal
                    product={open}
                    promotion={getBestPromotion(
                        open,
                        activePromotions
                    )}
                    siteContacts={{
                        instagram_url:
                            siteSettings.instagram_url,
                        whatsapp_number:
                            siteSettings.whatsapp_number,
                        tiktok_url:
                            siteSettings.tiktok_url,
                    }}
                    allProducts={products}
                    onOpenProduct={setOpen}
                    close={() => setOpen(null)}
                />
            )}
        </main>
    );
}