import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/seo";

const LOGO = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.webp";

/**
 * Web app manifest — what Android and Chrome read when a visitor adds the shop
 * to their home screen.
 *
 * `purpose: "any"` only: the logo is a full-bleed mark, and declaring it
 * "maskable" would let launchers crop into it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Shop Account Valorant`,
    short_name: "Menzu",
    description:
      "Shop account Valorant uy tín — acc tự chọn, dịch vụ cày thuê và nạp VP.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d12",
    theme_color: "#7C3AED",
    lang: "vi",
    categories: ["games", "shopping"],
    icons: [
      { src: LOGO, sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: LOGO, sizes: "512x512", type: "image/webp", purpose: "any" },
    ],
  };
}
