import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";

export const metadata: Metadata = {
  title: "Giỏ Hàng",
  // Nothing here is worth indexing and it is per-visitor by nature.
  robots: { index: false, follow: true },
};

/**
 * Cart route, reachable from the account sidebar.
 *
 * Always empty, and deliberately so — this shop sells one-of-a-kind accounts
 * paid for straight from the wallet, so "Mua Ngay" completes the purchase on
 * the product page and nothing is ever staged here. The live site keeps the
 * route in the same state; it exists so the sidebar link resolves.
 */
export default function CartPage() {
  return (
    <SimplePage title="Giỏ Hàng Của Bạn" crumb="Giỏ hàng">
      <div className="w-full flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-5">
          <ShoppingCart size={26} className="text-neutral-600" />
        </div>

        <p className="text-xl font-bold text-white mb-2">Giỏ hàng của bạn đang trống</p>
        <p className="text-sm text-neutral-400 max-w-[460px] leading-relaxed">
          Hãy quay lại cửa hàng để lựa chọn các tài khoản Valorant cực phẩm nhé!
        </p>

        <Link
          href="/categories"
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          Quay lại cửa hàng
          <ArrowRight size={14} />
        </Link>
      </div>
    </SimplePage>
  );
}
