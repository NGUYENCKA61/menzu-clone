import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Banknote, Clock, Info, KeyRound, Landmark, Video, Wrench } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { WarrantyBankForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyBankForm";
import { WarrantyChat } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyChat";
import { WarrantyRequestForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyRequestForm";
import { maskAccount } from "@/lib/bankRefund";
import { db } from "@/lib/db";
import { LOGIN_ORDER_SELECT, signInHold } from "@/lib/loginReveal";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { dayStamp, dayTime } from "@/lib/dayGroups";
import { getCurrentUser } from "@/lib/session";
import { SUPPORT_WINDOW } from "@/lib/supportHours";
import {
  WARRANTY_ISSUE,
  WARRANTY_STATUS,
  warrantyBlockedReason,
  warrantyKind,
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

// The site's own card, the one the receipt and Thông báo wear, rather than
// the grey fill this page used to have: on the #0f1015 ground it read lighter
// than every card beside it (the owner, 10/10/2026: "màu card đồng bộ mấy
// trang kia chưa").
const CARD = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";
/** The three moves a report makes, as the owner drew them (10/10/2026). */
const STEPS = [
  { title: "Gửi thông tin", now: "Đang thực hiện", note: "Đã gửi" },
  { title: "Shop tiếp nhận", now: "Đang xử lý", note: `Xử lý ${SUPPORT_WINDOW}` },
  { title: "Hoàn tất / Đổi key", now: "Đã xong", note: "Thông báo qua web" },
];

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
  // With what an account's sign-in state needs: an account is reported on
  // only once its sign-in has been taken.
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      ...LOGIN_ORDER_SELECT,
      total: true,
      quantity: true,
      createdAt: true,
      product: { select: { ...LOGIN_ORDER_SELECT.product.select, imageUrl: true } },
      package: { select: { label: true } },
      warrantyRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          issue: true,
          description: true,
          imageUrl: true,
          videoUrl: true,
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

  // A tool's report and an account's ask about different faults, and an
  // account's waits until its sign-in has been taken (the owner, 08/10/2026).
  const kind = warrantyKind(order.product.productType);
  const blocked = warrantyBlockedReason({
    orderStatus: order.status,
    openRequest: order.warrantyRequests.some((r) => warrantyOpen(r.status)),
    refunding: order.warrantyRequests.some((r) => r.status === "REFUNDING"),
    signIn: kind === "account" ? signInHold(order) : null,
  });
  const productName = order.product.name ?? order.product.code;
  // Once a report exists this is where the buyer follows it — the receipt's
  // button reads "Xem trạng thái" — so the page says so in its title.
  const following = order.warrantyRequests.length > 0;
  // Where the strip's light sits: nothing sent yet, a report the shop has,
  // or one it has finished with.
  const latest = order.warrantyRequests[0] ?? null;
  const stepNow = !latest
    ? 0
    : latest.status === "OPEN" || latest.status === "IN_PROGRESS" || latest.status === "REFUNDING"
      ? 1
      : 2;
  const heading = following ? "Trạng thái bảo hành" : "Yêu cầu bảo hành";

  return (
    <AccountPageFrame
      // One job on this page, so no nav column beside it (the owner,
      // 10/10/2026); "Lịch sử mua" in the corner is the way back.
      sidebar={false}
      // The wrench the receipt's button wears, where the public pages put
      // their own glyph (the owner, 10/10/2026).
      icon={Wrench}
      // Back on the account area's near-black, on trial (the owner,
      // 10/10/2026: "cho nền màu đen như cũ thử"); the wiki's #0f1015 is one
      // word away again.
      title={heading}
      subtitle={
        <>
          {/* The code in the accent, the comma after it left alone (the
              owner, 10/10/2026: "tô đỏ đơn DHTESTPC01", "bỏ tô đỏ dấu ,"). */}
          Đơn{" "}
          <span className="font-bold text-[var(--menzu-accent)]">{order.code}</span>
          {following
            ? ", theo dõi yêu cầu bảo hành của bạn"
            : ", báo lỗi để shop kiểm tra và xử lý"}
        </>
      }
      crumb={heading}
      action={
        <Link
          href="/orders"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Lịch sử mua hàng
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        {/* WHERE THE REPORT STANDS — the three moves, the one in hand lit.
            Only once a report exists: before that it said "Đang thực hiện"
            over a form nobody had filled in (the owner, 10/10/2026). */}
        {following ? (
        <section className={`${CARD} !p-3 sm:!p-3`}>
          <ol className="grid gap-2 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const here = index === stepNow;
              const done = index < stepNow;
              return (
                <li
                  key={step.title}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                    here
                      ? "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black ${
                      here
                        ? "bg-[var(--menzu-accent)] text-white"
                        : done
                          ? "bg-white/10 text-neutral-200"
                          : "bg-white/[0.06] text-neutral-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-[12.5px] font-bold ${
                        here || done ? "text-white" : "text-neutral-400"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`block truncate text-[11px] ${
                        here ? "text-[var(--menzu-accent)]" : "text-neutral-500"
                      }`}
                    >
                      {here ? step.now : step.note}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        ) : null}

        {/* THE ORDER BEING REPORTED */}
        <section className={CARD}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-[72px] w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
              {order.product.imageUrl ? (
                <Image
                  src={order.product.imageUrl}
                  alt=""
                  fill
                  sizes="224px"
                  className="object-cover object-[85%_center]"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* The order's real state, from the one table that names
                    them: an order that was refunded must not read "Đã thanh
                    toán" a few centimetres above the refusal. */}
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    order.status === "PAID"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-white/5 text-neutral-300"
                  }`}
                >
                  {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                </span>
                <span className="text-[11px] font-semibold text-neutral-500">
                  Đơn: <span className="font-bold text-neutral-200">{order.code}</span>
                </span>
              </div>
              <p className="mt-2 text-sm font-black uppercase leading-snug text-white">
                {productName}
              </p>
              {/* The receipt's own words for the same three facts: "Ngày
                  mua", "Gói dịch vụ", and a plain count, which it prints
                  without an x. One of a thing is not worth a line (the
                  owner, 10/10/2026). */}
              <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-neutral-500">
                <span>
                  Ngày mua:{" "}
                  <span className="font-bold tabular-nums text-neutral-200">
                    {stamp(order.createdAt)}
                  </span>
                </span>
                {order.package ? (
                  <span>
                    Gói dịch vụ:{" "}
                    <span className="font-bold text-neutral-200">{order.package.label}</span>
                  </span>
                ) : null}
                {order.quantity > 1 ? (
                  <span>
                    Số lượng:{" "}
                    <span className="font-bold tabular-nums text-neutral-200">
                      {order.quantity}
                    </span>
                  </span>
                ) : null}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={LABEL}>Tổng tiền</p>
              {/* White, as the receipt prints the same figure; red on this
                  page belongs to the shop's marks and the send button (the
                  owner, 10/10/2026). */}
              <p className="mt-1 text-lg font-black text-white">
                {formatVnd(Number(order.total))}đ
              </p>
            </div>
          </div>

          {/* No box around it, just a rule and the lines (the owner,
              10/10/2026: "bỏ cái card bọc chỗ shop xử lý bảo hành đi"); the
              glyphs take the accent ("icon màu đỏ cho đồng hồ"). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-4">
            <span className="inline-flex items-center gap-2 text-[12px] text-neutral-300">
              <Clock className="h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
              Shop xử lý bảo hành {SUPPORT_WINDOW} mỗi ngày; ngoài giờ cứ gửi, sáng shop
              làm ngay.
            </span>
            {/* When the buyer took the sign-in: where the recording an
                account's warranty rests on starts. */}
            {kind === "account" && order.loginRevealedAt ? (
              <span className="inline-flex items-center gap-2 text-[12px] text-neutral-300">
                <KeyRound className="h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
                Đã nhận thông tin đăng nhập lúc {dayStamp(order.loginRevealedAt)}
              </span>
            ) : null}
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
                      {/* An account's report: the recording it was sent with. */}
                      {r.videoUrl ? (
                        <a
                          href={r.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-300 underline-offset-2 hover:text-white hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" aria-hidden />
                          Video quay màn hình
                        </a>
                      ) : null}
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
                                qua ngân hàng, bạn nhập số tài khoản để nhận tiền.
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
            <WarrantyRequestForm code={order.code} kind={kind} onDone="/orders" />
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
