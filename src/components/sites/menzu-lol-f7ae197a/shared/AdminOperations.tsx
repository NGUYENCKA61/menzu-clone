"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, CreditCard, Landmark, Search, Star, Trash2 } from "lucide-react";

import { INPUT, TEXTAREA } from "../admin/kit";
import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";
import {
  AdminRefundRequests,
  type RefundRequestRow,
} from "./AdminRefundRequests";
import { AdminSpinPrizes } from "./AdminSpinPrizes";
import { AdminSpinWins, type SpinWinRow } from "./AdminSpinWins";
import type { Prize } from "@/lib/spin";
import { GAP, pageCount, pageRange, pageStrip, PER_PAGE } from "@/lib/paging";

export interface FeedbackView {
  id: string;
  name: string;
  avatarUrl: string | null;
  body: string;
  amount: number;
  verified: boolean;
  rating: number;
  service: string;
  imageUrl: string | null;
  anonymous: boolean;
  approved: boolean;
  username: string | null;
  createdAt: string;
}

/** The one hand-typed figure on this screen: what a transfer actually carried. */
const LABEL = "mb-1.5 block text-[12px] font-semibold text-zinc-600";
const HINT = "mt-1.5 text-[11px] text-zinc-500 admin-hint";

/**
 * The reasons a top-up is actually refused, one tap each.
 *
 * Typed out every time, they came out differently every time — and a desk in a
 * hurry types nothing at all, which is the case this whole field exists to
 * stop. Split by method because a bank transfer is never refused for a used
 * card and a card is never refused for a missing transfer note.
 */
const REJECT_REASONS: Record<"BANK" | "CARD", readonly string[]> = {
  BANK: [
    "Không tìm thấy giao dịch chuyển khoản nào khớp với mã lệnh này.",
    "Nội dung chuyển khoản sai, vui lòng nạp lại và ghi đúng nội dung.",
    "Số tiền chuyển không khớp với lệnh nạp.",
  ],
  CARD: [
    "Thẻ sai số seri hoặc mã thẻ, kiểm tra lại rồi gửi lệnh mới.",
    "Thẻ đã được sử dụng trước đó.",
    "Sai mệnh giá thẻ so với số tiền của lệnh nạp.",
  ],
};

