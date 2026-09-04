import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountEmpty } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountShell";
import { ListSearch } from "@/components/sites/menzu-lol-f7ae197a/shared/ListSearch";
import { OrderDetailModal } from "@/components/sites/menzu-lol-f7ae197a/shared/OrderDetailModal";
import { OrderReviewTag } from "@/components/sites/menzu-lol-f7ae197a/shared/OrderReview";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { dayHeading, dayTime } from "@/lib/dayGroups";
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

/**
 * What the badge on a row says, which is not always the order's own status.
 *
 * A refused refund leaves the order exactly as it was — paid, key valid — so
 * OrderStatus has nothing to record it with, and nothing should: the sale did
 * not change. What changed is the answer the buyer is waiting on, and that is
 * what the badge is for. An approved refund is a different matter and does
 * move the order to REFUNDED, so it needs no special case here.
 */
function orderBadge(o: {
  status: string;
  refundRejected: boolean;
  refundPending: boolean;
}): { label: string; className: string } {
  const fallback = {
    label: STATUS_LABEL[o.status] ?? o.status,
    className:
      STATUS_CLASS[o.status] ?? "border-white/10 bg-white/5 text-neutral-400",
  };
  if (o.status !== "PAID") return fallback;
  if (o.refundPending) {
    return {
      label: "Chờ duyệt hoàn tiền",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    };
  }
  if (o.refundRejected) {
    return {
      label: "Từ chối hoàn tiền",
      className: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    };
  }
  return fallback;
}

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
  // One clock reading for the whole render, so a page drawn across midnight
  // cannot label two rows of the same day differently.
  const now = new Date();

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
            // The heading this row sits under. The list arrives newest first,
            // so the days come out newest first too.
            group: dayHeading(o.createdAt, now),
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
                refundHref={`/orders/${o.code}/hoan-tra`}
                className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 outline-none transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 sm:flex-row sm:items-center sm:gap-4"
                order={{
                  id: o.id,
                  reviewed: o.reviewed,
                  code: o.code,
                  statusLabel: STATUS_LABEL[o.status] ?? o.status,
                  statusClass:
                    STATUS_CLASS[o.status] ??
                    "border-white/10 bg-white/5 text-neutral-400",
                  paid: o.status === "PAID",
                  refunded: o.status === "REFUNDED",
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
                  isPool: o.isPool,
                  packageLabel: o.packageLabel,
                  productRank: o.productRank,
                  keys: o.keys.map((key) => key.value),
                  keysPending: o.keysPending,
                  downloadUrl: o.downloadUrl,
                  docsUrl: o.docsUrl,
                  login: o.login,
                  canRefund: o.canRefund,
                  refundBlockedReason: o.refundBlockedReason,
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
                    {/* The clock, not the date: the day is written once over
                        the group this row sits in, and repeating it on every
                        line was the noisiest thing on the page. */}
                    <span className="text-[11px] font-semibold text-neutral-500">
                      Đơn {o.code} · {dayTime(o.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="text-sm font-black text-white">
                    {formatVnd(o.total)}đ
                  </span>
                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${orderBadge(o).className}`}
                  >
                    {orderBadge(o).label}
                  </span>
                  {/* A paid order either has its review or is asking for
                      one; the tag opens a small box of its own, not the
                      receipt. */}
                  {o.status === "PAID" ? (
                    <OrderReviewTag orderId={o.id} reviewed={o.reviewed} />
                  ) : null}
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
