"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, CreditCard, Landmark, Search, Star, Trash2 } from "lucide-react";

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

export interface TopUpView {
  code: string;
  username: string;
  avatarUrl: string | null;
  method: string;
  carrier: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

/** The 24px face beside a customer's name, initial when there is no picture —
 *  the same face language as the dashboard and the users table. */
function MiniAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="text-[11px] font-black uppercase text-neutral-500">
          {username.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

const PAGE_BTN =
  "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";

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
        <span aria-hidden className={`${PAGE_BTN} border-white/[0.06] text-neutral-700 cursor-default`}>
          ‹
        </span>
      ) : (
        <button type="button" aria-label="Trang trước" onClick={() => onGo(current - 1)} className={`${PAGE_BTN} border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white`}>
          ‹
        </button>
      )}
      {pageStrip(current, total).map((n, index) =>
        n === GAP ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-[12px] text-neutral-700">
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
                ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
                : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {n}
          </button>
        ),
      )}
      {current >= total ? (
        <span aria-hidden className={`${PAGE_BTN} border-white/[0.06] text-neutral-700 cursor-default`}>
          ›
        </span>
      ) : (
        <button type="button" aria-label="Trang sau" onClick={() => onGo(current + 1)} className={`${PAGE_BTN} border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white`}>
          ›
        </button>
      )}
    </nav>
  );
}

const TOPUP_STATUS: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ xác nhận", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  COMPLETED: { text: "Đã cộng tiền", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  FAILED: { text: "Đã từ chối", className: "border-red-500/30 bg-red-500/10 text-red-400" },
  // Grey rather than red: nobody did anything wrong, the request simply aged
  // out of the queue — and it still credits if the money turns up.
  EXPIRED: { text: "Quá hạn", className: "border-white/10 bg-white/5 text-neutral-500" },
  // The customer withdrew it themselves from /wallet. Without this entry the
  // fallback dressed cancelled rows as "Chờ xác nhận" — the exact opposite.
  CANCELLED: { text: "Đã hủy", className: "border-white/10 bg-white/5 text-neutral-500" },
};

