import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { Preloader } from "@/components/sites/menzu-lol-f7ae197a/shared/Preloader";
import { SupportWidgetHost } from "@/components/sites/menzu-lol-f7ae197a/shared/SupportWidgetHost";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const headingNow = localFont({
  src: "../../public/sites/menzu-lol-f7ae197a/shared/fonts/headingnow-extrabold.ttf",
  variable: "--font-headingnow",
  weight: "800",
  display: "swap",
});

/**
 * Written from the shop's own name so a rebrand in Cấu hình → Nhận diện
 * reaches the search results too, not only the header.
 */
function describe(brandName: string): string {
  return `${brandName} — shop hack game và tài khoản game uy tín. Hack Valorant, CS2, PUBG, Liên Quân: key bản quyền giao tự động, cập nhật liên tục, hỗ trợ 24/7.`;
}

/**
 * Built per request so the shop name set in Cấu hình → Nhận diện reaches the
 * browser tab and the share cards, not just the header.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { brandName, heroBanner } = await getShopSettings();
  const headline = `${brandName} | Hack Game & Tài Khoản Game Uy Tín`;
  const DESCRIPTION = describe(brandName);

  return {
  // Required for Open Graph and canonical tags: Next resolves every relative
  // URL below against this, and without it they are emitted as-is and ignored.
  metadataBase: new URL(SITE_URL),
  title: {
    default: headline,
    // Child routes set a bare title; the brand is appended here so no page has
    // to repeat it.
    template: `%s | ${brandName}`,
  },
  description: DESCRIPTION,
  applicationName: brandName,
  keywords: [
    "hack game",
    "hack valorant",
    "hack cs2",
    "hack pubg",
    "tool game",
    "key bản quyền",
    "shop hack game",
    "mua acc game",
    "acc valorant",
  ],
  // No canonical here on purpose. Metadata is inherited, so a canonical set
  // on the root layout is emitted on every page that does not override it —
  // which told Google that /categories, /thong-bao and the rest were all
  // copies of the home page, and asked it to drop them from the index. Each
  // page names its own address; the home page's is on the home page.
  openGraph: {
    type: "website",
    locale: "vi_VN",
    // og:url is inherited the same way and is left to the pages for the same
    // reason; a share card pointing everything at "/" is the same mistake.
    siteName: brandName,
    title: headline,
    description: DESCRIPTION,
    images: [
      {
        url: heroBanner,
        width: 1200,
        height: 630,
        alt: `${brandName} — shop hack game và tài khoản game`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: headline,
    description: DESCRIPTION,
    images: [heroBanner],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { brandColor, brandName, siteBackground } = await getShopSettings();
  // Emitted only when the shop has actually picked a colour, so an install
  // that never opens the Nhận diện tab renders byte-identical markup to the
  // capture. The value is validated as a plain hex before it is ever stored,
  // so nothing else can reach this stylesheet.
  const brandOverride =
    brandColor.toLowerCase() === DEFAULT_SETTINGS.brandColor.toLowerCase()
      ? null
      : `:root{--brand:${brandColor};--brand-dark:color-mix(in oklab, ${brandColor} 85%, black)}`;

  return (
    <html
      lang="vi"
      className={`${inter.variable} ${headingNow.variable} h-full antialiased overflow-y-scroll dark`}
    >
      <body className="min-h-full flex flex-col">
        {brandOverride ? <style>{brandOverride}</style> : null}
        {/* Fixed behind every page (z-[-1]); each shop's own picture, dimmed.
            Site-wide here rather than per-page so it covers the whole app. */}
        <PageBackdrop src={siteBackground} />
        {/* First in the stream so the cover paints before anything under it.
            Lives outside {children} like the widget below: client navigation
            must not remount it, or it would flash on every route change. */}
        <Preloader brand={{ name: brandName }} />
        {children}
        {/* Site-wide, as on the live site — outside {children} so it survives
            navigation without remounting and losing its open state. */}
        <SupportWidgetHost />
      </body>
    </html>
  );
}
