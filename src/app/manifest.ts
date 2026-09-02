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
  const { brandName, brandLogo, brandColor } = await getShopSettings();

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
    // One entry, with the sizes it genuinely covers. It was declared twice at
    // two exact sizes it is not — the shop uploads one logo, and telling a
    // launcher a 400px file is 512×512 gets it rendered blurry rather than
    // rescaled from something better. "any" lets the browser pick and scale.
    icons: [{ src: brandLogo, sizes: "any", type: "image/webp", purpose: "any" }],
  };
}
