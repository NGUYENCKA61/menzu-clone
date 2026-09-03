import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The Content-Security-Policy below has no script-src on purpose. Next injects
 * inline bootstrap scripts for hydration, so a real script policy needs a
 * per-request nonce threaded through middleware — a static one with
 * 'unsafe-inline' would look like protection while granting exactly what CSP
 * exists to prevent. The directives that need no nonce are still worth
 * having: they close the <base>-tag and plugin routes an injected fragment
 * could take, and back X-Frame-Options in browsers that read only CSP.
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
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // "X-Powered-By: Next.js" on every response names the framework to anyone
  // matching CVEs against fingerprints, and buys the shop nothing.
  poweredByHeader: false,

  /**
   * Hosts allowed to load `next dev`'s JavaScript.
   *
   * Next blocks `/_next/static/*` for any origin but localhost, so opening the
   * site from a phone or a second machine on the LAN served the server-rendered
   * HTML and then silently refused every chunk: the page looked right and no
   * button worked, because React never hydrated. The block is logged only in
   * this terminal, so from the other device there is nothing at all to read.
   *
   * The whole 192.168.1.x range rather than one address, because the machine's
   * own IP comes from DHCP and changes on its own. This affects `next dev`
   * only — a production build never reads it — and it grants nothing beyond
   * fetching dev assets to devices already inside the home network.
   */
  allowedDevOrigins: ["192.168.1.154", "192.168.1.*"],

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
