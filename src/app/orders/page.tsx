import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";
import { ListSearch } from "@/components/sites/menzu-lol-f7ae197a/shared/ListSearch";
import { OrderDetailModal } from "@/components/sites/menzu-lol-f7ae197a/shared/OrderDetailModal";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getOrders } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Lịch sử mua hàng",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Đã thanh toán",
  PENDING: "Chờ xử lý",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

// Every status used to wear the PAID green, which read as "fine" on a
// cancelled order. Colour now follows meaning, same palette as the ledgers.
const STATUS_CLASS: Record<string, string> = {
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  CANCELLED: "border-white/10 bg-white/5 text-neutral-500",
  REFUNDED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

function shortDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Forders");

  const orders = await getOrders(user.id);

  return (
    <AccountPageFrame
      title="Lịch sử mua hàng"
      subtitle="Đơn đã thanh toán, kèm key hoặc tài khoản đăng nhập"
      crumb="Lịch sử mua"
    >
      {
        <ListSearch
          emptyState={
            <AccountEmpty
              title="Chưa có đơn hàng nào"
              body="Bạn chưa mua tài khoản nào trên hệ thống"
              ctaLabel="Mua Ngay"
              ctaHref="/categories"
            />
          }
          placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
          unit="đơn hàng"
          frameTitle="Đơn hàng của bạn"
          frameHint="Bấm vào đơn để xem key hoặc tài khoản đăng nhập"
          rows={orders.map((o) => ({
            key: o.code,
            // Searched by order code, product code and name — what a buyer
            // actually has to hand when hunting for a past purchase.
            haystack: [o.code, o.productCode, o.productName, o.productRank],
            node: (
              // The whole row — picture and title included — opens the
              // receipt; the product link lives inside it. The modal owns
              // the row so the click, the keyboard and the focus return all
              // live in one client component.
              <OrderDetailModal
                supportHref="/feedback"
                className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 outline-none transition-colors hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 sm:flex-row sm:items-center sm:gap-4"
                order={{
                  code: o.code,
                  statusLabel: STATUS_LABEL[o.status] ?? o.status,
                  statusClass:
                    STATUS_CLASS[o.status] ??
                    "border-white/10 bg-white/5 text-neutral-400",
                  paid: o.status === "PAID",
                  date: shortDate(o.createdAt),
                  total: o.total,
                  listPrice: o.listPrice,
                  quantity: o.quantity,
                  productName: o.productName,
                  productCode: o.productCode,
                  productHref: o.productHref,
                  categoryName: o.categoryName,
                  imageUrl: o.imageUrl,
                  isSoftware: o.isSoftware,
                  packageLabel: o.packageLabel,
                  productRank: o.productRank,
                  keys: o.keys.map((key) => key.value),
                  keysPending: o.keysPending,
                  downloadUrl: o.downloadUrl,
                  docsUrl: o.docsUrl,
                  login: o.login,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                    {o.imageUrl ? (
                      <Image
                        src={o.imageUrl}
                        alt={o.productCode}
                        fill
                        sizes="96px"
                        className="object-cover object-[85%_center]"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white transition-colors group-hover:text-[var(--menzu-accent)]">
                        {o.isSoftware ? o.productName : `#${o.productCode}`}
                      </span>
                      {/* A tier says more about a software order than a rank
                          copied off an account row ever did. */}
                      {(o.packageLabel ?? o.productRank) ? (
                        <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                          {o.packageLabel ?? o.productRank}
                        </span>
                      ) : null}
                      {o.quantity > 1 ? (
                        <span className="text-[10px] font-black tabular-nums text-neutral-400">
                          ×{o.quantity}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-500">
                      Đơn {o.code} · {shortDate(o.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="text-sm font-black text-white">
                    {formatVnd(o.total)}đ
                  </span>
                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                      STATUS_CLASS[o.status] ??
                      "border-white/10 bg-white/5 text-neutral-400"
                    }`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </OrderDetailModal>
            ),
          }))}
          emptyLabel="Không tìm thấy đơn hàng nào khớp."
        />
      }
    </AccountPageFrame>
  );
}
