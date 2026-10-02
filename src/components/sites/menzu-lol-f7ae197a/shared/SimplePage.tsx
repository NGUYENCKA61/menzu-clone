import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { Breadcrumb } from "./Breadcrumb";

interface SimplePageProps {
  title: string;
  crumb: string;
  children: ReactNode;
  /** A red icon in front of the title, as the account pages wear one, in
   *  place of the row-heading bar. */
  icon?: LucideIcon;
  /** "home": the home page's flat #0f1015 (the header's tone, under the
   *  shelves and product pages too) instead of the utility pages' near-black.
   *  The basket wears it (the owner, 01/10/2026: "màu nền trang giỏ hàng đồng
   *  bộ với trang chủ"). */
  ground?: "black" | "home";
  /** Something at the far end of the title row — the wiki's search box. It
   *  drops under the title on a phone. */
  action?: ReactNode;
  /** The steps between "Trang chủ" and this page, when there are more than
   *  one — a wiki article sits under the wiki. Replaces `crumb`. */
  crumbs?: { label: string; href?: string }[];
  /** A line under the title — an article's shelf, date and reads. */
  subtitle?: ReactNode;
  /** "normal": the title as written, not in capitals — an article's title is
   *  a sentence ("Menzu Mail Là Gì ?"), as menzu prints it. */
  titleCase?: "upper" | "normal";
  /** False: no red bar in front of the title. A wiki article's heading
   *  stands alone, as menzu sets one (the owner, 02/10/2026: "bỏ dấu |"). */
  titleBar?: boolean;
}

/** Standard inner-page chrome: header, breadcrumb, heading, footer. */
export function SimplePage({
  title,
  crumb,
  children,
  icon: Icon,
  ground = "black",
  action,
  crumbs,
  subtitle,
  titleCase = "upper",
  titleBar = true,
}: SimplePageProps) {
  return (
    // Opaque, covering the fixed PageBackdrop artwork — the original keeps its
    // utility pages (wiki, cart, trade…) on plain black; a page can take the
    // home page's tone instead.
    <div
      className={`min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 ${
        ground === "home" ? "bg-[#0f1015]" : "bg-[#050508]"
      }`}
    >
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, ...(crumbs ?? [{ label: crumb }])]}
            />

            {/* The row headings' red mark in front of the title, and a neutral
                rule under it — the same opening every home-page row makes. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  {Icon ? (
                    <Icon size={28} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
                  ) : titleBar ? (
                    <span aria-hidden className="h-6 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
                  ) : null}
                  <h1
                    className={`text-2xl sm:text-3xl font-black text-white ${
                      titleCase === "upper" ? "uppercase tracking-wider" : "leading-tight"
                    }`}
                  >
                    {title}
                  </h1>
                </div>
                {subtitle ? <div className="mt-3">{subtitle}</div> : null}
              </div>
              {action}
            </div>

            {children}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
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
