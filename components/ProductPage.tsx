"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ProductModal from "@/components/ProductModal";
import SiteFooter from "@/components/SiteFooter";
import { whatsAppChatUrl } from "@/lib/whatsapp";
import type { Product } from "@/types/product";

type ProductModalProps =
  ComponentProps<typeof ProductModal>;

type ProductPageProps = Pick<
  ProductModalProps,
  | "product"
  | "promotion"
  | "siteContacts"
  | "allProducts"
>;

export default function ProductPage({
  product,
  promotion,
  siteContacts,
  allProducts,
  trail = [],
}: ProductPageProps & { trail?: string[] }) {
  const router = useRouter();

  function openRecommended(
    nextProduct: Product
  ) {
    const nextTrail = [...trail, product.slug].slice(-8);
    const query = new URLSearchParams({ trail: nextTrail.join(",") });
    router.push(`/products/${encodeURIComponent(nextProduct.slug)}?${query}`);
  }

  return (
    <main className="standalone-product-page">
      <header className="product-page-header">
        <Link
          href="/"
          className="product-page-logo"
          aria-label="Amna's Edit home"
        >
          Amna&apos;s <span>Edit</span>
        </Link>

        <nav aria-label="Product page navigation">
          <Link href="/collection">
            Collection
          </Link>
          <Link href="/policies">
            Policies
          </Link>
        </nav>
      </header>

      <ProductModal
        product={product}
        promotion={promotion}
        siteContacts={siteContacts}
        allProducts={allProducts}
        onOpenProduct={openRecommended}
        onBackProduct={trail.length ? () => {
          const previous = trail[trail.length - 1];
          const earlier = trail.slice(0, -1);
          const query = earlier.length ? `?trail=${encodeURIComponent(earlier.join(","))}` : "";
          router.push(`/products/${encodeURIComponent(previous)}${query}`);
        } : undefined}
        close={() =>
          router.push("/collection")
        }
        pageMode
      />
      <SiteFooter
        whatsappUrl={whatsAppChatUrl(siteContacts.whatsapp_number)}
        instagramUrl={siteContacts.instagram_url || null}
        tiktokUrl={siteContacts.tiktok_url || null}
      />
    </main>
  );
}
