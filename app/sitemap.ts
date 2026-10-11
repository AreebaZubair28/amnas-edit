import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/collection`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/policies`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return staticRoutes;
  }

  const supabase = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } = await supabase
    .from("products")
    .select("slug, created_at")
    .not("slug", "is", null)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Product sitemap entries could not be loaded:",
      error
    );
    return staticRoutes;
  }

  const productRoutes: MetadataRoute.Sitemap =
    (data || []).map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.created_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [
    ...staticRoutes,
    ...productRoutes,
  ];
}
