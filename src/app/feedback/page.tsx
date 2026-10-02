import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import {
  TRUST_NOTE,
  TRUST_NOTE_ICON,
  TRUST_NOTE_LEAD,
  TRUST_NOTE_TEXT,
} from "@/components/sites/menzu-lol-f7ae197a/shared/trustNoteLook";
import {
  FeedbackBoard,
  type FeedbackItem,
} from "@/components/sites/menzu-lol-f7ae197a/shared/FeedbackBoard";
import { dayStamp } from "@/lib/dayGroups";
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

/**
 * The customer-reviews wall: the review count and the write button, the
 * "100% từ khách đã giao dịch" pledge, then the filterable list.
 *
 * The opening is SimplePage's, as on the status, wiki and community pages
 * (the owner, 02/10/2026: "đồng bộ về cỡ chữ và kích thước … làm hết thử"):
 * the same breadcrumb, title, rule under it and caption size, the write
 * button where the wiki keeps its search box.
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
    when: dayStamp(r.createdAt),
    ts: r.createdAt.getTime(),
    purchase: r.purchase,
  }));

  return (
    <SimplePage
      title="Đánh giá"
      crumb="Đánh giá"
      icon={Star}
      ground="home"
      subtitle={
        <p className="text-[13px] text-neutral-400">{items.length} lượt đánh giá từ khách hàng</p>
      }
      action={
        <Link
          href="/feedback/submit"
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] text-white font-black px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl whitespace-nowrap text-[10px] sm:text-xs uppercase tracking-wider w-fit transition-colors"
        >
          <Star size={13} className="fill-white sm:w-3.5 sm:h-3.5" />
          Viết đánh giá
        </Link>
      }
    >
      <div className={TRUST_NOTE}>
        <ShieldCheck size={16} className={TRUST_NOTE_ICON} />
        <p className={TRUST_NOTE_TEXT}>
          <span className={TRUST_NOTE_LEAD}>100% đánh giá</span> được tổng
          hợp từ khách đã giao dịch. Có thể yêu cầu đối chiếu lịch sử giao dịch để xác
          minh.
        </p>
      </div>

      <FeedbackBoard items={items} />
    </SimplePage>
  );
}
