import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, PenLine, ShoppingBag, Star } from "lucide-react";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import {
  FeedbackBoard,
  StarRow,
  type FeedbackItem,
} from "@/components/sites/menzu-lol-f7ae197a/shared/FeedbackBoard";
import { getFeedback } from "@/lib/queries";
import { shareCard } from "@/lib/shareCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Đánh giá khách hàng",
    description: "Đánh giá thật từ khách đã mua tại THICHTHIHACK, admin duyệt trước khi hiện.",
    alternates: { canonical: "/feedback" },
    ...(await shareCard({ url: "/feedback" })),
  };
}

export const dynamic = "force-dynamic";

/** "17:56 18/08/2026", in the shop's own timezone whichever machine renders. */
function formatWhen(date: Date): string {
  const time = date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} ${day}`;
}

const BAR_ROWS = [5, 4, 3, 2, 1] as const;

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

  // The summary the header states: the mean, and how the stars fall. Both
  // from the approved rows only, which is all this page ever shows.
  const count = items.length;
  const average = count ? items.reduce((sum, i) => sum + i.rating, 0) / count : 0;
  const perStar = BAR_ROWS.map((star) => items.filter((i) => i.rating === star).length);
  const verifiedCount = items.filter((i) => i.verified).length;

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 bg-[#050508]">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: "Đánh giá khách hàng" }]}
            />

            {/* The same opening the home page's review block makes, so the
                two read as one thing: the pill, the two-tone heading, the
                one-line promise about moderation. */}
            <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <BadgeCheck size={12} aria-hidden />
                Từ khách đã mua và xác minh
              </span>
              <h1 className="text-2xl font-black uppercase leading-tight tracking-wider sm:text-3xl">
                <span className="text-white">Khách hàng </span>
                <span className="text-[var(--menzu-accent)]">nói gì về shop</span>
              </h1>
              <p className="text-[13px] text-neutral-400">
                Đánh giá thật từ khách đã giao dịch, admin duyệt trước khi hiện. Có thể yêu cầu
                đối chiếu lịch sử giao dịch để xác minh.
              </p>
            </div>

            {/* The numbers, and the two doors in: the free-form composer for
                anyone, and Lịch sử mua for a buyer, whose review then carries
                the order as its proof. */}
            <section className="mt-8 grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-1">
                <span className="text-5xl font-black leading-none tabular-nums text-white">
                  {count
                    ? average.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : "—"}
                </span>
                <div className="flex flex-col gap-1">
                  <StarRow rating={Math.round(average)} size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                    {count} đánh giá · {verifiedCount} đã xác minh
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {BAR_ROWS.map((star, index) => {
                  const n = perStar[index];
                  const width = count ? Math.round((n / count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-[11px] font-bold text-neutral-400">
                      <span className="flex w-8 items-center gap-1 tabular-nums">
                        {star}
                        <Star size={10} aria-hidden className="fill-amber-400 text-amber-400" />
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${width}%` }}
                          aria-hidden
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums">{n}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
                <Link
                  href="/feedback/submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
                >
                  <PenLine size={14} />
                  Viết đánh giá
                </Link>
                <Link
                  href="/orders"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--menzu-accent)]/40 bg-transparent px-5 text-[11px] font-black uppercase tracking-wider text-[#ddd] transition-colors hover:bg-[var(--menzu-accent)]/10 hover:text-white"
                >
                  <ShoppingBag size={14} className="text-[var(--menzu-accent)]" />
                  Đánh giá đơn đã mua
                </Link>
              </div>
            </section>

            <div className="mt-8">
              <FeedbackBoard items={items} />
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
