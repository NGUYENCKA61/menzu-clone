import Link from "next/link";
import { MessageSquareText, PenLine, Star } from "lucide-react";

import { RevealGrid } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/RevealGrid";
import {
  ReviewCard,
  Stars,
  type Review,
} from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ReviewsSection";

/**
 * Below this many reviews the average is left out: "5,0/5" over one review
 * says less than the review itself, which is right there.
 */
const MIN_FOR_SCORE = 3;

export interface ProductReviewsData {
  /** The newest few, already masked and formatted for the card. */
  reviews: Review[];
  /** Every approved review of this tool. */
  count: number;
  average: number | null;
  /**
   * The signed-in buyer's own way in: their latest paid order for this tool
   * that has no review yet. Null for a guest, a non-buyer, or a buyer who
   * has reviewed every order.
   */
  reviewHref: string | null;
}

/**
 * A tool's own reviews, between its description and "Sản phẩm tương tự".
 *
 * Only reviews of this tool — the ones written from a receipt for it — and
 * nothing of the shop's general praise, on the owner's word: a reader on
 * this page is asking about this tool. With none yet the block stays, as a
 * quiet note that says where reviews come from, so the first buyer to write
 * one knows where it will land.
 */
export function ProductReviews({ data }: { data: ProductReviewsData }) {
  const { reviews, count, average, reviewHref } = data;
  const score = average !== null && count >= MIN_FOR_SCORE ? average : null;

  const writeButton = reviewHref ? (
    <Link
      href={reviewHref}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--menzu-accent)] px-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
    >
      <PenLine size={14} aria-hidden />
      Viết đánh giá
    </Link>
  ) : null;

  return (
    <section
      aria-labelledby="product-reviews-heading"
      className="mx-auto w-full max-w-[1320px] px-4 pb-14 lg:px-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <h2
            id="product-reviews-heading"
            className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-white sm:text-xl"
          >
            <MessageSquareText size={22} aria-hidden className="shrink-0 text-[var(--menzu-accent)]" />
            Đánh giá sản phẩm
          </h2>
          {count > 0 ? (
            <span className="flex items-center gap-2 text-xs font-bold text-neutral-400">
              {score !== null ? (
                <>
                  <Stars filled={Math.round(score)} size={13} />
                  <span className="text-white">
                    {score.toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    <span className="text-neutral-500">/5</span>
                  </span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              {count} đánh giá
            </span>
          ) : null}
        </div>
        {reviews.length > 0 ? writeButton : null}
      </div>

      {reviews.length > 0 ? (
        <>
          <RevealGrid className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
            {reviews.map((review, index) => (
              <ReviewCard key={`${review.name}-${review.date}-${index}`} review={review} index={index} />
            ))}
          </RevealGrid>
          {count > reviews.length ? (
            <p className="mt-4 text-center text-xs text-neutral-500">
              Đang hiện {reviews.length} đánh giá mới nhất trong tổng số {count}.
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-400/10 text-amber-400">
            <Star size={20} className="fill-current" aria-hidden />
          </span>
          <p className="text-sm font-bold text-white">Chưa có đánh giá nào cho sản phẩm này</p>
          <p className="max-w-md text-xs leading-relaxed text-neutral-400">
            Khách đã mua có thể đánh giá ngay trong Lịch sử mua. Đánh giá được admin duyệt trước khi
            hiện ở đây.
          </p>
          {writeButton ? <div className="mt-2">{writeButton}</div> : null}
        </div>
      )}
    </section>
  );
}