const TAB_ON =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--brand)] text-white transition-colors";
const TAB_OFF =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 overflow-x-auto">
        <button type="button" onClick={() => setTab("feedback")} className={tab === "feedback" ? TAB_ON : TAB_OFF}>
          Đánh giá
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
          {waitingRefunds > 0 ? (
            <span className="ml-1.5 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px]">
              {waitingRefunds}
            </span>
          ) : null}
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
          {unsentPrizes > 0 ? (
            <span className="ml-1.5 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px]">
              {unsentPrizes}
            </span>
          ) : null}
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
              <label className="relative flex-1 min-w-[240px] max-w-[360px]">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />
                <input
                  value={fbQuery}
                  onChange={(event) => {
                    setFbQuery(event.target.value);
                    setFbPage(1);
                  }}
                  placeholder="Tìm tên, @tài khoản hoặc nội dung..."
                  className="w-full h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors"
                />
              </label>
              {/* The queue at a glance, before any scrolling. */}
              <p className="text-[12px] text-neutral-500 tabular-nums">
                {pendingCount > 0 ? (
                  <>
                    <span className="font-black text-amber-400">{pendingCount}</span> chờ
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
                className={`rounded-2xl border p-4 sm:p-5 ${
                  row.approved
                    ? "border-white/10 bg-neutral-900/50"
                    : "border-amber-500/30 bg-amber-500/[0.04]"
                }`}
              >
                <div className="flex gap-3.5">
                  {/* The face the public card will wear — who you are verifying. */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900">
                    {row.avatarUrl ? (
                      <Image
                        src={row.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="text-sm font-black uppercase text-neutral-500"
                      >
                        {row.name.slice(0, 1)}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span className="text-[13px] font-black text-white">{row.name}</span>
                      {/* Which account is behind the card — the public page
                          never shows this, the moderator always needs it. */}
                      {row.username ? (
                        <span className="text-[11px] text-neutral-500">@{row.username}</span>
                      ) : null}
                      {row.anonymous ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400">
                          Ẩn danh
                        </span>
                      ) : null}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-blue-400 bg-blue-500/10 border-blue-500/20">
                        {row.service}
                      </span>
                      {!row.approved ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                          Chờ duyệt
                        </span>
                      ) : row.verified ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          Đã xác minh
                        </span>
                      ) : null}
                      <span className="ml-auto text-[11px] text-neutral-600 tabular-nums whitespace-nowrap">
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
                              ? "text-amber-400 fill-amber-400"
                              : "text-neutral-800 fill-neutral-900/50"
                          }
                        />
                      ))}
                    </div>

                    {row.body ? (
                      <p className="mt-2 text-[12.5px] text-neutral-300 leading-relaxed">
                        “{row.body}”
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] text-neutral-600 italic">
                        Không để lại nhận xét
                      </p>
                    )}

                    {row.imageUrl ? (
                      <a
                        href={row.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở ảnh gốc"
                        className="mt-2.5 block w-fit rounded-lg overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-colors"
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
                      <p className="mt-2 text-[11px] text-neutral-500">
                        Trị giá GD:{" "}
                        <span className="font-black text-emerald-400 tabular-nums">
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
                        className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-black transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <BadgeCheck size={12} />
                        Duyệt
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => call("/api/admin/feedback", { id: row.id, verified: !row.verified })}
                      className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <BadgeCheck size={12} />
                      {row.verified ? "Bỏ xác minh" : "Xác minh"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRemoving(row)}
                      aria-label={`Xoá đánh giá của ${row.name}`}
                      className="h-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 transition-colors inline-flex items-center justify-center"
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
                <p className="text-[12px] text-neutral-500 tabular-nums">
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
            <label className="relative flex-1 min-w-[240px]">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
              />
              <input
                value={topUpQuery}
                onChange={(event) => {
                  setTopUpQuery(event.target.value);
                  setTopUpPage(1);
                }}
                placeholder="Tìm mã lệnh hoặc tên đăng nhập..."
                className="w-full h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors"
              />
            </label>
            <span className="text-[12px] text-neutral-500 tabular-nums">
              {q ? `${shownTopUps.length}/${topUps.length}` : topUps.length} lượt nạp
            </span>
          </div>

          {shownTopUps.length === 0 ? (
            <AdminEmpty title={`Không có lượt nạp nào khớp "${topUpQuery.trim()}"`} />
          ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e0e11]">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Mã", "Tài khoản", "Hình thức", "Số tiền", "Trạng thái", "Thời gian", ""].map((c) => (
                  <th key={c} scope="col" className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topUpSlice.map((row) => (
                <tr
                  key={row.code}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.015]"
                >
                  <td className="px-5 py-3 font-mono text-xs font-black text-white whitespace-nowrap">
                    #{row.code}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-2.5">
                      <MiniAvatar username={row.username} avatarUrl={row.avatarUrl} />
                      <span className="text-xs font-bold text-neutral-200">{row.username}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      {row.method === "CARD" ? (
                        <CreditCard size={13} className="shrink-0 text-violet-400" />
                      ) : (
                        <Landmark size={13} className="shrink-0 text-sky-400" />
                      )}
                      {row.method === "CARD" ? (row.carrier ?? "Thẻ cào") : "Ngân hàng"}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3 text-xs font-black tabular-nums whitespace-nowrap ${
                      row.status === "COMPLETED"
                        ? "text-emerald-400"
                        : row.status === "FAILED" || row.status === "CANCELLED"
                          ? "text-neutral-500 line-through"
                          : "text-neutral-400"
                    }`}
                  >
                    {row.status === "COMPLETED" ? "+" : ""}
                    {formatVnd(row.amount)}đ
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const status = TOPUP_STATUS[row.status] ?? TOPUP_STATUS.PENDING!;
                      return (
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border whitespace-nowrap ${status.className}`}
                        >
                          {status.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-neutral-500">{row.createdAt}</td>
                  <td className="px-5 py-3">
                    {/* Confirming is what actually credits the wallet, so it
                        asks first — the customer's balance is real money. */}
                    {row.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirming(row)}
                          className="h-8 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => call("/api/admin/topups", { code: row.code, action: "reject" })}
                          className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors whitespace-nowrap"
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
          )}

          {shownTopUps.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[12px] text-neutral-500 tabular-nums">
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
            ? `Ví của ${confirming.username} sẽ được cộng ${formatVnd(confirming.amount)}đ ngay lập tức và ghi một dòng vào lịch sử giao dịch. Chỉ bấm khi bạn đã nhìn thấy tiền về tài khoản với nội dung NAP ${confirming.code}.`
            : ""
        }
        confirmLabel="Cộng tiền vào ví"
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          await call("/api/admin/topups", { code: confirming.code, action: "confirm" });
          setConfirming(null);
        }}
      />

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
