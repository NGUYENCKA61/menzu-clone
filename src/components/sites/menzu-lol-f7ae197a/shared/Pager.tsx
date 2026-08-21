"use client";

import { GAP, pageRange, pageStrip } from "@/lib/paging";

/**
 * The admin lists' pager, re-cut for client-side state: same chips, same
 * "Hiển thị 1–10 / 134" line on the left, same sliding number strip with the
 * first and last page always reachable — but driven by a useState page
 * instead of ?page= links, because these ledgers filter in the browser.
 *
 * Chip chrome is copied verbatim from the admin's PageLink so the member
 * pages and the admin never disagree about what a pager looks like.
 */

const SHAPE =
  "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";
const CHIP_CURRENT = `${SHAPE} border-rose-500/60 bg-rose-500/15 text-rose-400`;
const CHIP_IDLE = `${SHAPE} border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white`;
const CHIP_OFF = `${SHAPE} border-white/[0.06] text-neutral-700 cursor-default`;

export function Pager({
  page,
  pageCount,
  onSelect,
  total,
  pageSize,
  unit,
}: {
  /** Zero-based current page. */
  page: number;
  pageCount: number;
  onSelect: (page: number) => void;
  /** How many rows exist across all pages — feeds the "Hiển thị" line. */
  total: number;
  pageSize: number;
  /** The noun the count is counting: "lệnh", "giao dịch". */
  unit: string;
}) {
  if (total === 0) return null;

  // lib/paging speaks one-based; this component's callers speak zero-based.
  const current = page + 1;
  const range = pageRange(current, pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-[12px] text-neutral-500 tabular-nums">
        Hiển thị {range.from}–{range.to} / {total.toLocaleString("vi-VN")} {unit}
      </p>

      {pageCount > 1 ? (
        <nav aria-label="Phân trang" className="flex items-center gap-1.5">
          {page === 0 ? (
            <span aria-hidden className={CHIP_OFF}>
              ‹
            </span>
          ) : (
            <button
              type="button"
              aria-label="Trang trước"
              onClick={() => onSelect(page - 1)}
              className={CHIP_IDLE}
            >
              ‹
            </button>
          )}

          {pageStrip(current, pageCount).map((n, index) =>
            n === GAP ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1 text-[12px] text-neutral-700"
              >
                {GAP}
              </span>
            ) : (
              <button
                key={n}
                type="button"
                aria-label={`Trang ${n}`}
                aria-current={n === current ? "page" : undefined}
                onClick={() => onSelect(n - 1)}
                className={n === current ? CHIP_CURRENT : CHIP_IDLE}
              >
                {n}
              </button>
            ),
          )}

          {page >= pageCount - 1 ? (
            <span aria-hidden className={CHIP_OFF}>
              ›
            </span>
          ) : (
            <button
              type="button"
              aria-label="Trang sau"
              onClick={() => onSelect(page + 1)}
              className={CHIP_IDLE}
            >
              ›
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
