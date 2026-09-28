import { Check, Package } from "lucide-react";

/**
 * Whether a product can be bought, under its price: a parcel, the word, and a
 * tick when it can.
 *
 * A parcel rather than the dot this line wore before, which made it the twin
 * of the detection pill above the title — the same green dot beside the same
 * green word — so "Còn hàng" could be read as a second detection state. The
 * parcel says stock before the word is read. Shared by the tool and account
 * panels, so both kinds of product say it the same way.
 */
export function StockLine({
  inStock,
  label,
}: {
  inStock: boolean;
  /** "Còn hàng", "Còn 12 acc", "Tạm hết hàng", "Đã bán": the panel knows which. */
  label: string;
}) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-semibold">
      <Package size={16} aria-hidden className="shrink-0 text-neutral-400" />
      <span className={inStock ? "text-emerald-400" : "text-neutral-500"}>
        {label}
      </span>
      {/* The tick only when it can be bought: beside "Tạm hết hàng" it would
          read as the shop being pleased about it. */}
      {inStock ? (
        <Check size={15} aria-hidden className="-ml-0.5 shrink-0 text-emerald-400" />
      ) : null}
    </p>
  );
}
