import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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

const DESCRIPTION =
  "Menzu Valorant — shop account Valorant uy tín, giá tốt. Acc tự chọn, check skin kho đồ, build kho đồ, thu acc và dịch vụ game.";

export const metadata: Metadata = {
  // Required for Open Graph and canonical tags: Next resolves every relative
  // URL below against this, and without it they are emitted as-is and ignored.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Menzu Valorant | Shop Account Valorant Uy Tín",
    // Child routes set a bare title; the brand is appended here so no page has
    // to repeat it.
    template: "%s | Menzu Valorant",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "account valorant",
    "acc valorant giá rẻ",
    "shop acc valorant",
    "acc valorant tự chọn",
    "mua acc valorant",
    "nạp vp valorant",
    "menzu valorant",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Menzu Valorant | Shop Account Valorant Uy Tín",
    description: DESCRIPTION,
    images: [
      {
        url: "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/bannermung9-7-26.webp",
        width: 1200,
        height: 630,
        alt: "Menzu Valorant — shop account Valorant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menzu Valorant | Shop Account Valorant Uy Tín",
    description: DESCRIPTION,
    images: ["/sites/menzu-lol-f7ae197a/root-8a5edab2/images/upload/bannermung9-7-26.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${headingNow.variable} h-full antialiased overflow-y-scroll dark`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
