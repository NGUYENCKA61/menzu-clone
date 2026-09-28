import { formatVnd } from "./productData";

/**
 * The price a product page sells at, in a box of its own.
 *
 * Menzu's product page gives the price its own panel above the buttons — a
 * sale's percent and the crossed-out figure on one line, the price in large
 * type, a line of small print under it — so the one number a buyer came for
 * is the first thing the eye lands on in the column. Before this the price
 * was a line of text between the tier chips and the quantity, at the weight
 * of everything around it.
 *
 * Shared by the tool and the account panels, so both kinds of product price
 * the same way.
 */
export function PriceBox({
  price,
  listPrice,
  perDay,
  inStock,
  stockText,
}: {
  /** What the buyer pays. */
  price: number;
  /** The same thing's price off sale, crossed out beside the sale's percent.
   *  Null, or a figure not above `price`, draws no sale line. */
  listPrice: number | null;
  /** What a tier works out at per day; null draws nothing. */
  perDay: number | null;
  inStock: boolean;
  /** "Còn hàng", "Còn 12 acc", "Đã bán": the panel knows which. */
  stockText: string;
}) {
  const was = listPrice !== null && listPrice > price ? listPrice : null;

  return (
    // The figures take whatever the stock pill leaves, their small print
    // wrapping inside it. Only a total too long to sit beside the pill — a
    // big order on a narrow phone — sends the pill to a line of its own, so
    // the two never overlap.
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6">
      <div className="flex-1">
        {was !== null ? (
          <p className="mb-2 flex items-center gap-2.5">
            <span className="rounded-md bg-[var(--menzu-accent)] px-1.5 py-0.5 text-[12px] font-black text-white">
              -{Math.round((1 - price / was) * 100)}%
            </span>
            <span className="text-sm font-semibold text-neutral-500 line-through">
              {formatVnd(was)}đ
            </span>
          </p>
        ) : null}
        {/* The figure large and the đ small and grey beside it, as menzu sets
            its VND: the number is what gets read, the unit only confirms it. */}
        <p className="flex items-baseline gap-1.5">
          <span className="text-[40px] font-black leading-none tracking-tight text-white sm:text-5xl">
            {formatVnd(price)}
          </span>
          <span className="text-lg font-bold text-neutral-500 sm:text-xl">đ</span>
        </p>
        {perDay !== null || was !== null ? (
          // A gap between the two rather than a dot: on a phone the saving
          // wraps under the per-day figure, and a dot left hanging at the end
          // of the line reads as a mistake.
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-neutral-500">
            {perDay !== null ? <span>≈ {formatVnd(perDay)}đ/ngày</span> : null}
            {was !== null ? <span>Tiết kiệm {formatVnd(was - price)}đ</span> : null}
          </p>
        ) : null}
      </div>

      {/* Whether it can be bought at all, in the box's free corner — where
          menzu puts a picture — so it is read with the price, not after it. */}
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
          inStock
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
            : "border-white/10 bg-white/[0.04] text-neutral-400"
        }`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-neutral-600"}`}
        />
        {stockText}
      </span>
    </div>
  );
}
