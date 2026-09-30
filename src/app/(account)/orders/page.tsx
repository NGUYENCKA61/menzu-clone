import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { OrdersList } from "@/components/sites/menzu-lol-f7ae197a/shared/OrdersList";
import { getOrders } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { moneyStamp, shopDay } from "@/lib/stamp";

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

// The receipt's own pill. Colour follows meaning, same palette as the ledgers.
const STATUS_CLASS: Record<string, string> = {
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  CANCELLED: "border-white/10 bg-white/5 text-neutral-400",
  REFUNDED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

/* The card's pill, in menzu's weight. */
const TONE = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  grey: "bg-white/5 text-neutral-400 border-white/10",
} as const;

/**
 * What the pill on a card says, which is not always the order's own status
 * — and nothing at all for the usual outcome. A paid order with nothing
 * pending wore a green "Hoàn thành" until the owner had it taken off
 * (30/09/2026: "ai mà chẳng biết nó hoàn thành"); every card said the same
 * word. Only a state the buyer has to notice gets a pill now.
 *
 * A refused refund leaves the order exactly as it was — paid, key valid — so
 * OrderStatus has nothing to record it with, and nothing should: the sale did
 * not change. What changed is the answer the buyer is waiting on, and that is
 * what the pill is for. An approved refund does move the order to REFUNDED.
 */
function orderBadge(o: {
  status: string;
  refundRejected: boolean;
  refundPending: boolean;
  warrantyOpen: boolean;
}): { label: string; tone: string } | null {
  if (o.status === "PAID") {
    if (o.refundPending) return { label: "Chờ duyệt hoàn tiền", tone: TONE.amber };
    if (o.refundRejected) return { label: "Từ chối hoàn tiền", tone: TONE.rose };
    // A report the shop is still working: the order is paid and stays so, but
    // the buyer is waiting on a fix, and the card should say that.
    if (o.warrantyOpen) return { label: "Đang bảo hành", tone: TONE.amber };
    return null;
  }
  if (o.status === "PENDING") return { label: "Chờ xử lý", tone: TONE.amber };
  if (o.status === "REFUNDED") return { label: "Đã hoàn tiền", tone: TONE.rose };
  if (o.status === "CANCELLED") return { label: "Đã hủy", tone: TONE.grey };
  return { label: STATUS_LABEL[o.status] ?? o.status, tone: TONE.grey };
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    // Near midnight the server clock and the customer are on different
    // days; the shop clock decides which one the order belongs to.
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OrdersPage({
  searchParams,
}: {
  /** `?don=<mã đơn>` opens that order's receipt on arrival. */
  searchParams: Promise<{ don?: string }>;
}) {
  const { don } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Forders");

  const orders = await getOrders(user.id);

  return (
    // No title on the frame: menzu draws "Lịch sử mua hàng" inside the list's
    // own panel, as on /wallet and /transactions.
    <AccountPageFrame crumb="Lịch sử mua">
      <OrdersList
        orders={orders.map((o) => {
          // A paid order either has its review or is asking for one. Not while
          // a refund is pending or was refused, or a warranty report is still
          // open: the product was trouble, and that is no moment to ask for
          // stars.
          const settled =
            o.status === "PAID" && !o.refundPending && !o.refundRejected && !o.warrantyOpen;
          return {
            detail: {
              id: o.id,
              reviewed: o.reviewed,
              code: o.code,
              statusLabel: STATUS_LABEL[o.status] ?? o.status,
              statusClass: STATUS_CLASS[o.status] ?? "border-white/10 bg-white/5 text-neutral-400",
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
              // The value only: a key's clock starts on activation, so no date
              // from the sale belongs under it.
              keys: o.keys.map((key) => ({ value: key.value })),
              keysPending: o.keysPending,
              downloadUrl: o.downloadUrl,
              docsUrl: o.docsUrl,
              login: o.login,
              canRefund: o.canRefund,
              refundBlockedReason: o.refundBlockedReason,
            },
            autoOpen: don === o.code,
            supportHref: `/orders/${o.code}/bao-hanh`,
            refundHref: `/orders/${o.code}/hoan-tra`,
            title: o.isSoftware ? o.productName : `#${o.productCode}`,
            chip: o.packageLabel ?? (o.productRank || null),
            isSoftware: o.isSoftware,
            quantity: o.quantity,
            imageUrl: o.imageUrl,
            stamp: moneyStamp(o.createdAt),
            day: shopDay(o.createdAt),
            at: o.createdAt.getTime(),
            total: o.total,
            status: o.status,
            badge: orderBadge(o),
            review: settled ? { href: `/orders/${o.code}/danh-gia`, reviewed: o.reviewed } : null,
            // Searched by order code, product code, name and rank — what a
            // buyer actually has to hand when hunting for a past purchase.
            haystack: [o.code, o.productCode, o.productName, o.productRank],
          };
        })}
      />
    </AccountPageFrame>
  );
}
