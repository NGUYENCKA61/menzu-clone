import type { MetadataRoute } from "next";

import { getShopSettings } from "@/lib/settingsStore";

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
    name: `${brandName} — Shop Account Valorant`,
    // The home-screen label has room for one word, so the first one wins.
    short_name: brandName.trim().split(/\s+/)[0],
    description:
      "Shop account Valorant uy tín — acc tự chọn, dịch vụ cày thuê và nạp VP.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d12",
    theme_color: brandColor,
    lang: "vi",
    categories: ["games", "shopping"],
    icons: [
      { src: brandLogo, sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: brandLogo, sizes: "512x512", type: "image/webp", purpose: "any" },
    ],
  };
}
