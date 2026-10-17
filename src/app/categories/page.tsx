import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";

import { getCatalogueTiles } from "@/lib/homeRows";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { CaseText } from "@/components/sites/menzu-lol-f7ae197a/shared/CaseText";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { RowTile } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { getShopSettings } from "@/lib/settingsStore";
import { shareCard } from "@/lib/shareCard";

// The layout's template appends the shop's name. The description is the
// page's own: it used to inherit the home page's sentence, one of twenty
// pages telling a search engine the same thing (the owner's SEO review,
// 13/10/2026).
export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getShopSettings();
  return {
    title: "Danh sách danh mục",
    description: `Tất cả danh mục hack game và tài khoản game đang bán tại ${brandName}, chọn game để xem tool và giá.`,
    alternates: { canonical: "/categories" },
    ...(await shareCard({ url: "/categories" })),
  };
}

/**
 * The catalogue is read from Postgres at request time. Without this Next.js
 * prerenders the page at build and a newly added category would never appear.
 */
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const tiles = await getCatalogueTiles();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 bg-panel transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* SimplePage's column and padding, so the title sits where every
              other page's does (the owner, 13/10/2026, UI consistency
              review). The page keeps its own shell for the backdrop artwork
              that shows through it. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Danh sách danh mục" },
              ]}
            />

            {/* SimplePage's heading, mark for mark: the page's own glyph in
                the accent where the red bar was, the grid the bottom nav's
                "Danh mục" wears (the owner, 13/10/2026, UI consistency
                review). */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={28} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
                  <h1 className="text-[24px] font-black leading-tight text-frost sm:text-[30px]">
                    <CaseText text="DANH SÁCH DANH MỤC" />
                  </h1>
                </div>
              </div>
            </div>

            {tiles.length > 0 ? (
              // The home page's game list, tile for tile: the same picture
              // tiles in RowSearch's grid, two a line on a phone, three from
              // md, four from lg (the owner, 13/10/2026, UI consistency
              // review). A game with nothing on sale comes last, faded but
              // still a link, and lights up under the pointer.
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {tiles.map(({ card, onSale }) => (
                  <div
                    key={card.href}
                    className={
                      onSale
                        ? undefined
                        : "opacity-45 transition-opacity hover:opacity-90 focus-within:opacity-90"
                    }
                  >
                    <RowTile card={card} />
                  </div>
                ))}
              </div>
            ) : (
              /* The live site showed this empty state during the clone; it stays
                 as the genuine fallback when the catalogue has no categories. */
              <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <p className="text-xl font-bold text-white mb-2">
                  CHƯA CÓ DANH MỤC NÀO
                </p>
                <p className="text-neutral-400">
                  Danh sách danh mục đang trống. Vui lòng quay lại sau.
                </p>
              </div>
            )}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
