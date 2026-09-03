import type { Metadata } from "next";

import { getShopSettings } from "@/lib/settingsStore";

type ShareImage = string | { url: string; alt?: string; width?: number; height?: number };

/**
 * The Open Graph and Twitter blocks every public page spreads into its
 * metadata.
 *
 * Next does not merge a page's `openGraph` into the layout's field by field:
 * the page's object replaces the layout's whole. So a page that set only
 * `openGraph.url` went out with no og:image, og:type, og:site_name or
 * og:locale, and Facebook, Zalo and Telegram drew its link as bare text —
 * which is what happened to the home page and every category page. Title and
 * description are left out unless given: Next fills them from the page's own
 * `title` and `description`, so each page states them once.
 */
export async function shareCard(page: {
  /** The page's canonical path, which is also its og:url. The root layout has none. */
  url?: string;
  /** Article pages say so; everything else is a website. */
  type?: "website" | "article";
  /** The picture on the card; the shop's hero banner when the page has none. */
  image?: ShareImage;
  /** Only when the card should read differently from the browser tab. */
  title?: string;
  description?: string;
  publishedTime?: string;
}): Promise<Pick<Metadata, "openGraph" | "twitter">> {
  const { brandName, heroBanner } = await getShopSettings();
  const image: ShareImage = page.image ?? {
    url: heroBanner,
    width: 1200,
    height: 630,
    alt: `${brandName} — shop hack game và tài khoản game`,
  };
  const imageUrl = typeof image === "string" ? image : image.url;
  const words = {
    ...(page.title ? { title: page.title } : {}),
    ...(page.description ? { description: page.description } : {}),
  };
  const base = {
    locale: "vi_VN",
    siteName: brandName,
    ...(page.url ? { url: page.url } : {}),
    images: [image],
    ...words,
  };

  return {
    openGraph:
      page.type === "article"
        ? { ...base, type: "article", publishedTime: page.publishedTime }
        : { ...base, type: "website" },
    twitter: { card: "summary_large_image", images: [imageUrl], ...words },
  };
}
