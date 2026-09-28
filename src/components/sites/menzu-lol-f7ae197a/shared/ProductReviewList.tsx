"use client";

import { useState } from "react";
import { Expand } from "lucide-react";

import { pageCount } from "@/lib/paging";

import { FeedbackPager, ReviewAvatar, StarRow, VerifiedBadge } from "./FeedbackBoard";

/** One review as a tool's page lists it, formatted on the server. */
export interface ProductReviewItem {
  /** Already masked for an anonymous reviewer. */
  name: string;
  avatarUrl: string | null;
  anonymous: boolean;
  /** Backed by an order, or marked verified by an admin. */
  verified: boolean;
  rating: number;
  body: string;
  imageUrl: string | null;
  /** "150.000đ", what the order came to; "" prints no figure. */
  amount: string;
  /** "24/9/2026" */
  date: string;
}

/**
 * Reviews per page. Five, because the reviews are one section of a tool's
 * page rather than the page: past five the list starts to push "Sản phẩm
 * tương tự" off the screen, and the page strip is right there for the rest.
 */
const PER_PAGE = 5;

/**
 * A tool's reviews as a list, one ruled row each — the way product reviews
 * read on Shopee or Tiki, which is where the shop's buyers learned to read
 * them — paged in the browser as /feedback pages its own, with the same page
 * strip, avatar ring, seal and stars, so a review looks like itself in both
 * places.
 *
 * A photo shows as a thumbnail that opens the full picture in a new tab, as
 * /feedback's does: small in the row, so one review with a picture does not
 * make the list as tall as the picture.
 */
export function ProductReviewList({
  items,
  anchorId,
}: {
  items: ProductReviewItem[];
  /** The section's id, scrolled back to whenever the page turns. */
  anchorId: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = pageCount(items.length, PER_PAGE);
  const current = Math.min(page, totalPages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  // Back to the heading on every turn: the strip sits under the list, and a
  // shorter next page would otherwise leave the reader looking at whatever
  // comes after it.
  function jumpTo(next: number) {
    setPage(next);
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className="border-t border-white/[0.07]">
        {shown.map((item, i) => (
          <article
            key={`${current}-${i}-${item.date}-${item.name}`}
            // items-start: stretched, the avatar's ring would run the full
            // height of a review with a photo.
            className="flex items-start gap-3.5 border-b border-white/[0.07] px-1 py-5"
          >
            <ReviewAvatar
              name={item.name}
              avatarUrl={item.avatarUrl}
              anonymous={item.anonymous}
              compact
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-sm font-black text-white">{item.name}</h3>
                {item.verified ? <VerifiedBadge /> : null}
                <StarRow rating={item.rating} size={12} />
                <span className="text-[11px] font-semibold text-neutral-500">
                  · {item.date}
                  {item.amount ? (
                    <>
                      {" "}
                      · Giao dịch{" "}
                      <span className="font-black text-emerald-400">{item.amount}</span>
                    </>
                  ) : null}
                </span>
              </div>

              {item.body ? (
                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-neutral-200">
                  {item.body}
                </p>
              ) : (
                <p className="mt-1.5 text-sm italic text-neutral-600">Không để lại nhận xét</p>
              )}

              {item.imageUrl ? (
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group/img relative mt-3 block aspect-[4/3] w-[132px] cursor-zoom-in overflow-hidden rounded-[10px] border border-white/10 bg-neutral-900 transition-colors hover:border-[var(--menzu-accent)]/50"
                >
                  {/* Plain img, as on /feedback: the file already went
                      through sharp on the way in. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt="Ảnh khách gửi kèm đánh giá"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                  />
                  <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    <Expand size={10} aria-hidden />
                    Xem ảnh
                  </span>
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 ? (
        <FeedbackPager current={current} totalPages={totalPages} onJump={jumpTo} />
      ) : null}
    </>
  );
}
