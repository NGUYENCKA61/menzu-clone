import type { Metadata } from "next";

import { categoryHref } from "@/lib/routes";
import { listCategories } from "@/lib/queries";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";

// The layout's template appends the shop's name.
export const metadata: Metadata = {
  title: "Danh sách danh mục",
  alternates: { canonical: "/categories" },
  openGraph: { url: "/categories" },
};

/**
 * The catalogue is read from Postgres at request time. Without this Next.js
 * prerenders the page at build and a newly added category would never appear.
 */
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-8">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Danh sách danh mục" },
              ]}
            />

            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-6 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                  DANH SÁCH DANH MỤC
                </h1>
              </div>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {categories.map((c) => (
                  <a
                    key={c.slug}
                    href={categoryHref(c.slug)}
                    className="group flex flex-col justify-between gap-3 bg-[#101114] rounded-[15px] overflow-hidden border border-white/[0.08] hover:border-[var(--menzu-accent)]/50 hover:-translate-y-1 hover:shadow-[0_15px_40px_#00000088] transition-all duration-[250ms] p-5 min-h-[120px]"
                  >
                    <span className="text-sm font-black uppercase text-white group-hover:text-[var(--menzu-accent)] transition-colors tracking-widest leading-snug">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                      {c.productCount} sản phẩm
                    </span>
                  </a>
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
