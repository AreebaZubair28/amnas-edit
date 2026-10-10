import "./globals.css";
import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Amna's Edit | Curated Fashion & Accessories",
    template: "%s | Amna's Edit",
  },
  description:
    "Discover curated fashion, bags, shoes, accessories, new arrivals, in-stock pieces, and sold-out favourites from Amna's Edit.",
  applicationName: "Amna's Edit",
  keywords: [
    "Amna's Edit",
    "fashion catalogue",
    "bags",
    "shoes",
    "accessories",
    "in stock fashion",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Amna's Edit",
    title:
      "Amna's Edit | Curated Fashion & Accessories",
    description:
      "Browse curated fashion, new arrivals, in-stock pieces, and sold-out favourites from Amna's Edit.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Amna's Edit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Amna's Edit | Curated Fashion & Accessories",
    description:
      "Browse curated fashion, new arrivals, in-stock pieces, and sold-out favourites from Amna's Edit.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
