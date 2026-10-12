import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  Info,
  KeyRound,
  Landmark,
  Video,
  Wrench,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { WarrantyBankForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyBankForm";
import { WarrantyChat } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyChat";
import { WarrantyDetailsForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyDetailsForm";
import { WarrantyRequestForm } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyRequestForm";
import { maskAccount } from "@/lib/bankRefund";
import { questionFor, readDetails } from "@/lib/warrantyDetails";
import { db } from "@/lib/db";
import { LOGIN_ORDER_SELECT, signInHold } from "@/lib/loginReveal";
import { dayStamp, dayTime } from "@/lib/dayGroups";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
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
/**
 * The three moves a report makes, as the owner drew them (10/10/2026).
 * Sending the report and answering the second round are one move, not two
 * (the owner, 11/10/2026: "khúc gửi thông tin gộp chung với bổ sung đi"), and
 * the step in hand is bright, so it needs no word beside it.
 */
const STEPS = [
  { title: "Gửi thông tin" },
  { title: "Shop tiếp nhận" },
  // Not "Đổi key": a report ends in a new key, a repair or the money back,
  // and naming one of the three promises it (the owner, 11/10/2026).
  { title: "Kết quả xử lý" },
];

/** "09:14 ngày 12/10/2026", for a sentence. */
function when(date: Date): string {
  return `${dayTime(date)} ngày ${date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}

/**
 * The strip in words: what is happening to the latest report now and what
 * comes next, one sentence per state (the owner, 12/10/2026: "rõ hơn").
 * Nothing while the second round is still open; its card says so itself.
 */
function standingOf(r: {
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  refundMethod: string | null;
  bankAccount: string | null;
}): string {
  if (r.status === "OPEN") {
    return `Shop đã nhận yêu cầu lúc ${when(r.createdAt)}, sẽ trả lời trong giờ làm việc ${SUPPORT_WINDOW}.`;
  }
  if (r.status === "IN_PROGRESS") {
    return `Shop đang kiểm tra yêu cầu của bạn, trả lời trong giờ làm việc ${SUPPORT_WINDOW}.`;
  }
  if (r.status === "REFUNDING") {
    if (r.refundMethod !== "MANUAL") {
      return "Shop không khắc phục được và đang hoàn tiền vào tài khoản của bạn trên web.";
    }
    return r.bankAccount
      ? "Shop đã nhận số tài khoản của bạn và sẽ chuyển tiền hoàn sớm."
      : "Shop không khắc phục được và sẽ hoàn tiền qua ngân hàng, bạn nhập số tài khoản bên dưới để nhận.";
  }
  const at = r.resolvedAt ? ` lúc ${when(r.resolvedAt)}` : "";
  return r.status === "REFUNDED"
    ? `Shop đã hoàn tiền xong${at}.`
    : `Shop đã xử lý xong yêu cầu này${at}.`;
}

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
          details: true,
          detailsDoneAt: true,
          createdAt: true,
          resolvedAt: true,
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
  const { brandName } = await getShopSettings();
  // Once a report exists this is where the buyer follows it — the receipt's
  // button reads "Xem trạng thái" — so the page says so in its title.
  const following = order.warrantyRequests.length > 0;
  // Where the strip's light sits: nothing sent yet, a report the shop has,
  // or one it has finished with.
  const latest = order.warrantyRequests[0] ?? null;
  // A report whose second round is still missing has not reached the desk:
  // the strip stays on the buyer's own step (the owner, 10/10/2026).
  const awaitingDetails = Boolean(latest && warrantyOpen(latest.status) && !latest.detailsDoneAt);
  // A report still waiting on its second round is not listed below: the
  // round's card is the whole of it until the answers are in (the owner,
  // 12/10/2026: "đợi người dùng bổ sung đầy đủ thông tin cái đi").
  const sentReports = order.warrantyRequests.filter(
    (r) => r.detailsDoneAt || !warrantyOpen(r.status),
  );
  // An open report listed below carries its own chat, so the card saying
  // "this order already has one" would only repeat it.
  const openListed = sentReports.some((r) => warrantyOpen(r.status));
  const stepNow = !latest || awaitingDetails
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
      // The wiki's and Liên hệ's ground, not the account area's near-black.
      ground="home"
      title={heading}
      subtitle={
        <>
          {/* The code bold but not red (the owner, 10/10/2026: red first,
              then "DHTESTPC03 bỏ màu đỏ đi"). */}
          Đơn <span className="font-bold text-neutral-200">{order.code}</span>
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
        {/* WHERE THE REPORT STANDS — one line, the step in hand bright and
            the rest grey (the owner, 11/10/2026: "cái ô giai đoạn nhìn AI
            quá", then A of the three ways offered). The boxes it replaces
            took 90px to say this. */}
        {following ? (
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold">
            {STEPS.map((step, index) => {
              const here = index === stepNow;
              const done = index < stepNow;
              return (
                <li key={step.title} className="flex items-center gap-2">
                  {index > 0 ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-600" aria-hidden />
                  ) : null}
                  {/* The step in hand in the accent, as the account nav
                      marks the page you are on; white alone was the colour
                      of every heading around it (the owner, 11/10/2026). */}
                  <span
                    className={
                      here
                        ? "text-[var(--menzu-accent)]"
                        : done
                          ? "text-neutral-400"
                          : "text-neutral-500"
                    }
                  >
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
        {latest && !awaitingDetails ? (
          <p className="-mt-2 text-[14px] leading-relaxed text-neutral-200">{standingOf(latest)}</p>
        ) : null}

        {/* THE ORDER BEING REPORTED. Not while the second round is on
            screen: the title already names the order, and the questions are
            what the buyer is there for (the owner, 11/10/2026: "chắc bỏ luôn
            card trên ở trang bổ sung chi tiết"). */}
        {awaitingDetails ? null : (
        <section className={CARD}>
          {/* One line: the receipt already has the price and the paid chip,
              and this page is about the report (the owner, 12/10/2026). */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
              {order.product.imageUrl ? (
                <Image
                  src={order.product.imageUrl}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover object-[85%_center]"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase leading-snug text-white">{productName}</p>
              <p className="mt-1 text-[12px] font-semibold text-neutral-500">
                Đơn <span className="font-bold text-neutral-200">{order.code}</span>
                <span className="text-neutral-600"> · </span>
                mua{" "}
                <span className="font-bold tabular-nums text-neutral-200">{stamp(order.createdAt)}</span>
                {order.package ? (
                  <>
                    <span className="text-neutral-600"> · </span>
                    gói <span className="font-bold text-neutral-200">{order.package.label}</span>
                  </>
                ) : null}
                {order.quantity > 1 ? (
                  <>
                    <span className="text-neutral-600"> · </span>
                    số lượng{" "}
                    <span className="font-bold tabular-nums text-neutral-200">{order.quantity}</span>
                  </>
                ) : null}
              </p>
            </div>
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
        )}

        {/* THE SECOND ROUND — the questions the desk would otherwise ask one
            at a time. Its own card, set like the first round's (the owner,
            11/10/2026), and only while a report is waiting on it. */}
        {latest && awaitingDetails ? (
          // The card wears the accent rule while it is the one thing to do
          // (the owner, 11/10/2026: "nhìn nó không nổi bật gì").
          <section className={`${CARD} border-[var(--menzu-accent)]/30`}>
            {/* The heading lives in the form, where the count of answers
                can sit beside it. */}
            <WarrantyDetailsForm ticketId={latest.id} kind={kind} />
          </section>
        ) : null}

        {/* PAST REPORTS, IF ANY. One frame, not a box per report inside the
            box: the card is the report, and a second one is parted from the
            first by a rule (the owner, 12/10/2026: "đỡ rối, hợp lý, không
            AI"). */}
        {sentReports.length > 0 ? (
          <section className={CARD}>
            <span className={LABEL}>Yêu cầu đã gửi</span>
            <ul className="mt-3 flex flex-col gap-5">
              {sentReports.map((r, index) => {
                const state = WARRANTY_STATUS[r.status];
                const answers = readDetails(r.details);
                return (
                  <li key={r.id} className={index === 0 ? "" : "border-t border-white/[0.06] pt-5"}>
                    {/* The fault and the time as one grey line; only the
                        status wears a chip. */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
                      >
                        {state.label}
                      </span>
                      <span className="text-[12px] font-semibold text-neutral-400">
                        {WARRANTY_ISSUE[r.issue].label}
                        <span className="text-neutral-600"> · </span>
                        <span className="text-neutral-500">{stamp(r.createdAt)}</span>
                      </span>
                      {/* An account's report: the recording it was sent with. */}
                      {r.videoUrl ? (
                        <a
                          href={r.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-300 underline-offset-2 hover:text-white hover:underline"
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
                      <div className="mt-4 border-t border-white/[0.06] pt-4 text-[13px] leading-relaxed text-neutral-300">
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
                    {/* The answers, as the desk reads them. */}
                    {answers.length > 0 ? (
                      // No box: a rule, the label, and one line per answer,
                      // question on the left, answer and its pictures on the
                      // right. Seven lines instead of seven blocks.
                      <div className="mt-4 border-t border-white/[0.06] pt-4">
                        <span className={LABEL}>Thông tin đã bổ sung</span>
                        <dl className="mt-3 flex flex-col gap-2.5">
                          {answers.map((answer) => {
                            const question = questionFor(kind, answer.key);
                            return (
                              <div
                                key={answer.key}
                                className="grid gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,240px)_minmax(0,260px)_1fr]"
                              >
                                <dt className="text-[12px] font-semibold text-neutral-500 sm:pt-0.5">
                                  {question?.short ?? answer.key}
                                </dt>
                                <dd className="text-[13px] font-bold text-neutral-200 sm:pt-0.5">
                                  {answer.value}
                                </dd>
                                {/* Their own column, so the pictures line up
                                    down the card whatever the answer's
                                    length. Small, since they open full size
                                    on a click; one answer can carry several. */}
                                <dd className="flex flex-wrap items-center gap-2">
                                  {answer.imageUrls.map((url, index) => (
                                    <a
                                      key={url}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block h-10 w-[60px] overflow-hidden rounded-md border border-white/10 bg-neutral-950"
                                    >
                                      <Image
                                        src={url}
                                        alt={`${question?.label ?? "Ảnh bổ sung"} ${index + 1}`}
                                        width={120}
                                        height={80}
                                        className="h-full w-full object-cover"
                                      />
                                    </a>
                                  ))}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    ) : null}

                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* THE CONVERSATION, a card of its own (the owner, 12/10/2026: "tách
            yêu cầu đã gửi và chat với shop 2 card riêng"): the facts above
            are read once, this is what the buyer comes back to. Only the
            latest report's thread; an older one is closed anyway. It stays
            open until the shop marks the report done (the owner, 01/10/2026). */}
        {sentReports[0] ? (
          <section className={CARD}>
            <WarrantyChat
              own
              shopName={brandName}
              ticketId={sentReports[0].id}
              status={sentReports[0].status}
              opening={{
                body: sentReports[0].description,
                imageUrl: sentReports[0].imageUrl,
                at: dayStamp(sentReports[0].createdAt),
                sentAt: sentReports[0].createdAt.toISOString(),
              }}
              initial={sentReports[0].messages.map(toChatMessage)}
            />
          </section>
        ) : null}

        {/* THE FORM, OR WHY THERE IS NONE. While the second round is on
            screen the reason is already plain, so the card goes (the owner,
            11/10/2026). */}
        {blocked && (awaitingDetails || openListed) ? null : (
        <section className={CARD}>
          {blocked ? (
            <div className="flex items-start gap-3 rounded-r-xl border-l-[3px] border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/5 px-4 py-3.5 text-[13px] leading-relaxed text-neutral-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
              <span>{blocked}</span>
            </div>
          ) : (
            // Straight on to the second round, which is this same page
            // with the questions on it (the owner, 11/10/2026: "người dùng
            // gửi bảo hành xong là nhảy qua trang bổ sung thông tin").
            <WarrantyRequestForm
              code={order.code}
              kind={kind}
              onDone={`/orders/${order.code}/bao-hanh`}
            />
          )}
        </section>
        )}
      </div>
    </AccountPageFrame>
  );
}
