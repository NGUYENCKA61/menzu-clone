import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { CartView } from "@/components/sites/menzu-lol-f7ae197a/shared/CartView";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { db } from "@/lib/db";
import { productHref } from "@/lib/routes";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Giỏ Hàng",
  // Nothing here is worth indexing and it is per-visitor by nature.
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

/**
 * The basket.
 *
 * Software only. Accounts are one of a kind and are still paid for on their
 * own page — holding one here would either reserve it against every other
 * shopper or promise something that could be gone by checkout.
 */
export default async function CartPage() {
  const user = await getCurrentUser();

  const items = user
    ? await db.cartItem.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              code: true,
              slug: true,
              name: true,
              imageUrl: true,
              category: { select: { slug: true } },
            },
          },
          package: { select: { label: true, price: true } },
        },
      })
    : [];

  if (items.length === 0) {
    return (
      <SimplePage title="Giỏ Hàng Của Bạn" crumb="Giỏ hàng">
        <div className="w-full flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-5">
            <ShoppingCart size={26} className="text-neutral-600" />
          </div>

          <p className="text-xl font-bold text-white mb-2">Giỏ hàng của bạn đang trống</p>
          <p className="text-sm text-neutral-400 max-w-[460px] leading-relaxed">
            {user
              ? "Chọn một phần mềm và thêm gói bạn muốn vào giỏ. Tài khoản game thì mua thẳng trên trang sản phẩm."
              : "Hãy đăng nhập để xem giỏ hàng của bạn."}
          </p>

          <Link
            href={user ? "/categories" : "/login?next=/cart"}
            className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
          >
            {user ? "Quay lại cửa hàng" : "Đăng nhập"}
            <ArrowRight size={14} />
          </Link>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage title="Giỏ Hàng Của Bạn" crumb="Giỏ hàng">
      <CartView
        lines={items.map((i) => ({
          id: i.id,
          code: i.product.code,
          href: productHref(i.product.category.slug, i.product.slug),
          name: i.product.name ?? i.product.code,
          packageLabel: i.package.label,
          unitPrice: Number(i.package.price),
          quantity: i.quantity,
          imageUrl: i.product.imageUrl,
        }))}
      />
    </SimplePage>
  );
}
