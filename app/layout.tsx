import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amna's Edit | Curated Luxury",
  description: "A curated catalogue of bags, shoes, jewelry and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}