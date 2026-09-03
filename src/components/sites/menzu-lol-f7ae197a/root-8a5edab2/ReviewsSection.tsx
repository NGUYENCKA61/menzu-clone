import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";

export interface Review {
  name: string;
  date: string;
  body: string;
  amount: string;
  avatar: string;
  /** 1–5; a review from before ratings were kept counts as five. */
  rating?: number;
}

const VERIFIED_BADGE_TEXT = "Tài khoản đã xác minh";

/** Five stars, the first `filled` of them lit. */
function Stars({ filled, size = 14 }: { filled: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${filled} trên 5 sao`}>
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
 * The reviews on the home page, under the strip of figures.
 *
 * Laid out the way the reference shop lays out its Trustpilot wall: a small
 * pill and a centred heading, then a row of cards that each lead with the
 * stars, carry the words in the middle, and sign off with who said them.
 * The transaction the review came from sits in the corner where the
 * reference shows its source badge — it is the shop's own proof.
 *
 * Four across on a desktop; on anything narrower the row scrolls sideways
 * rather than stacking a screen's worth of cards under the fold.
 */
export function ReviewsSection({
  reviews,
  summary,
}: {
  reviews: Review[];
  /** The average of approved reviews and how many there are; null when none. */
  summary?: { rating: number; count: number } | null;
}) {
  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="reviews-heading"
      className="w-full border-t border-white/[0.06] pt-12 lg:pt-16"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
          <BadgeCheck size={12} aria-hidden />
          Từ khách đã mua và xác minh
        </span>
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
            className="flex w-[280px] shrink-0 snap-start flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.16] sm:w-[320px] lg:w-auto"
          >
            <Stars filled={Math.min(5, Math.max(1, review.rating ?? 5))} />

            {/* The words, and nothing else, in the middle: React escapes them,
                the quotes are typographic, and the block grows to keep every
                card's foot on one line. */}
            <p className="flex-1 text-[13.5px] leading-relaxed text-neutral-200">
              “{review.body}”
            </p>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {review.avatar ? (
                    <Image src={review.avatar} alt="" fill sizes="32px" className="object-cover" />
                  ) : (
                    <span className="text-[12px] font-black uppercase text-neutral-400">
                      {review.name.trim().charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="truncate text-[13px] font-bold text-white">{review.name}</h3>
                    <BadgeCheck
                      size={12}
                      aria-label={VERIFIED_BADGE_TEXT}
                      className="shrink-0 text-emerald-400"
                    />
                  </div>
                  <span className="block text-[10px] font-semibold text-neutral-500">{review.date}</span>
                </div>
              </div>
              <span className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400">
                {review.amount}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
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
