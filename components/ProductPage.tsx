"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
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
        close={() =>
          router.push("/collection")
        }
        pageMode
      />
    </main>
  );
}
