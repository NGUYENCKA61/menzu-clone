import { ShoppingCart } from "lucide-react";
import Link from "next/link";

/**
 * The basket, beside the bell.
 *
 * Wears the bell's chrome exactly — same square, same border, same badge —
 * because the two sit shoulder to shoulder and any difference between them
 * reads as a mistake rather than as a distinction. A link rather than a
 * button: the basket has a page of its own, and a header icon that opens a
 * panel over the page it is already on would be a second cart to keep in step.
 *
 * The count is server-rendered, so it is right on first paint; "Thêm vào giỏ"
 * refreshes the route it sits on, which is what keeps it right afterwards.
 */
export function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Giỏ hàng, ${count} sản phẩm` : "Giỏ hàng"}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      <ShoppingCart size={16} />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
