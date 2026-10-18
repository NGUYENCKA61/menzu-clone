import Link from "next/link";
import { BadgeCheck, Star, VenetianMask } from "lucide-react";

import { sentenceCase, titleCase, withoutNewWord } from "@/lib/displayCase";

import { AvatarPhoto } from "./AvatarPhoto";
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
  /** The tool an order-backed review was left for, and the game it is for
   *  (its category's name); null for a free-form one. */
  purchase?: { product: string; href: string; game?: string } | null;
  /** Left by a buyer who hid their name ("Khách hàng ẩn danh"). */
  anonymous?: boolean;
}

/**
 * The game a category is for, as a buyer calls it: "Hack Delta Force" is
 * "Delta Force", "Hack Đột Kích CFVN - CF4VN" is "Đột Kích CFVN". The shop's
 * "Hack" goes, and whatever follows a dash.
 */
function gameName(category: string): string {
  const name = category.replace(/^\s*(tool\s+)?hack\s+/i, "").split(" - ")[0].trim();
  return titleCase(withoutNewWord(name || category));
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
export function Stars({
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
 * One review, in the reviews page's own card: who said it first (avatar in
 * the accent ring, name, the verified mark when earned, the date), then the
 * stars, then the words as a quotation, then what they paid. Trust comes
 * from the person, so the person leads. Shared by the home page's block and
 * a tool page's own reviews; both lay it out inside a RevealGrid, which
 * `index` staggers.
 *
 * The motion lmarket.net's testimonial wall has: cards rise in one after
 * another when the grid scrolls into view (`.reveal-card`, delayed by --i),
 * their stars pop in after, and under the pointer a soft accent glow follows
 * the cursor across the card (`.spot-glow`, placed at --spot-x/--spot-y by
 * RevealGrid). The card also lifts half a step and brightens its edge on
 * hover. `isolate` keeps the glow's negative z-index inside the card,
 * between its background and its words.
 */
export function ReviewCard({ review, index }: { review: Review; index: number }) {
  return (
    <article
      data-spot
      style={{ ["--i" as string]: index }}
      className="reveal-card group relative isolate flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04),0_1px_2px_0_rgb(0_0_0/0.4)] lift-card hover:-translate-y-1 hover:border-white/[0.2] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_8px_24px_-8px_rgb(255_49_88/0.18)] sm:w-[320px] lg:w-auto"
    >
      <span aria-hidden className="spot-glow -z-10" />
      <div className="flex items-start gap-3">
        {/* A thin grey ring where a red one sat: four red rings pulled the
            eye to the faces rather than the words (18/10/2026). */}
        <div className="shrink-0 rounded-full border border-white/15 p-[2px]">
          {/* The reviews page's faces (FeedbackBoard's ReviewAvatar): a mask
              on pale grey for a buyer who hid their name, else the photo over
              the initial, the initial left when the photo will not load (the
              owner, 18/10/2026: "lấy vài cái icon avatar trang kia qua coi
              đi nhìn vậy xấu quá"). */}
          <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-neutral-800">
            {review.anonymous ? (
              <span className="grid h-full w-full place-items-center bg-[#D1D5DB]">
                <VenetianMask aria-hidden className="h-5 w-5 text-neutral-700 opacity-80" />
              </span>
            ) : (
              <>
                <span className="font-display text-sm font-bold uppercase text-mist">
                  {review.name.trim().charAt(0) || "?"}
                </span>
                {review.avatar ? <AvatarPhoto src={review.avatar} size={40} /> : null}
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {/* The name has the line to itself and the date rides beside the
              stars: next to the date, "Khách hàng ẩn danh" was cut to
              "Khách hàng ẩ…" (18/10/2026). */}
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
          <div className="mt-1.5 flex items-center gap-2">
            <Stars filled={Math.min(5, Math.max(1, review.rating ?? 5))} pop />
            <span className="text-[10px] font-semibold text-neutral-500">{review.date}</span>
          </div>
          {/* What was bought, under the stars, as the reviews page prints it
              (the owner, 01/10/2026: "bổ sung thông tin mua key bản gì game
              gì"; on the home cards 18/10/2026: "thử đi cả 2"): the tool's
              name alone ("bỏ chữ đã mua chỉ ghi dòng đỏ thôi"), the red having
              gone to the game tag ("nhãn tên game thì tô đỏ"). After turns in
              red, white and the site's grey, a light grey between white and
              grey, the one the Hot trending lead's blurb wears ("xám sáng",
              "thử"); white under the pointer. A screen reader still hears "Đã
              mua", and the pointer gets the whole name when it is cut short. */}
          {review.purchase ? (
            <p className="mt-1.5 flex min-w-0 items-center text-[12px]">
              <Link
                href={review.purchase.href}
                aria-label={`Đã mua ${sentenceCase(review.purchase.product)}`}
                title={sentenceCase(review.purchase.product)}
                className="min-w-0 truncate font-semibold text-[#c7c9d1] transition-colors hover:text-white"
              >
                {sentenceCase(review.purchase.product)}
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      {/* The words, and nothing else, below the person: React escapes them,
          the bar on the left says "quoted". The card ends here: the line
          with what the buyer paid ("Trị giá giao dịch") came off the home
          cards, the tool's name and the verified mark being the proof (the
          owner, 18/10/2026: "xóa bỏ cái trị giá giao dịch thử"); /feedback
          keeps it. */}
      <p className="mt-4 flex-1 border-l-2 border-white/10 pl-3 text-[13.5px] leading-relaxed text-neutral-200 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
        {review.body}
      </p>

      {/* The game the bought tool is for, in the card's bottom left corner
          (the owner, 18/10/2026: "góc trái dưới cùng trái card đánh giá là
          tên game đã thuê hack thử"). */}
      {review.purchase?.game ? (
        <div className="mt-4 flex min-w-0">
          {/* Words only, in the shop's red ("nhãn tên game thì tô đỏ"): the
              gamepad that led them and the rounded box round them came off
              ("bỏ icon tay cầm game đi", "bỏ card bo tên game đi"). 12px, the
              size of the tool's name line. */}
          <span className="min-w-0 max-w-full truncate text-[12px] font-semibold text-[var(--menzu-accent)]">
            {gameName(review.purchase.game)}
          </span>
        </div>
      ) : null}
    </article>
  );
}

/**
 * The home page's review block: four ReviewCards, then the score and the way
 * to the rest.
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
    // The hairline above runs the width of the window, not the content
    // (see FaqSection); the home page's wrapper clips the overflow.
    <section
      aria-labelledby="reviews-heading"
      className="relative w-full pt-12 lg:pt-16 before:absolute before:left-1/2 before:top-0 before:h-px before:w-screen before:-translate-x-1/2 before:bg-white/[0.06]"
    >
      {/* LAB, back for a look (the owner, 18/10/2026: "quay về bản căn giữa
          chữ đỏ tui coi thử chiến thắng và faq"): the main site's centred
          block, the title in capitals with its second half in the shop's red
          and no red bar, at the other titles' 20px and 24px from sm, balanced
          so a phone's two lines do not leave "BẠN" alone; the line under it
          centred, and the way to the rest under the cards. The red-bar
          version, left aligned with "Xem tất cả" on its right, is 655590b7. */}
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
        <h2
          id="reviews-heading"
          className="row-heading text-balance text-xl font-black uppercase tracking-wider text-frost sm:text-2xl"
        >
          Chiến thắng{" "}
          <span className="text-[var(--menzu-accent)]">trong tầm tay bạn</span>
        </h2>
        <p className="text-[15px] text-mist">
          Đánh giá thật từ khách hàng đã giao dịch, admin duyệt trước khi hiện.
        </p>
      </div>

      <RevealGrid className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {reviews.map((review, index) => (
          <ReviewCard key={`${review.name}-${review.date}-${index}`} review={review} index={index} />
        ))}
      </RevealGrid>

      {/* Under the cards, centred like the title: the score and the count
          once there are enough of them to mean something
          (MIN_REVIEWS_FOR_SCORE), then the way to the rest. */}
      <div className="mt-6 flex flex-col items-center gap-3">
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
            <span className="text-[13px] text-mist">
              {summary.count} đánh giá
            </span>
          </div>
        ) : null}
        <Link
          href="/feedback"
          className="text-[14px] font-medium text-mist underline-offset-4 transition-colors hover:text-frost hover:underline"
        >
          Xem tất cả đánh giá
        </Link>
      </div>
    </section>
  );
}
