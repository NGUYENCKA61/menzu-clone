import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CrmShell } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmShell";
import { getAdmin } from "@/lib/admin";

/**
 * The CRM app's door. One guard for every screen under /crm, the same way
 * the admin area does it: notFound, not a redirect, so an unauthenticated
 * visitor learns nothing about what lives here. The app is staff-side and
 * says noindex besides.
 */
export const metadata: Metadata = {
  title: { default: "CRM | THICHTHIHACK", template: "%s | CRM THICHTHIHACK" },
  robots: { index: false, follow: false },
  // Its own manifest and icon, so "Thêm vào MH chính" installs the desk as
  // the CRM app — straight into /crm, full screen — not the storefront.
  manifest: "/crm/manifest.webmanifest",
  icons: { icon: "/seo/crm-192.png", apple: "/seo/crm-192.png" },
  appleWebApp: { capable: true, title: "CRM", statusBarStyle: "default" },
};
export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) notFound();

  return <CrmShell adminUsername={admin.username}>{children}</CrmShell>;
}
