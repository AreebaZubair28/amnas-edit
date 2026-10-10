import type {
  Metadata,
} from "next";
import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Read Amna's Edit delivery, preorder, in-stock, returns, privacy, and terms policies.",
  alternates: {
    canonical: "/policies",
  },
  openGraph: {
    title: "Policies | Amna's Edit",
    description:
      "Read the delivery, preorder, returns, privacy, and other policies for Amna's Edit.",
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
