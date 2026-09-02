import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { RefundRequestForm } from "@/components/sites/menzu-lol-f7ae197a/shared/RefundRequestForm";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { dayTime } from "@/lib/dayGroups";
import {
  refundBlockedReason,
  refundDeadline,
  REFUND_STATUS,
  REFUND_WINDOW_DAYS,
} from "@/lib/refundRequests";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Yêu cầu hoàn trả",
  // One buyer's own order. Followed, not indexed, like the rest of the
  // account area.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6";
const LABEL =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function stamp(date: Date): string {
  return `${date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${dayTime(date)}`;
}

/**
 * The refund request screen for one order.
 *
 * Its own page rather than a panel in the receipt: what makes a request
 * answerable is a description and a screenshot, and both want more room than a
 * modal footer has. The order is restated in full at the top so the buyer is
 * never asked to describe something they can no longer see.
 *
 * Every refusal is decided here as well as in the route. A disabled button is
 * a courtesy, not a rule.
 */
export default async function RefundRequestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${code}/hoan-tra`)}`);
  }

  // Scoped to this buyer: somebody else's order code answers 404 rather than
  // confirming it exists.
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      code: true,
      status: true,
      total: true,
      quantity: true,
      createdAt: true,
      product: {
        select: { name: true, code: true, imageUrl: true, refundRate: true },
      },
      package: { select: { label: true } },
      refundRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          reason: true,
          adminNote: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) notFound();

  const open = order.refundRequests.some((r) => r.status === "PENDING");
  const blocked = refundBlockedReason({
    orderStatus: order.status,
    openRequest: open,
    purchasedAt: order.createdAt,
    now: new Date(),
  });
  const productName = order.product.name ?? order.product.code;

  return (
    <AccountPageFrame
      title="Yêu cầu hoàn trả"
      subtitle={`Đơn ${order.code} — mô tả sự cố để shop xem xét hoàn tiền`}
      crumb="Yêu cầu hoàn trả"
      action={
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Lịch sử mua
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        {/* WHAT IS BEING ARGUED ABOUT */}
        <section className={CARD}>
          <span className={LABEL}>Đơn hàng</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
              {order.product.imageUrl ? (
                <Image
                  src={order.product.imageUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover object-[85%_center]"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{productName}</p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                Đơn {order.code} · {stamp(order.createdAt)}
                {order.package ? ` · ${order.package.label}` : ""}
                {order.quantity > 1 ? ` · ×${order.quantity}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-white">
                {formatVnd(Number(order.total))}đ
              </p>
              <p className={LABEL}>Đã thanh toán</p>
            </div>
          </div>

          {/* The promise the shop already published on the product page. Shown
              here so the buyer is asking against a known figure rather than
              hoping for one. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-4">
            {typeof order.product.refundRate === "number" ? (
              <span className="inline-flex items-center gap-2 text-[12px] text-neutral-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Tỷ lệ hoàn trả sản phẩm này:{" "}
                <span className="font-black text-[var(--menzu-accent)]">
                  {order.product.refundRate}%
                </span>
              </span>
            ) : null}
            <span className="text-[12px] text-neutral-400">
              Hạn yêu cầu:{" "}
              <span className="font-bold text-neutral-200">
                {stamp(refundDeadline(order.createdAt))}
              </span>{" "}
              ({REFUND_WINDOW_DAYS} ngày kể từ lúc mua)
            </span>
          </div>
        </section>

        {/* PAST ROUNDS, IF ANY */}
        {order.refundRequests.length > 0 ? (
          <section className={CARD}>
            <span className={LABEL}>Yêu cầu đã gửi</span>
            <ul className="mt-3 flex flex-col gap-3">
              {order.refundRequests.map((r) => {
                const state = REFUND_STATUS[r.status];
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
                      >
                        {state.label}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {stamp(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                      {r.reason}
                    </p>
                    {r.adminNote ? (
                      <p className="mt-3 rounded-r-lg border-l-2 border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-neutral-300">
                        <span className="font-bold text-white">Shop trả lời:</span>{" "}
                        {r.adminNote}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* THE FORM, OR WHY THERE IS NONE */}
        <section className={CARD}>
          {blocked ? (
            <div className="flex items-start gap-3 rounded-r-xl border-l-[3px] border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/5 px-4 py-3.5 text-[13px] leading-relaxed text-neutral-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
              <span>{blocked}</span>
            </div>
          ) : (
            <RefundRequestForm code={order.code} onDone="/orders" />
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
