import Link from "next/link";
import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "./Breadcrumb";

interface SimplePageProps {
  title: string;
  crumb: string;
  children: ReactNode;
}

/** Standard inner-page chrome: header, breadcrumb, heading, footer. */
export function SimplePage({ title, crumb, children }: SimplePageProps) {
  return (
    // Opaque site-black, covering the fixed PageBackdrop artwork — the
    // original keeps its utility pages (wiki, cart, trade…) on plain black.
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 bg-[#050508]">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: crumb }]}
            />

            <div className="flex items-center justify-between mb-8 pb-3 border-b border-indigo-500/20">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                {title}
              </h1>
            </div>

            {children}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}

/**
 * Placeholder body for routes whose live markup was never captured — the
 * browser session ended before they could be opened.
 *
 * These pages exist so the links across the site resolve instead of 404ing,
 * and they carry the real site chrome. The body deliberately says the content
 * is not built rather than showing invented copy, which would be
 * indistinguishable from a finished clone at a glance.
 */
export function NotCapturedYet({ note }: { note?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
      <p className="text-xl font-bold text-white mb-2">TRANG ĐANG ĐƯỢC XÂY DỰNG</p>
      <p className="text-neutral-400 max-w-[520px]">
        {note ??
          "Nội dung của trang này chưa được sao chép từ bản gốc. Vui lòng quay lại sau."}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
