import type { Metadata } from "next";

import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";

export const metadata: Metadata = {
  title: "Menzu Valorant | Danh sách danh mục",
};

export default function CategoriesPage() {
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

            {/* The live site is genuinely empty here right now — this is the real
                state, not a fetch failure. The backend will populate it later. */}
            <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <p className="text-xl font-bold text-white mb-2">
                CHƯA CÓ DANH MỤC NÀO
              </p>
              <p className="text-neutral-400">
                Danh sách danh mục đang trống. Vui lòng quay lại sau.
              </p>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
