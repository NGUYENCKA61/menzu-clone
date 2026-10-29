"use client";

import { GAP, pageRange, pageStrip } from "@/lib/paging";

/**
 * The admin lists' pager, re-cut for client-side state: same chips, same
 * "Hiển thị 1–10 / 134" line on the left, same sliding number strip with the
 * first and last page always reachable — but driven by a useState page
 * instead of ?page= links, because these ledgers filter in the browser.
 * White since the 30/10/2026 rebuild, matching the kit's PageLink.
 */

const SHAPE =
  "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold";
// Only the chips that go somewhere answer a press. The current page and the
// greyed end arrows are drawn from the same shape and must not sink.
const CHIP_CURRENT = `${SHAPE} border-zinc-900 bg-zinc-900 text-white`;
const CHIP_IDLE = `${SHAPE} press border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900`;
const CHIP_OFF = `${SHAPE} cursor-default border-zinc-200 text-zinc-300`;

/**
 * Bring a list's head back into view after a page change. The pager sits
 * under the list, so the press that changes the page is made from the foot
 * of the screen while the ten new rows land above it — the viewport stays
 * where it was and the reader is looking at the tail of a page they have
 * not read. Smooth, unless the reader asked for less motion; the target
 * carries scroll-mt so the fixed header does not cover its first line.
 */
export function scrollListTop(node: HTMLElement | null) {
  node?.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

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
      <p className="text-[12px] tabular-nums text-zinc-500">
        Hiển thị {range.from}–{range.to} / {total.toLocaleString("vi-VN")} {unit}
      </p>

      {pageCount > 1 ? (
        <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-1.5">
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
                className="px-1 text-[12px] text-zinc-400"
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
