import type { NextConfig } from "next";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "https://*.supabase.co";
const isDev = process.env.NODE_ENV === "development";

// A static CSP (no per-request nonce) so catalog pages can stay cached and
// statically rendered. 'unsafe-inline' scripts are needed for Next's inline
// bootstrap without a nonce; the rest still shuts off the big risks —
// plugins, <base> hijacking, framing, and loading from unknown origins.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  `img-src 'self' blob: data: ${supabaseOrigin} https://p.typekit.net`,
  "font-src 'self' data: https://use.typekit.net",
  `media-src 'self' blob: ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin} https://vitals.vercel-insights.com https://va.vercel-scripts.com${isDev ? " ws:" : ""}`,
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    // AVIF first: noticeably smaller than WebP for product/hero photography, which is most of each page's bytes.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Admin pages and the tokenized quote page are never worth caching in a shared cache.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/quote/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
