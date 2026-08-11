import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Menzu Valorant | Shop Account Valorant Uy Tín",
  description:
    "Menzu Valorant — shop account Valorant uy tín, giá tốt. Acc tự chọn, check skin kho đồ, build kho đồ, thu acc và dịch vụ game.",
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
