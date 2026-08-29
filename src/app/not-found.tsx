import type { Metadata } from "next";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { NotFoundContent } from "@/components/sites/menzu-lol-f7ae197a/shared/NotFoundContent";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  // A 404 has nothing worth indexing, and letting crawlers keep it costs real
  // crawl budget on a catalogue whose stock turns over constantly.
  robots: { index: false, follow: true },
};

/**
 * Reached by mistyped account codes and stale external links — sold accounts
 * keep their pages, so this is not the sold-out path.
 *
 * Deliberately not wrapped in SimplePage: the live 404 has no breadcrumb and
 * no page-title bar, just the centred block.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <NotFoundContent />
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
