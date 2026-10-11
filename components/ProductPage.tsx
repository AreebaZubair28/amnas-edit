"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";

import ProductModal from "@/components/ProductModal";
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
}: ProductPageProps) {
  const router = useRouter();

  function openRecommended(
    nextProduct: Product
  ) {
    router.push(
      `/products/${nextProduct.slug}`
    );
  }

  return (
    <main className="standalone-product-page">
      <header className="product-page-header">
        <a
          href="/"
          className="product-page-logo"
          aria-label="Amna's Edit home"
        >
          Amna&apos;s <span>Edit</span>
        </a>

        <nav aria-label="Product page navigation">
          <a href="/collection">
            Collection
          </a>
          <a href="/policies">
            Policies
          </a>
        </nav>
      </header>

      <ProductModal
        product={product}
        promotion={promotion}
        siteContacts={siteContacts}
        allProducts={allProducts}
        onOpenProduct={openRecommended}
        close={() =>
          router.push("/collection")
        }
        pageMode
      />
    </main>
  );
}
