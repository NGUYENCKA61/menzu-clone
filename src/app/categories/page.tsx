import type { Metadata } from "next";

import { listCategories } from "@/lib/queries";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";

export const metadata: Metadata = {
  title: "Menzu Valorant | Danh sách danh mục",
};

/**
 * The catalogue is read from Postgres at request time. Without this Next.js
 * prerenders the page at build and a newly added category would never appear.
 */
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-8">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Danh sách danh mục" },
              ]}
            />

            <div className="flex items-center justify-between mb-8 pb-3 border-b border-indigo-500/20">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                DANH SÁCH DANH MỤC
              </h1>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {categories.map((c) => (
                  <a
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="group flex flex-col justify-between gap-3 bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-5 min-h-[120px]"
                  >
                    <span className="text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors tracking-widest leading-snug">
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

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
