import { NextResponse } from "next/server";

/**
 * The CRM's own manifest, so the desk installs as its own app — "THICHTHIHACK
 * CRM" on the home screen, opening straight into /crm full-screen — instead
 * of inheriting the storefront's manifest and landing on the shop. A route
 * handler, not a page, so the layout's admin guard does not stand in front
 * of it: it holds nothing but a name and two icons.
 */

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      name: "THICHTHIHACK CRM",
      short_name: "CRM",
      description: "Bàn chăm sóc khách của THICHTHIHACK",
      start_url: "/crm",
      scope: "/crm",
      display: "standalone",
      background_color: "#f6f6f7",
      theme_color: "#ffffff",
      icons: [
        { src: "/seo/crm-192.png", sizes: "192x192", type: "image/png" },
        { src: "/seo/crm-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
