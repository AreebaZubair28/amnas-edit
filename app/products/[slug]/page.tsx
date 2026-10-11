import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import ProductPage from "@/components/ProductPage";
import type {
  PromotionWithRules,
  SiteContactSettings,
} from "@/components/ProductModal";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/product";

type PromotionRule =
  PromotionWithRules["rules"][number];

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getProductBySlug = cache(
  async (slug: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(
        "Failed to load product page:",
        error
      );
      return null;
    }

    return (data as Product | null) ?? null;
  }
);

function ruleMatchesProduct(
  rule: PromotionRule,
  product: Product
): boolean {
  switch (rule.rule_type) {
    case "all":
      return true;
    case "status":
      return rule.status_value === product.status;
    case "category":
      return rule.category_id === product.category_id;
    case "brand":
      return rule.brand_id === product.brand_id;
    case "gender":
      return rule.gender_value === product.gender;
    case "product":
      return rule.product_id === product.id;
    default:
      return false;
  }
}

function promotionMatchesProduct(
  promotion: PromotionWithRules,
  product: Product
): boolean {
  return (
    promotion.rules.length > 0 &&
    promotion.rules.every((rule) =>
      ruleMatchesProduct(rule, product)
    )
  );
}

function discountedPrice(
  price: number,
  promotion: PromotionWithRules
): number {
  if (promotion.discount_type === "percentage") {
    return Math.max(
      0,
      price -
        price *
          (promotion.discount_value / 100)
    );
  }

  return Math.max(
    0,
    price - promotion.discount_value
  );
}

function bestPromotion(
  product: Product,
  promotions: PromotionWithRules[]
): PromotionWithRules | null {
  const matching = promotions.filter(
    (promotion) =>
      promotionMatchesProduct(
        promotion,
        product
      )
  );

  if (matching.length === 0) {
    return null;
  }

  if (product.price === null) {
    return matching[0];
  }

  return matching.reduce(
    (best, current) => {
      const bestSaving =
        product.price! -
        discountedPrice(
          product.price!,
          best
        );
      const currentSaving =
        product.price! -
        discountedPrice(
          product.price!,
          current
        );

      return currentSaving > bestSaving
        ? current
        : best;
    }
  );
}

async function loadPageData(
  product: Product
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [
    productsResult,
    promotionsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .lte("start_at", now)
      .gte("end_at", now),
    supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "instagram_url",
        "whatsapp_number",
        "tiktok_url",
      ]),
  ]);

  const allProducts =
    (productsResult.data as Product[] | null) || [];

  const promotionRows =
    promotionsResult.data || [];

  let promotions: PromotionWithRules[] = [];

  if (promotionRows.length > 0) {
    const ids = promotionRows.map(
      (promotion) => promotion.id
    );

    const { data: rules } = await supabase
      .from("promotion_rules")
      .select("*")
      .in("promotion_id", ids);

    promotions = promotionRows.map(
      (promotion) => ({
        ...promotion,
        rules:
          (rules || []).filter(
            (rule) =>
              rule.promotion_id ===
              promotion.id
          ),
      })
    ) as PromotionWithRules[];
  }

  const siteContacts: SiteContactSettings = {
    instagram_url: "",
    whatsapp_number: "",
    tiktok_url: "",
  };

  for (const row of settingsResult.data || []) {
    if (
      row.setting_key in siteContacts
    ) {
      siteContacts[
        row.setting_key as keyof SiteContactSettings
      ] = row.setting_value || "";
    }
  }

  return {
    allProducts,
    promotion: bestPromotion(
      product,
      promotions
    ),
    siteContacts,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    product.description?.trim() ||
    `Explore ${product.name}${
      product.brand
        ? ` by ${product.brand}`
        : ""
    } at Amna's Edit.`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      type: "website",
      title: `${product.name} | Amna's Edit`,
      description,
      url: `/products/${product.slug}`,
      images: product.image_url
        ? [
            {
              url: product.image_url,
              alt: product.name,
            },
          ]
        : ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Amna's Edit`,
      description,
      images: product.image_url
        ? [product.image_url]
        : ["/opengraph-image"],
    },
  };
}

export default async function ProductRoute({
  params,
}: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const {
    allProducts,
    promotion,
    siteContacts,
  } = await loadPageData(product);

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description || undefined,
    image: product.image_url
      ? [product.image_url]
      : undefined,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    category: product.category,
    url: `${siteUrl}/products/${product.slug}`,
    offers:
      product.price !== null
        ? {
            "@type": "Offer",
            priceCurrency: "PKR",
            price: product.price,
            availability:
              product.status === "in_stock"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: `${siteUrl}/products/${product.slug}`,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd
          ).replace(/</g, "\\u003c"),
        }}
      />

      <ProductPage
        product={product}
        promotion={promotion}
        siteContacts={siteContacts}
        allProducts={allProducts}
      />
    </>
  );
}
