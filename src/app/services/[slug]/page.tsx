import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { getService, listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  return { title: `Menzu Valorant | ${service?.name ?? "Dịch Vụ"}` };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const service = await getService(slug);
  if (!service) notFound();

  const others = (await listServices()).filter((s) => s.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Dịch Vụ", href: "/services" },
                { label: service.name },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900">
                {service.imageUrl ? (
                  <Image
                    src={service.imageUrl}
                    alt={service.name}
                    fill
                    priority
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-4">
                  {service.name}
                </h1>

                <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                    Giá
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {service.priceLabel ?? "Liên hệ"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                    Đã hoàn thành
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {service.doneCount} đơn
                  </span>
                </div>

                <div className="flex flex-col gap-3 mt-7">
                  {/* The live site routes service enquiries through Zalo rather
                      than an on-site checkout, so this is a contact CTA — not a
                      purchase button that would imply an order flow that does
                      not exist. */}
                  <a
                    href="#"
                    className="w-full rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black py-4 uppercase tracking-widest text-sm transition-colors flex items-center justify-center"
                  >
                    Liên hệ đặt dịch vụ
                  </a>
                  <a
                    href="/service-orders"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 text-xs uppercase tracking-widest transition-colors flex items-center justify-center"
                  >
                    Xem đơn dịch vụ của tôi
                  </a>
                </div>
              </div>
            </div>

            {others.length > 0 ? (
              <div className="mt-20 border-t border-white/5 pt-12">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-8">
                  Dịch Vụ Khác
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {others.map((s) => (
                    <a
                      key={s.slug}
                      href={`/services/${s.slug}`}
                      className="group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-4"
                    >
                      <span className="text-center text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors tracking-widest">
                        {s.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
