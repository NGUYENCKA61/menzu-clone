import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import {
  FeedbackBoard,
  type FeedbackItem,
} from "@/components/sites/menzu-lol-f7ae197a/shared/FeedbackBoard";
import { getFeedback } from "@/lib/queries";
import { shareCard } from "@/lib/shareCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Đánh giá khách hàng",
    alternates: { canonical: "/feedback" },
    ...(await shareCard({ url: "/feedback" })),
  };
}
export const dynamic = "force-dynamic";

/** "17:56 18/08/2026" — built by hand so server and client can never disagree
 *  about locale quirks. */
function formatWhen(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getHours())}:${p(date.getMinutes())} ${p(date.getDate())}/${p(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

/**
 * The customer-reviews wall, rebuilt from the original: emerald header with
 * the review count and the write button, the "100% từ khách đã giao dịch"
 * pledge, then the filterable list. This page runs emerald where the rest of
 * the shop runs red — the original paints its trust surfaces green.
 */
export default async function FeedbackPage() {
  const reviews = await getFeedback(500);

  const items: FeedbackItem[] = reviews.map((r) => ({
    name: r.name,
    avatarUrl: r.avatarUrl,
    body: r.body,
    amount: r.amount,
    rating: r.rating,
    service: r.service,
    imageUrl: r.imageUrl,
    anonymous: r.anonymous,
    verified: r.verified,
    when: formatWhen(r.createdAt),
    ts: r.createdAt.getTime(),
  }));

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 bg-[var(--menzu-bg)]">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: "Đánh giá khách hàng" }]}
            />

            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--menzu-accent)]/10 flex items-center justify-center border border-[var(--menzu-accent)]/20 shrink-0 mt-0.5">
                  <Star className="w-5 h-5 text-[var(--menzu-accent)] fill-[var(--menzu-accent)]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                    Đánh Giá
                  </h1>
                  <p className="text-neutral-500 text-[10px] mt-1">
                    {items.length} lượt đánh giá từ khách hàng
                  </p>
                </div>
              </div>
              <Link
                href="/feedback/submit"
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] text-white font-black px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl whitespace-nowrap text-[10px] sm:text-xs uppercase tracking-wider w-fit mt-0.5 transition-colors"
              >
                <Star size={13} className="fill-white sm:w-3.5 sm:h-3.5" />
                Viết đánh giá
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 bg-[var(--menzu-accent)]/5 border border-[var(--menzu-accent)]/20 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 mb-6">
              <ShieldCheck size={16} className="text-[var(--menzu-accent)] shrink-0" />
              <p className="text-[11px] sm:text-sm text-neutral-300 leading-normal">
                <span className="font-black text-[var(--menzu-accent)]">100% đánh giá</span> được tổng
                hợp từ khách đã giao dịch. Có thể yêu cầu đối chiếu lịch sử giao dịch để xác
                minh.
              </p>
            </div>

            <FeedbackBoard items={items} />
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
