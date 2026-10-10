import type {
  Metadata,
} from "next";
import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Read Amna's Edit delivery, in-stock, sold-out, returns, privacy, and terms policies.",
  alternates: {
    canonical: "/policies",
  },
  openGraph: {
    title: "Policies | Amna's Edit",
    description:
      "Read the delivery, availability, returns, privacy, and other policies for Amna's Edit.",
    url: "/policies",
  },
};

export default function PoliciesLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
