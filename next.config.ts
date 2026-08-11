import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * No Content-Security-Policy here on purpose. Next injects inline bootstrap
 * scripts for hydration, so a real CSP needs a per-request nonce threaded
 * through middleware — adding a static one with 'unsafe-inline' would look
 * like protection while granting exactly what CSP exists to prevent.
 */
const SECURITY_HEADERS = [
  // Stop browsers second-guessing declared content types, which is how a
  // user-uploaded file gets executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin to other sites, the full URL only to ourselves — account
  // codes and ?next= targets should not leak into third-party referer logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The shop uses none of these; denying them removes the prompt entirely.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Clickjacking: nothing here is meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    // The catalogue art is wide-but-short; serving AVIF first saves roughly a
    // third over WebP again on the browsers that take it.
    formats: ["image/avif", "image/webp"],
    // A year — asset filenames carry the account code and are replaced, not
    // edited, so a stale cache entry cannot show the wrong image.
    minimumCacheTTL: 31536000,
  },

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Hashed build output and immutable catalogue art. Everything under
        // /sites/ is content-addressed by account code and never edited.
        source: "/sites/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
