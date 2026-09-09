import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";

/**
 * The chrome around every signed-in account screen: header, footer, the
 * contact rail and the phone's bottom tabs.
 *
 * It used to be drawn by each page through AccountPageFrame, which meant it
 * was thrown away and drawn again on every click between /profile, /wallet,
 * /orders and the rest — and, because none of those routes had a loading
 * boundary, the old page simply froze for the half-second the next one took.
 * As a layout it survives the navigation: the header stays put, the page
 * below it swaps to its skeleton at once (loading.tsx beside this file), and
 * the real page slides in when it is ready. Prefetching, which Next skips on
 * a dynamic route with no loading boundary, works again for the same reason.
 *
 * Opaque site-black on the root: it paints over the fixed z-[-1] backdrop,
 * because the account screens sit on plain black, not over the storefront
 * picture.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 bg-[#050508]">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">{children}</div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
