import type {
  Metadata,
} from "next";
import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title: "Collection",
  description:
    "Browse the Amna's Edit collection of curated bags, shoes, accessories, in-stock pieces, and sold-out favourites.",
  alternates: {
    canonical: "/collection",
  },
  openGraph: {
    title: "Collection | Amna's Edit",
    description:
      "Explore the latest curated collection from Amna's Edit.",
    url: "/collection",
  },
};

export default function CollectionLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
