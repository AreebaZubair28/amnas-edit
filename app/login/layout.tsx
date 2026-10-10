import type {
  Metadata,
} from "next";
import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title: "Owner Login",
  description:
    "Owner administration login for Amna's Edit.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
