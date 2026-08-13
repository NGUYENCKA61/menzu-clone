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
    // WebP only, and first in the list, which is what decides the format —
    // Next takes the first entry the browser's Accept header matches. AVIF
    // does encode smaller at the same quality, and it was preferred here for
    // that reason; the sign-in artwork is judged on sharpness rather than
    // bytes, and its encoder is gentler with fine detail at high quality.
    formats: ["image/webp"],

    // Required from Next 16: only qualities on this list may be requested, so
    // that a stranger cannot make the server re-encode the catalogue at every
    // value from 1 to 100. 75 is the default the storefront uses; 95 is for
    // the sign-in panel, which is a single large picture behind a form and the
    // one place where softness would be visible.
    qualities: [75, 95],
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
