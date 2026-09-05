import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";

import { RevealGrid } from "./RevealGrid";

export interface Review {
  name: string;
  date: string;
  body: string;
  amount: string;
  avatar: string;
  rating?: number;
  /** Backed by an order, or marked verified by an admin. */
  verified: boolean;
}

/**
 * The score is printed only once there are enough reviews for one to mean
 * something; "4,8/5 · 6 đánh giá" reads as a small shop trying to look big.
 * Nothing to switch back on: the line appears by itself past this count.
 */
const MIN_REVIEWS_FOR_SCORE = 100;

/**
 * `pop` wraps each star so it can scale in after its card has risen — the
 * cards' stars only; the summary line's stars stand still.
 */
function Stars({
  filled,
  size = 13,
  pop = false,
}: {
  filled: number;
  size?: number;
  pop?: boolean;
}) {
  return (
    <div className="flex items-center gap-[3px]" aria-label={`${filled} trên 5 sao`}>
      {[0, 1, 2, 3, 4].map((star) => {
        const icon = (
          <Star
            key={star}
            size={size}
            aria-hidden
            className={star < filled ? "fill-amber-400 text-amber-400" : "text-white/15"}
          />
        );
        return pop ? (
          <span key={star} className="reveal-star inline-flex" style={{ ["--s" as string]: star }}>
            {icon}
          </span>
        ) : (
          icon
        );
      })}
    </div>
  );
}

/**
 * The home page's review block, in the reviews page's own card: who said it
 * first (avatar in the accent ring, name, the verified mark when earned, the
 * date), then the stars, then the words as a quotation, then what they paid.
 * Trust comes from the person, so the person leads.
 *
 * No pill over the block: the verified mark on each card says what is
 * verified, and a blanket claim over all four was either untrue or redundant.
 */
export function ReviewsSection({
  reviews,
  summary,
}: {
  reviews: Review[];
  summary?: { rating: number; count: number } | null;
}) {
  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="reviews-heading"
      className="w-full border-t border-white/[0.06] pt-12 lg:pt-16"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2
          id="reviews-heading"
          className="text-2xl font-black uppercase leading-tight tracking-wider sm:text-3xl"
        >
          <span className="text-white">Chiến thắng </span>
          <span className="text-[var(--menzu-accent)]">trong tầm tay bạn</span>
        </h2>
        <p className="text-[13px] text-neutral-400">
          Đánh giá thật từ khách hàng đã giao dịch, admin duyệt trước khi hiện.
        </p>
      </div>

      {/* The motion lmarket.net's testimonial wall has: cards rise in one
          after another when the grid scrolls into view (`.reveal-card`,
          delayed by --i), their stars pop in after, and under the pointer a
          soft accent glow follows the cursor across the card (`.spot-glow`,
          placed at --spot-x/--spot-y by RevealGrid). The card also lifts
          half a step and brightens its edge on hover. `isolate` keeps the
          glow's negative z-index inside the card, between its background
          and its words. */}
      <RevealGrid className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {reviews.map((review, index) => (
          <article
            key={`${review.name}-${review.date}-${index}`}
            data-spot
            style={{ ["--i" as string]: index }}
            className="reveal-card group relative isolate flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04),0_1px_2px_0_rgb(0_0_0/0.4)] transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-white/[0.2] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_8px_24px_-8px_rgb(255_49_88/0.18)] sm:w-[320px] lg:w-auto"
          >
            <span aria-hidden className="spot-glow -z-10" />
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full border-[2.5px] border-[var(--menzu-accent)] p-[2px]">
                <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-neutral-800">
                  {review.avatar ? (
                    <Image src={review.avatar} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="text-sm font-black uppercase text-neutral-400">
                      {review.name.trim().charAt(0) || "?"}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-[14px] font-black text-white">{review.name}</h3>
                    {review.verified ? (
                      <BadgeCheck
                        size={14}
                        aria-label="Tài khoản đã xác minh"
                        className="shrink-0 text-[#0866FF]"
                      />
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-neutral-500">
                    {review.date}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Stars filled={Math.min(5, Math.max(1, review.rating ?? 5))} pop />
                </div>
              </div>
            </div>

            {/* The words, and nothing else, in the middle: React escapes
                them, the bar on the left says "quoted", and the block grows
                to keep every card's foot on one line. */}
            <p className="mt-4 flex-1 border-l-2 border-white/10 pl-3 text-[13.5px] leading-relaxed text-neutral-200 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
              {review.body}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <span className="text-[11px] font-bold text-neutral-500">Giao dịch:</span>
              <span className="text-[13px] font-black tabular-nums text-emerald-400">{review.amount}</span>
            </div>
          </article>
        ))}
      </RevealGrid>

      {/* The score and the count sit on the same line as the way to the rest:
          a reader who has just read four cards is told what the whole says
          and where to read it, in one glance. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {summary && summary.count >= MIN_REVIEWS_FOR_SCORE ? (
          <div className="flex items-center gap-2.5">
            <Stars filled={Math.round(summary.rating)} size={15} />
            <span className="text-sm font-black text-white">
              {summary.rating.toLocaleString("vi-VN", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <span className="text-neutral-500">/5</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              · {summary.count} đánh giá
            </span>
          </div>
        ) : (
          <span />
        )}
        <Link
          href="/feedback"
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          Xem tất cả đánh giá
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
