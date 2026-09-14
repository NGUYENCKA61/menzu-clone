import type { MetadataRoute } from "next";

import { getShopSettings } from "@/lib/settingsStore";

// Rendered per request, like the root layout: it reads the shop's settings,
// and the build machine has no database (see app/layout.tsx).
export const dynamic = "force-dynamic";

/**
 * Web app manifest — what Android and Chrome read when a visitor adds the shop
 * to their home screen.
 *
 * `purpose: "any"` only: the logo is a full-bleed mark, and declaring it
 * "maskable" would let launchers crop into it.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brandName, brandColor } = await getShopSettings();

  return {
    name: `${brandName} — Hack game & tài khoản game`,
    // The home-screen label has room for one word, so the first one wins.
    short_name: brandName.trim().split(/\s+/)[0],
    description:
      "Shop hack game và tài khoản game uy tín — key bản quyền giao tự động, hỗ trợ 24/7.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d12",
    theme_color: brandColor,
    lang: "vi",
    categories: ["games", "shopping"],
    // Two square PNGs cut from the logo (public/seo), at the sizes they
    // really are. Pointing this at the raw 512×552 logo with sizes "any" had
    // Chrome pull the whole 31 KB file on every page load while it judged
    // installability; it now takes the 9 KB one, and the big one only on
    // install. The shop's own logo stays for the header.
    icons: [
      { src: "/seo/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/seo/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
