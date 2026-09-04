import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";

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

function Stars({ filled, size = 13 }: { filled: number; size?: number }) {
  return (
    <div className="flex items-center gap-[3px]" aria-label={`${filled} trên 5 sao`}>
      {[0, 1, 2, 3, 4].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden
          className={star < filled ? "fill-amber-400 text-amber-400" : "text-white/15"}
        />
      ))}
    </div>
  );
}

/**
 * The home page's review block, in the reviews page's own card: who said it
 * first (avatar in the accent ring, name, the verified mark when earned, the
 * date), then the stars, then the words as a quotation, then what they paid.
 * Trust comes from the person, so the person leads.
 *
 * The pill over the block says every review below is from a verified buyer,
 * and it appears only when that is so: the four newest shown must all carry
 * the mark. As buyers start reviewing from their orders it comes back on its
 * own, with the proof right under it.
 */
export function ReviewsSection({
  reviews,
  summary,
}: {
  reviews: Review[];
  summary?: { rating: number; count: number } | null;
}) {
  if (reviews.length === 0) return null;
  const allVerified = reviews.every((review) => review.verified);

  return (
    <section
      aria-labelledby="reviews-heading"
      className="w-full border-t border-white/[0.06] pt-12 lg:pt-16"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        {allVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0866FF]/40 bg-[#0866FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
            <BadgeCheck size={12} aria-hidden />
            Từ khách đã mua và xác minh
          </span>
        ) : null}
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
        {summary ? (
          <div className="mt-1 flex items-center gap-2.5">
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
        ) : null}
      </div>

      <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {reviews.map((review, index) => (
          <article
            key={`${review.name}-${review.date}-${index}`}
            className="flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.16] sm:w-[320px] lg:w-auto"
          >
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
                  <Stars filled={Math.min(5, Math.max(1, review.rating ?? 5))} />
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
              <span className="text-[13px] font-black tabular-nums text-sky-400">{review.amount}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
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
