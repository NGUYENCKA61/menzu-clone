import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Banknote, Clock, Info, Landmark } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { WarrantyBankForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyBankForm";
import { WarrantyChat } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyChat";
import { WarrantyRequestForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyRequestForm";
import { maskAccount } from "@/lib/bankRefund";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { dayStamp, dayTime } from "@/lib/dayGroups";
import { getCurrentUser } from "@/lib/session";
import { SUPPORT_WINDOW } from "@/lib/supportHours";
import {
  WARRANTY_ISSUE,
  WARRANTY_STATUS,
  warrantyBlockedReason,
  warrantyOpen,
} from "@/lib/warrantyRequests";
import { MESSAGE_SELECT, toChatMessage } from "@/lib/warrantyThread";

export const metadata: Metadata = {
  title: "Yêu cầu bảo hành",
  // One buyer's own order. Followed, not indexed, like the rest of the
  // account area.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function stamp(date: Date): string {
  return `${date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${dayTime(date)}`;
}

/**
 * The warranty screen for one order: the order restated, every report made on
 * it with the shop's answer, and the form for a new one — or the reason there
 * is none. Its own page, like the refund request, because a description and a
 * screenshot want more room than a receipt's footer.
 */
export default async function WarrantyRequestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${code}/bao-hanh`)}`);
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
      product: { select: { name: true, code: true, imageUrl: true } },
      package: { select: { label: true } },
      warrantyRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          issue: true,
          description: true,
          imageUrl: true,
          createdAt: true,
          refundAmount: true,
          refundMethod: true,
          bankName: true,
          bankAccount: true,
          accountHolder: true,
          messages: { orderBy: { createdAt: "asc" }, select: MESSAGE_SELECT },
        },
      },
    },
  });
  if (!order) notFound();

  const blocked = warrantyBlockedReason({
    orderStatus: order.status,
    openRequest: order.warrantyRequests.some((r) => warrantyOpen(r.status)),
    refunding: order.warrantyRequests.some((r) => r.status === "REFUNDING"),
  });
  const productName = order.product.name ?? order.product.code;
  // Once a report exists this is where the buyer follows it — the receipt's
  // button reads "Xem trạng thái" — so the page says so in its title.
  const following = order.warrantyRequests.length > 0;
  const heading = following ? "Trạng thái bảo hành" : "Yêu cầu bảo hành";

  return (
    <AccountPageFrame
      title={heading}
      subtitle={
        following
          ? `Đơn ${order.code} — theo dõi yêu cầu bảo hành của bạn`
          : `Đơn ${order.code} — báo lỗi để shop kiểm tra và xử lý`
      }
      crumb={heading}
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
        {/* THE ORDER BEING REPORTED */}
        <section className={CARD}>
          <span className={LABEL}>Đơn hàng</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
              {order.product.imageUrl ? (
                <Image
                  src={order.product.imageUrl}
                  alt=""
                  fill
                  sizes="192px"
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
              <p className="text-lg font-black text-white">{formatVnd(Number(order.total))}đ</p>
              {/* The order’s real state, from the one table that names them.
                  Written out as "Đã thanh toán" whatever it was, this line
                  contradicted the refusal printed a few centimetres below it
                  on an order that had been refunded. */}
              <p className={LABEL}>
                {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-4">
            <span className="inline-flex items-center gap-2 text-[12px] text-neutral-400">
              <Clock className="h-4 w-4 text-[var(--menzu-accent)]" />
              Shop xử lý bảo hành {SUPPORT_WINDOW} mỗi ngày; ngoài giờ cứ gửi, sáng shop
              làm ngay.
            </span>
          </div>
        </section>

        {/* PAST REPORTS, IF ANY */}
        {order.warrantyRequests.length > 0 ? (
          <section className={CARD}>
            <span className={LABEL}>Yêu cầu đã gửi</span>
            <ul className="mt-3 flex flex-col gap-3">
              {order.warrantyRequests.map((r) => {
                const state = WARRANTY_STATUS[r.status];
                return (
                  <li key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
                      >
                        {state.label}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-300">
                        {WARRANTY_ISSUE[r.issue].label}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {stamp(r.createdAt)}
                      </span>
                    </div>
                    {/* The refund, when the shop could not fix it: settled to
                        the site account, sent to a bank, or waiting on the
                        buyer's account — the one step that is theirs. */}
                    {(r.status === "REFUNDING" || r.status === "REFUNDED") && r.refundAmount !== null ? (
                      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-300">
                        <p className="flex items-start gap-2">
                          {r.refundMethod === "MANUAL" ? (
                            <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          ) : (
                            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          )}
                          <span>
                            {r.status === "REFUNDED" ? (
                              r.refundMethod === "MANUAL" ? (
                                <>
                                  Shop đã chuyển{" "}
                                  <span className="font-bold text-white">
                                    {formatVnd(Number(r.refundAmount))}đ
                                  </span>{" "}
                                  về tài khoản {r.bankName}{" "}
                                  {r.bankAccount ? maskAccount(r.bankAccount) : ""}.
                                </>
                              ) : (
                                <>
                                  Shop đã hoàn{" "}
                                  <span className="font-bold text-white">
                                    {formatVnd(Number(r.refundAmount))}đ
                                  </span>{" "}
                                  vào tài khoản của bạn trên web.{" "}
                                  <Link
                                    href="/transactions"
                                    className="font-bold text-white underline underline-offset-2 hover:text-[var(--menzu-accent)]"
                                  >
                                    Xem giao dịch
                                  </Link>
                                </>
                              )
                            ) : r.bankAccount ? (
                              <>
                                Shop đã nhận số tài khoản{" "}
                                <span className="font-bold text-white">
                                  {r.bankName} {maskAccount(r.bankAccount)}
                                </span>{" "}
                                ({r.accountHolder}) và sẽ chuyển{" "}
                                <span className="font-bold text-white">
                                  {formatVnd(Number(r.refundAmount))}đ
                                </span>{" "}
                                cho bạn sớm.
                              </>
                            ) : (
                              <>
                                Shop sẽ hoàn{" "}
                                <span className="font-bold text-white">
                                  {formatVnd(Number(r.refundAmount))}đ
                                </span>{" "}
                                qua ngân hàng — bạn nhập số tài khoản để nhận tiền.
                              </>
                            )}
                          </span>
                        </p>
                        {r.status === "REFUNDING" && r.refundMethod === "MANUAL" ? (
                          <WarrantyBankForm
                            ticketId={r.id}
                            submitted={
                              r.bankAccount && r.bankName && r.accountHolder
                                ? { bankName: r.bankName, accountHolder: r.accountHolder }
                                : null
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {/* The report and everything said since — open until the
                        shop marks it done (the owner, 01/10/2026). */}
                    <WarrantyChat
                      ticketId={r.id}
                      status={r.status}
                      opening={{
                        body: r.description,
                        imageUrl: r.imageUrl,
                        at: dayStamp(r.createdAt),
                        sentAt: r.createdAt.toISOString(),
                      }}
                      initial={r.messages.map(toChatMessage)}
                    />
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
            <WarrantyRequestForm code={order.code} onDone="/orders" />
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
