import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";

/**
 * The chrome around a category shelf and every product page under it:
 * header, footer, the contact rail and the phone's bottom tabs.
 *
 * Each of those pages used to draw this itself, so a press on a card threw
 * the header away and drew it again, and — because a dynamic route with no
 * loading boundary gets no prefetch and no skeleton — the old page simply
 * froze for the half-second the next one took, then the whole screen
 * swapped. As a layout the chrome survives the navigation: the header
 * stays put, the page below it gives way to its skeleton at once
 * (loading.tsx beside this file, and one under [productSlug]), and the
 * real page lands when it is ready. The same move the account area made.
 *
 * The shelves and product pages sit on the home page's flat #0f1015 laid
 * over the site's backdrop picture, as menzu's do: long runs of text — a
 * tool's description, its requirements — read on plain ground, and going
 * from the home page to a shelf to a product never changes the ground.
 */
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        {/* Inside <main>, whose z-20 stacking context keeps this -z-10 layer
            above the fixed backdrop and under the page's content. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#0f1015]" />
        <div className="w-full">{children}</div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
