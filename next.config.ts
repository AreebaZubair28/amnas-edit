import type { NextConfig } from "next";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseHostname = (() => {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
})();

const supabaseOrigin = (() => {
  if (!supabaseUrl) {
    return "";
  }

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return "";
  }
})();

const isDevelopment =
  process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    isDevelopment
      ? " 'unsafe-eval'"
      : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${
    supabaseOrigin
      ? ` ${supabaseOrigin}`
      : ""
  }`,
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment
    ? []
    : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      contentSecurityPolicy.replace(
        /\s{2,}/g,
        " "
      ),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname:
              supabaseHostname,
            pathname:
              "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers:
          securityHeaders,
      },
    ];
  },
};

export default nextConfig;
