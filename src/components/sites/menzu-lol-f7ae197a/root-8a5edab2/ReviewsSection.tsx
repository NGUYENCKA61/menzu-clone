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
    <section aria-labelledby="reviews-heading" className="w-full">
      {/* The heading every product row wears — the red bar and the uppercase
          title on the left, the way to the rest on the right — so this block
          lines up with the rows above it instead of centring itself apart
          from them, which read as a second page starting mid-scroll. */}
      <div className="mb-8 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
          <h2
            id="reviews-heading"
            className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl"
          >
            Chiến thắng <span className="text-[var(--menzu-accent)]">trong tầm tay bạn</span>
          </h2>
        </div>
        <Link
          href="/feedback"
          className="group flex items-center gap-1 border-b border-neutral-700 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:border-[var(--menzu-accent)] hover:text-white sm:text-xs"
        >
          <span className="hidden sm:inline">Xem tất cả</span>
          <span className="sm:hidden">Xem thêm</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* The motion lmarket.net's testimonial wall has: cards rise in one
          after another when the grid scrolls into view (`.reveal-card`,
          delayed by --i), their stars pop in after, and under the pointer a
          soft accent glow follows the cursor across the card (`.spot-glow`,
          placed at --spot-x/--spot-y by RevealGrid). The card also lifts
          half a step and brightens its edge on hover. `isolate` keeps the
          glow's negative z-index inside the card, between its background
          and its words. */}
      <RevealGrid className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
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

      {/* The score and the count under the cards, once there are enough
          reviews for the figure to mean something. */}
      {summary && summary.count >= MIN_REVIEWS_FOR_SCORE ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
        </div>
      ) : null}
    </section>
  );
}
