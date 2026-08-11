import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { listServices } from "@/lib/queries";

export const metadata: Metadata = { title: "Menzu Valorant | Dịch Vụ" };
export const dynamic = "force-dynamic";

/** The two groups the live /services page renders, in its order. */
const SECTIONS = [
  { heading: "Dịch Vụ Game", gameSide: true },
  { heading: "Dịch Vụ Khác", gameSide: false },
] as const;

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: "Dịch Vụ" }]}
            />

            {/* Two sections, as the live page splits them. The heading is
                per-section rather than one page-wide "Dịch Vụ" title. */}
            {SECTIONS.map(({ heading, gameSide }) => {
              const items = services.filter((s) => s.isGameService === gameSide);
              if (items.length === 0) return null;

              return (
                <section key={heading} className="mb-12 last:mb-0">
                  <div className="flex items-center justify-between mb-8 pb-3 border-b border-indigo-500/20">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                      {heading}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {items.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        className="group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-3 sm:p-4"
                      >
                        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4 border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                          {s.imageUrl ? (
                            <Image
                              src={s.imageUrl}
                              alt={s.name}
                              fill
                              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : null}
                        </div>

                        <h3 className="text-center text-sm sm:text-base font-black uppercase text-white mb-4 group-hover:text-indigo-400 transition-colors tracking-widest drop-shadow-md">
                          {s.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-3 sm:mb-4 mt-auto">
                          <div className="bg-[#0a0a0d] rounded-lg p-2 flex flex-col items-center border border-indigo-500/10">
                            <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase">
                              {s.priceLabel === "Liên hệ" ? "Báo giá" : "Giá từ"}
                            </span>
                            <span className="text-[10px] sm:text-sm font-black text-amber-500 leading-none text-center">
                              {s.priceLabel ?? "Liên hệ"}
                            </span>
                          </div>
                          <div className="bg-[#0a0a0d] rounded-lg p-2 flex flex-col items-center border border-indigo-500/10">
                            <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase">
                              Đã xong
                            </span>
                            <span className="text-[10px] sm:text-sm font-black text-green-500 leading-none">
                              {s.doneCount} đơn
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