export interface TopUpView {
  code: string;
  username: string;
  avatarUrl: string | null;
  method: string;
  carrier: string | null;
  /** Both null unless the request is a card one. */
  cardSerial: string | null;
  cardPin: string | null;
  /** "tsr:…" once the card went to TheSieuRe, else null. */
  providerRef: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

/** The 32px face beside a customer's name, initial when there is no picture —
 *  the same face language as the dashboard and the users table. */
function MiniAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="text-[13px] font-semibold text-zinc-500">
          {username.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

const PAGE_BTN =
  "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";
const PAGE_BTN_OFF =
  "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

/** The admin page strip, client-side: same chrome as the users list, driven by
 *  state instead of the URL — these tabs share one route. */
function Pager({
  current,
  total,
  onGo,
}: {
  current: number;
  total: number;
  onGo: (page: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1.5">
      {current <= 1 ? (
        <span aria-hidden className={`${PAGE_BTN} cursor-default border-zinc-200 text-zinc-300`}>
          ‹
        </span>
      ) : (
        <button type="button" aria-label="Trang trước" onClick={() => onGo(current - 1)} className={`${PAGE_BTN} ${PAGE_BTN_OFF}`}>
          ‹
        </button>
      )}
      {pageStrip(current, total).map((n, index) =>
        n === GAP ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-[12px] text-zinc-400">
            {GAP}
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-label={`Trang ${n}`}
            aria-current={n === current ? "page" : undefined}
            onClick={() => onGo(n)}
            className={`${PAGE_BTN} ${
              n === current
                ? "border-zinc-900 bg-zinc-900 text-white"
                : PAGE_BTN_OFF
            }`}
          >
            {n}
          </button>
        ),
      )}
      {current >= total ? (
        <span aria-hidden className={`${PAGE_BTN} cursor-default border-zinc-200 text-zinc-300`}>
          ›
        </span>
      ) : (
        <button type="button" aria-label="Trang sau" onClick={() => onGo(current + 1)} className={`${PAGE_BTN} ${PAGE_BTN_OFF}`}>
          ›
        </button>
      )}
    </nav>
  );
}

const TOPUP_STATUS: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ xác nhận", className: "border-amber-200 bg-amber-50 text-amber-700" },
  COMPLETED: { text: "Đã cộng tiền", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  FAILED: { text: "Đã từ chối", className: "border-rose-200 bg-rose-50 text-rose-700" },
  // Grey rather than red: nobody did anything wrong, the request simply aged
  // out of the queue — and it still credits if the money turns up.
  EXPIRED: { text: "Quá hạn", className: "border-zinc-200 bg-zinc-50 text-zinc-500" },
  // The customer withdrew it themselves from /wallet. Without this entry the
  // fallback dressed cancelled rows as "Chờ xác nhận" — the exact opposite.
  CANCELLED: { text: "Đã hủy", className: "border-zinc-200 bg-zinc-50 text-zinc-500" },
};
const STATUS_CHIP =
  "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold";

const TAB_ON =
  "whitespace-nowrap border-b-2 border-zinc-900 px-3 pb-2.5 pt-1 text-[13.5px] font-semibold text-zinc-900 transition-colors";
const TAB_OFF =
  "whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 pt-1 text-[13.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Reviews and top-ups on one screen.
 *
 * Top-ups are read-only. A balance is only ever moved by the endpoint that
 * also writes the matching ledger row, so an admin control that edited one
 * here would let the two disagree.
 */
export function AdminOperations({
  feedback,
  topUps,
  refunds,
  spinWins,
  spinPrizes,
  spinStored,
  initialTab = "feedback",
}: {
  feedback: FeedbackView[];
  topUps: TopUpView[];
  refunds: RefundRequestRow[];
  /** Physical prizes the wheel owes and somebody has to post. */
  spinWins: SpinWinRow[];
  /** The wheel as it is set now, in wheel order. */
  spinPrizes: Prize[];
  /** False while the shop is still on the table in code. */
  spinStored: boolean;
  /** Which tab to open on. Read from the URL, so a page that links back here
   *  — a prize's own page, say — returns to the tab it was opened from
   *  instead of dumping the reader on the reviews. */
  initialTab?: "feedback" | "topups" | "refunds" | "spin" | "parcels";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "feedback" | "topups" | "refunds" | "spin" | "parcels"
  >(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<FeedbackView | null>(null);
  const [confirming, setConfirming] = useState<TopUpView | null>(null);
  // Digits only, pre-filled with the request's own figure: the statement
  // usually shows exactly that, and an admin who saw something else — a short
  // payment, or one the automatic path held as implausible — types it here.
  const [received, setReceived] = useState("");
  const receivedAmount = received === "" ? 0 : Number(received);
  // A refusal now says why, because the customer reads it: the request goes
  // grey in their history with the desk's sentence under it.
  const [rejecting, setRejecting] = useState<TopUpView | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [topUpQuery, setTopUpQuery] = useState("");
  const [topUpPage, setTopUpPage] = useState(1);
  const [fbQuery, setFbQuery] = useState("");
  const [fbPage, setFbPage] = useState(1);

  // Client-side over the rows already here: an admin hunting one code or one
  // customer should not need a round-trip per keystroke.
  const q = topUpQuery.trim().toLowerCase().replace(/^#/, "");
  const shownTopUps = q
    ? topUps.filter(
        (t) => t.code.toLowerCase().includes(q) || t.username.toLowerCase().includes(q),
      )
    : topUps;
  const topUpPages = pageCount(shownTopUps.length, PER_PAGE);
  const topUpCurrent = Math.min(topUpPage, topUpPages);
  const topUpSlice = shownTopUps.slice((topUpCurrent - 1) * PER_PAGE, topUpCurrent * PER_PAGE);
  const topUpRange = pageRange(topUpCurrent, PER_PAGE, shownTopUps.length);

  const fq = fbQuery.trim().toLowerCase().replace(/^@/, "");
  const shownFeedback = fq
    ? feedback.filter(
        (f) =>
          f.name.toLowerCase().includes(fq) ||
          (f.username ?? "").toLowerCase().includes(fq) ||
          f.body.toLowerCase().includes(fq),
      )
    : feedback;
  const fbPages = pageCount(shownFeedback.length, PER_PAGE);
  const fbCurrent = Math.min(fbPage, fbPages);
  const fbSlice = shownFeedback.slice((fbCurrent - 1) * PER_PAGE, fbCurrent * PER_PAGE);
  const fbRange = pageRange(fbCurrent, PER_PAGE, shownFeedback.length);
  const pendingCount = feedback.filter((f) => !f.approved).length;
  const waitingRefunds = refunds.filter((r) => r.status === "PENDING").length;
  const unsentPrizes = spinWins.filter((w) => !w.sent).length;

  async function call(url: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Thao tác thất bại");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
      setRemoving(null);
    }
  }

  /** The waiting count on a tab: work someone is waiting on reads amber. */
  const badge = (n: number) =>
    n > 0 ? (
      <span className="ml-1.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
        {n}
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="hide-scrollbar flex overflow-x-auto border-b border-zinc-200">
        <button type="button" onClick={() => setTab("feedback")} className={tab === "feedback" ? TAB_ON : TAB_OFF}>
          Đánh giá
          {badge(pendingCount)}
        </button>
        <button type="button" onClick={() => setTab("topups")} className={tab === "topups" ? TAB_ON : TAB_OFF}>
          Nạp tiền
        </button>
        {/* The count rides on the tab rather than waiting inside it: an
            unanswered refund is somebody waiting on their money, and the desk
            should see there is one without opening the tab to find out. */}
        <button
          type="button"
          onClick={() => setTab("refunds")}
          className={tab === "refunds" ? TAB_ON : TAB_OFF}
        >
          Hoàn trả
          {badge(waitingRefunds)}
        </button>
        <button
          type="button"
          onClick={() => setTab("spin")}
          className={tab === "spin" ? TAB_ON : TAB_OFF}
        >
          Vòng quay
        </button>
        {/* Beside the wheel it comes from, but a tab of its own: choosing what
            the wheel gives away and posting what it gave away are different
            jobs on different days. Same rule as the refund tab — the badge
            counts the errand, which here is a parcel somebody is waiting for
            in the post. */}
        <button
          type="button"
          onClick={() => setTab("parcels")}
          className={tab === "parcels" ? TAB_ON : TAB_OFF}
        >
          Gửi quà
          {badge(unsentPrizes)}
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {tab === "parcels" ? (
        <AdminSpinWins wins={spinWins} />
      ) : tab === "spin" ? (
        <AdminSpinPrizes prizes={spinPrizes} stored={spinStored} />
      ) : tab === "refunds" ? (
        <AdminRefundRequests rows={refunds} />
      ) : tab === "feedback" ? (
        feedback.length === 0 ? (
          <AdminEmpty title="Chưa có đánh giá nào" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="relative min-w-[240px] max-w-[360px] flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={fbQuery}
                  onChange={(event) => {
                    setFbQuery(event.target.value);
                    setFbPage(1);
                  }}
                  placeholder="Tìm tên, @tài khoản hoặc nội dung..."
                  className={`${INPUT} pl-9`}
                />
              </label>
              {/* The queue at a glance, before any scrolling. */}
              <p className="text-[12px] tabular-nums text-zinc-500">
                {pendingCount > 0 ? (
                  <>
                    <span className="font-black text-amber-600">{pendingCount}</span> chờ
                    duyệt ·{" "}
                  </>
                ) : null}
                {feedback.length - pendingCount} đang công khai
              </p>
            </div>

            {shownFeedback.length === 0 ? (
              <AdminEmpty title={`Không có đánh giá nào khớp "${fbQuery.trim()}"`} />
            ) : (
            <div className="flex flex-col gap-3">
            {fbSlice.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border p-4 sm:p-5 ${
                  row.approved
                    ? "border-zinc-200 bg-white"
                    : "border-amber-300 bg-amber-50/50"
                }`}
              >
                <div className="flex gap-3.5">
                  {/* The face the public card will wear — who you are verifying. */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                    {row.avatarUrl ? (
                      <Image
                        src={row.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span aria-hidden className="text-[15px] font-semibold text-zinc-500">
                        {row.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span className="text-[13px] font-bold text-zinc-900">{row.name}</span>
                      {/* Which account is behind the card — the public page
                          never shows this, the moderator always needs it. */}
                      {row.username ? (
                        <span className="text-[11px] text-zinc-500">@{row.username}</span>
                      ) : null}
                      {row.anonymous ? (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500">
                          Ẩn danh
                        </span>
                      ) : null}
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                        {row.service}
                      </span>
                      {!row.approved ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          Chờ duyệt
                        </span>
                      ) : row.verified ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Đã xác minh
                        </span>
                      ) : null}
                      <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-zinc-400">
                        {row.createdAt}
                      </span>
                    </div>

                    <div className="mt-1.5 flex gap-[3px]">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={12}
                          strokeWidth={1.5}
                          className={
                            n <= row.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-zinc-100 text-zinc-300"
                          }
                        />
                      ))}
                    </div>

                    {row.body ? (
                      <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-700">
                        “{row.body}”
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] italic text-zinc-400">
                        Không để lại nhận xét
                      </p>
                    )}

                    {row.imageUrl ? (
                      <a
                        href={row.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở ảnh gốc"
                        className="mt-2.5 block w-fit overflow-hidden rounded-lg border border-zinc-200 transition-colors hover:border-zinc-400"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.imageUrl}
                          alt="Ảnh đính kèm"
                          className="h-16 w-auto object-cover"
                        />
                      </a>
                    ) : null}

                    {row.amount > 0 ? (
                      <p className="mt-2 text-[11px] text-zinc-500 admin-hint">
                        Trị giá GD:{" "}
                        <span className="font-black tabular-nums text-emerald-600">
                          {formatVnd(row.amount)}đ
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                    {!row.approved ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => call("/api/admin/feedback", { id: row.id, approved: true })}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <BadgeCheck size={12} />
                        Duyệt
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => call("/api/admin/feedback", { id: row.id, verified: !row.verified })}
                      className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
                    >
                      <BadgeCheck size={12} />
                      {row.verified ? "Bỏ xác minh" : "Xác minh"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRemoving(row)}
                      aria-label={`Xoá đánh giá của ${row.name}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
            )}

            {shownFeedback.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[12px] tabular-nums text-zinc-500">
                  Hiển thị {fbRange.from}–{fbRange.to} / {shownFeedback.length} đánh giá
                </p>
                <Pager current={fbCurrent} total={fbPages} onGo={setFbPage} />
              </div>
            ) : null}
          </div>
        )
      ) : topUps.length === 0 ? (
        <AdminEmpty title="Chưa có lượt nạp nào" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative min-w-[240px] flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={topUpQuery}
                onChange={(event) => {
                  setTopUpQuery(event.target.value);
                  setTopUpPage(1);
                }}
                placeholder="Tìm mã lệnh hoặc tên đăng nhập..."
                className={`${INPUT} pl-9`}
              />
            </label>
            <span className="text-[12px] tabular-nums text-zinc-500">
              {q ? `${shownTopUps.length}/${topUps.length}` : topUps.length} lượt nạp
            </span>
          </div>

          {shownTopUps.length === 0 ? (
            <AdminEmpty title={`Không có lượt nạp nào khớp "${topUpQuery.trim()}"`} />
          ) : (
        <>
        {/* On a phone the table was 800px in a 348px scroller and the two
            buttons that credit or refuse a top-up sat 430px past the right
            edge. One card per request, buttons at the foot, the card's two
            numbers allowed to break so a long PIN never overflows. */}
        <div className="flex flex-col gap-2 sm:hidden">
          {topUpSlice.map((row) => {
            const status = TOPUP_STATUS[row.status] ?? TOPUP_STATUS.PENDING!;
            return (
              <article key={row.code} className="rounded-xl border border-zinc-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block font-mono text-xs font-bold text-zinc-900">#{row.code}</span>
                    <span className="block text-[11px] text-zinc-400">{row.createdAt}</span>
                  </div>
                  <span className={`${STATUS_CHIP} shrink-0 ${status.className}`}>
                    {status.text}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <MiniAvatar username={row.username} avatarUrl={row.avatarUrl} />
                    <span className="truncate text-xs font-bold text-zinc-800">{row.username}</span>
                  </span>
                  <span
                    className={`shrink-0 text-base font-black tabular-nums ${
                      row.status === "COMPLETED"
                        ? "text-emerald-600"
                        : row.status === "FAILED" || row.status === "CANCELLED"
                          ? "text-zinc-400 line-through"
                          : "text-zinc-900"
                    }`}
                  >
                    {row.status === "COMPLETED" ? "+" : ""}
                    {formatVnd(row.amount)}đ
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
                  {row.method === "CARD" ? (
                    <CreditCard size={13} className="shrink-0 text-zinc-400" />
                  ) : (
                    <Landmark size={13} className="shrink-0 text-zinc-400" />
                  )}
                  {row.method === "CARD" ? (row.carrier ?? "Thẻ cào") : "Ngân hàng"}
                </div>
                {row.cardSerial && row.cardPin ? (
                  <div className="mt-2 flex flex-col gap-0.5 break-all rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[12px] leading-snug text-zinc-800">
                    <span><span className="text-zinc-400">Seri </span>{row.cardSerial}</span>
                    <span><span className="text-zinc-400">Mã </span>{row.cardPin}</span>
                  </div>
                ) : null}
                {row.method === "CARD" && row.providerRef?.startsWith("tsr:") ? (
                  <p className="mt-2 text-[11px] font-semibold text-violet-600">
                    {row.status === "PENDING" ? "TheSieuRe đang gạch thẻ" : "Gạch qua TheSieuRe"}
                  </p>
                ) : null}
                {row.status === "PENDING" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setConfirming(row);
                        setReceived(String(row.amount));
                      }}
                      className="press h-10 rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setRejecting(row);
                        setRejectNote("");
                      }}
                      className="press h-10 rounded-lg border border-zinc-300 bg-white text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200">
                {["Mã", "Tài khoản", "Hình thức", "Số tiền", "Trạng thái", "Thời gian", ""].map((c) => (
                  <th key={c} scope="col" className="whitespace-nowrap px-5 py-3 text-[12.5px] font-semibold text-zinc-500">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topUpSlice.map((row) => (
                <tr
                  key={row.code}
                  className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/70"
                >
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-bold text-zinc-900">
                    #{row.code}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <MiniAvatar username={row.username} avatarUrl={row.avatarUrl} />
                      <span className="text-xs font-bold text-zinc-800">{row.username}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      {row.method === "CARD" ? (
                        <CreditCard size={13} className="shrink-0 text-zinc-400" />
                      ) : (
                        <Landmark size={13} className="shrink-0 text-zinc-400" />
                      )}
                      {row.method === "CARD" ? (row.carrier ?? "Thẻ cào") : "Ngân hàng"}
                    </span>
                    {/* The card itself, right where it is redeemed from: the
                        desk reads these two numbers into the carrier's page,
                        and having to open a second screen for them is how a
                        digit gets mistyped. */}
                    {row.cardSerial && row.cardPin ? (
                      <span className="mt-1 flex flex-col font-mono text-[11px] leading-tight text-zinc-700">
                        <span>
                          <span className="text-zinc-400">Seri </span>
                          {row.cardSerial}
                        </span>
                        <span>
                          <span className="text-zinc-400">Mã </span>
                          {row.cardPin}
                        </span>
                      </span>
                    ) : null}
                    {row.method === "CARD" && row.providerRef?.startsWith("tsr:") ? (
                      <span className="mt-1 block text-[11px] font-semibold text-violet-600">
                        {row.status === "PENDING" ? "TheSieuRe đang gạch" : "Qua TheSieuRe"}
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-3 text-xs font-black tabular-nums ${
                      row.status === "COMPLETED"
                        ? "text-emerald-600"
                        : row.status === "FAILED" || row.status === "CANCELLED"
                          ? "text-zinc-400 line-through"
                          : "text-zinc-700"
                    }`}
                  >
                    {row.status === "COMPLETED" ? "+" : ""}
                    {formatVnd(row.amount)}đ
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const status = TOPUP_STATUS[row.status] ?? TOPUP_STATUS.PENDING!;
                      return (
                        <span className={`${STATUS_CHIP} ${status.className}`}>
                          {status.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-zinc-500">{row.createdAt}</td>
                  <td className="px-5 py-3">
                    {/* Confirming is what actually credits the wallet, so it
                        asks first — the customer's balance is real money. */}
                    {row.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setConfirming(row);
                            setReceived(String(row.amount));
                          }}
                          className="h-8 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setRejecting(row);
                            setRejectNote("");
                          }}
                          className="h-8 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
          )}

          {shownTopUps.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[12px] tabular-nums text-zinc-500">
                Hiển thị {topUpRange.from}–{topUpRange.to} / {shownTopUps.length} lượt nạp
              </p>
              <Pager current={topUpCurrent} total={topUpPages} onGo={setTopUpPage} />
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        pending={pending}
        title="Xác nhận đã nhận được tiền?"
        body={
          confirming
            ? `Ví của ${confirming.username} sẽ được cộng ${formatVnd(receivedAmount)}đ ngay lập tức và ghi một dòng vào lịch sử giao dịch. Chỉ bấm khi bạn đã nhìn thấy tiền về tài khoản với nội dung NAP ${confirming.code}.`
            : ""
        }
        confirmLabel="Cộng tiền vào ví"
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          if (receivedAmount <= 0) {
            setError("Số tiền thực nhận không hợp lệ");
            return;
          }
          await call("/api/admin/topups", {
            code: confirming.code,
            action: "confirm",
            // Sent only when it differs, so the plain click stays the plain click.
            ...(receivedAmount !== confirming.amount ? { amount: receivedAmount } : {}),
          });
          setConfirming(null);
        }}
      >
        {confirming ? (
          <div>
            <label htmlFor="topup-received" className={LABEL}>
              Số tiền thực nhận (đ)
            </label>
            <input
              id="topup-received"
              inputMode="numeric"
              autoComplete="off"
              value={received}
              onChange={(event) => setReceived(event.target.value.replace(/\D/g, ""))}
              className={`${INPUT} font-black tabular-nums`}
            />
            <p className={HINT}>
              {receivedAmount === confirming.amount
                ? "Đúng số lệnh ghi. Sửa nếu sao kê báo số khác."
                : `Khác lệnh ghi ${formatVnd(confirming.amount)}đ, ví cộng đúng số này, lệnh được ghi lại theo số này.`}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={rejecting !== null}
        danger
        pending={pending}
        title="Từ chối lệnh nạp này?"
        body={
          rejecting
            ? `Lệnh ${rejecting.code} của ${rejecting.username} sẽ chuyển sang Từ chối và không cộng tiền. Lý do bên dưới hiện thẳng trong lịch sử nạp của khách.`
            : ""
        }
        confirmLabel="Từ chối lệnh nạp"
        onCancel={() => setRejecting(null)}
        onConfirm={async () => {
          if (!rejecting) return;
          await call("/api/admin/topups", {
            code: rejecting.code,
            action: "reject",
            // Left out when nothing was written, so the column stays null
            // rather than holding an empty sentence.
            ...(rejectNote.trim() ? { note: rejectNote.trim() } : {}),
          });
          setRejecting(null);
        }}
      >
        {rejecting ? (
          <div>
            <span className={LABEL}>Lý do gửi cho khách</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REJECT_REASONS[rejecting.method === "CARD" ? "CARD" : "BANK"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectNote(reason)}
                  className={
                    rejectNote === reason
                      ? "rounded-lg border border-zinc-900 bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] font-semibold text-white transition-colors"
                      : "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
                  }
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              id="topup-reject-note"
              rows={2}
              maxLength={200}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Hoặc tự viết lý do…"
              className={`${TEXTAREA} resize-none`}
            />
            <p className={HINT}>
              {rejectNote.trim()
                ? `Khách sẽ đọc đúng câu này. Còn ${200 - rejectNote.length} ký tự.`
                : "Bỏ trống cũng được, nhưng khách sẽ chỉ thấy chữ Từ chối và sẽ nhắn hỏi."}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={pending}
        title="Xoá đánh giá?"
        body={
          removing
            ? `Đánh giá của ${removing.name} sẽ bị xoá hẳn khỏi trang /feedback và không khôi phục được. Muốn giữ lại nhưng bỏ dấu tin cậy thì bấm Bỏ xác minh.`
            : ""
        }
        confirmLabel="Xoá đánh giá"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && call("/api/admin/feedback", { id: removing.id, remove: true })}
      />
    </div>
  );
}
