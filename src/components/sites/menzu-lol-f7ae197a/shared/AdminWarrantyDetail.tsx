"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  Landmark,
  MessageCircle,
  RotateCcw,
  Send,
  Wrench,
} from "lucide-react";

import { WarrantyThread } from "@/components/sites/menzu-lol-f7ae197a/shared/WarrantyThread";
import { REFUND_METHOD, REFUND_METHOD_KEYS, type RefundMethod } from "@/lib/refundRequests";
import { mergeMessages, POLL_MS, type ChatMessage } from "@/lib/warrantyChat";
import {
  WARRANTY_ISSUE,
  WARRANTY_REFUND_REPLIES,
  WARRANTY_REPLIES,
  WARRANTY_STATUS,
  warrantyOpen,
  type WarrantyIssue,
  type WarrantyStatus,
} from "@/lib/warrantyRequests";

export interface WarrantyTicketView {
  id: string;
  status: WarrantyStatus;
  issue: WarrantyIssue;
  description: string;
  imageUrl: string | null;
  /** "07:10 01/10/2026" */
  createdAt: string;
  /** ISO — where the poll starts when nothing follows the report yet. */
  createdAtIso: string;
  resolvedAt: string | null;
  username: string;
  uid: number;
  email: string | null;
  orderCode: string;
  /** Still PAID — the only orders money can go back on. */
  orderPaid: boolean;
  orderStatusLabel: string;
  productName: string;
  productImage: string | null;
  packageLabel: string | null;
  orderTotal: number;
  /** The product's published refund rate on this order, else the total. */
  suggestedRefund: number;
  purchasedAt: string;
  /** "sau 2 ngày" — from the sale to the report. */
  reportedAfter: string;
  /** Reported inside the three days the refund policy names. */
  reportedInWindow: boolean;
  refundAmount: number | null;
  refundMethod: RefundMethod | null;
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  bankSubmittedAt: string | null;
  bankSubmittedIso: string | null;
  messages: ChatMessage[];
}

type Move = "IN_PROGRESS" | "RESOLVED" | "REFUND" | "TRANSFERRED";

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11]";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const BTN = "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[11px] font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40";

function money(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/**
 * One warranty ticket, on its own page (the owner, 01/10/2026: "làm thêm
 * trang chi tiết bảo hành … để dễ thao tác"): the conversation in the middle
 * — the report, every message since, and the reply box with the moves under
 * it — and beside it who the buyer is, what they bought and, once there is
 * one, the refund. The page asks every few seconds for the buyer's new
 * messages, so a conversation can be had without reloading.
 */
export function AdminWarrantyDetail({ ticket, mailOn }: { ticket: WarrantyTicketView; mailOn: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Move | "MESSAGE" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The refund panel, opened by "Hoàn tiền". */
  const [refunding, setRefunding] = useState(false);
  const [amount, setAmount] = useState(String(ticket.refundAmount ?? ticket.suggestedRefund));
  const [method, setMethod] = useState<RefundMethod>("WALLET");
  /** A bank refund's last step, waiting for its second press. */
  const [confirming, setConfirming] = useState<"TRANSFERRED" | "WALLET" | null>(null);
  const [copied, setCopied] = useState(false);
  const [extra, setExtra] = useState<ChatMessage[]>([]);

  const state = WARRANTY_STATUS[ticket.status];
  const open = warrantyOpen(ticket.status);
  const working = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const refundDue = ticket.refundAmount ?? ticket.suggestedRefund;
  const replies = refunding || ticket.status === "REFUNDING" ? WARRANTY_REFUND_REPLIES : WARRANTY_REPLIES[ticket.issue];
  const amountNumber = Number(amount);
  const amountOk = Number.isInteger(amountNumber) && amountNumber > 0 && amountNumber <= ticket.orderTotal;
  const messages = useMemo(() => mergeMessages(ticket.messages, extra), [ticket.messages, extra]);
  // Worked out from what is on screen, so a buyer's message that arrives by
  // the poll lights it as well as one that came with the page.
  const awaiting = open && messages.at(-1)?.fromShop === false;
  const opening = {
    body: ticket.description,
    imageUrl: ticket.imageUrl,
    at: ticket.createdAt,
    sentAt: ticket.createdAtIso,
  };

  // The buyer's answers arrive by themselves; a move on the ticket made
  // elsewhere — or the bank account landing — reloads the page's data.
  const cursor = useRef(ticket.createdAtIso);
  useEffect(() => {
    cursor.current = messages.at(-1)?.sentAt ?? ticket.createdAtIso;
  }, [messages, ticket.createdAtIso]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(
          `/api/admin/warranty-requests/messages?id=${encodeURIComponent(ticket.id)}&after=${encodeURIComponent(cursor.current)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: WarrantyStatus;
          bankSubmittedAt?: string | null;
          messages?: ChatMessage[];
        };
        const fresh = data.messages ?? [];
        if (fresh.length > 0) setExtra((prev) => mergeMessages(prev, fresh));
        if (
          (data.status && data.status !== ticket.status) ||
          (data.bankSubmittedAt ?? null) !== ticket.bankSubmittedIso
        ) {
          router.refresh();
        }
      } catch {
        // The next tick tries again.
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, ticket.id, ticket.status, ticket.bankSubmittedIso, router]);

  async function move(status: Move, more: { method?: RefundMethod; amount?: string } = {}) {
    if (busy) return;
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/admin/warranty-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ticket.id, status, note, ...more }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không lưu được");
        return;
      }
      setNote("");
      setRefunding(false);
      setConfirming(null);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  /** "Gửi tin": a line in the conversation that leaves the status alone. */
  async function sendMessage() {
    if (busy || note.trim().length === 0) return;
    setBusy("MESSAGE");
    setError(null);
    try {
      const res = await fetch("/api/admin/warranty-requests/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ticket.id, body: note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không gửi được tin nhắn");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  async function copyAccount() {
    if (!ticket.bankAccount) return;
    try {
      await navigator.clipboard.writeText(ticket.bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The number is on screen to copy by hand.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back to the queue, then what this ticket is at a glance. */}
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/warranty"
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Tất cả yêu cầu
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
          {awaiting ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brand)]/50 bg-[var(--brand)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              <MessageCircle className="h-3 w-3 text-[var(--brand)]" aria-hidden />
              Khách nhắn mới
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-300">
            {WARRANTY_ISSUE[ticket.issue].label}
          </span>
          <span className="text-[11px] font-semibold text-neutral-500">
            Báo lỗi {ticket.createdAt}
            {ticket.resolvedAt ? ` · xong ${ticket.resolvedAt}` : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* THE CONVERSATION */}
        <section className={`${CARD} min-w-0`}>
          <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Trao đổi với khách</h2>
          </div>
          <div className="p-4 sm:p-5">
            <WarrantyThread viewer="shop" buyerName={ticket.username} opening={opening} messages={messages} />
          </div>

          {open ? (
            <div className="flex flex-col gap-3 border-t border-white/[0.06] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={LABEL}>{refunding ? "Lý do hoàn tiền" : "Trả lời khách"}</span>
                {/* The answers this kind of fault gets — or, with a refund on
                    the table, the reasons for one — tucked into one menu
                    rather than a wall of chips. */}
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) setNote(event.target.value);
                  }}
                  aria-label="Chèn câu trả lời mẫu"
                  className="h-8 max-w-full rounded-lg border border-white/10 bg-neutral-950/60 px-2 text-[12px] text-neutral-300 outline-none transition-colors hover:border-white/20 sm:max-w-[320px]"
                >
                  <option value="">Chèn câu trả lời mẫu…</option>
                  {replies.map((reply) => (
                    <option key={reply} value={reply}>
                      {reply}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 500))}
                onKeyDown={(event) => {
                  // Ctrl/⌘+Enter sends; a plain Enter is a new line.
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !refunding && !confirming) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={3}
                placeholder={
                  refunding
                    ? "Vì sao hoàn tiền: không khắc phục được thế nào… (bắt buộc)"
                    : "Nhắn cho khách, hoặc ghi đã xử lý thế nào… (Ctrl+Enter để gửi)"
                }
                className={`${FIELD} resize-y leading-relaxed`}
              />

              {refunding ? (
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Số tiền hoàn (tối đa {money(ticket.orderTotal)})</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={ticket.orderTotal}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className={`${FIELD} max-w-[220px] tabular-nums`}
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REFUND_METHOD_KEYS.map((key) => (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                          method === key
                            ? "border-[var(--brand)]/50 bg-[var(--brand)]/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`method-${ticket.id}`}
                          checked={method === key}
                          onChange={() => setMethod(key)}
                          className="mt-0.5 accent-[var(--brand)]"
                        />
                        <span>
                          <span className="block text-[12.5px] font-bold text-white">{REFUND_METHOD[key].label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                            {REFUND_METHOD[key].hint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
                  {error}
                </p>
              ) : null}

              {/* The moves on the left, "Gửi tin" on the right: talking it
                  through is the common case; closing or refunding takes what
                  is written above as its note. */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {refunding ? (
                    <>
                      <button
                        type="button"
                        disabled={busy !== null || note.trim().length === 0 || !amountOk}
                        onClick={() => move("REFUND", { method, amount })}
                        className={`${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        {busy === "REFUND"
                          ? "Đang lưu…"
                          : `Xác nhận ${method === "WALLET" ? "hoàn" : "hoàn qua ngân hàng"} ${amountOk ? money(amountNumber) : ""}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefunding(false)}
                        className={`${BTN} border border-white/10 text-neutral-300 hover:text-white`}
                      >
                        Thôi
                      </button>
                    </>
                  ) : confirming ? (
                    // One more press before money moves, or before the buyer
                    // is told it has — the same second step "Hoàn tiền" has.
                    <>
                      <button
                        type="button"
                        disabled={busy !== null || (confirming === "WALLET" && note.trim().length === 0)}
                        onClick={() =>
                          confirming === "TRANSFERRED"
                            ? move("TRANSFERRED")
                            : move("REFUND", { method: "WALLET", amount: String(refundDue) })
                        }
                        className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {busy !== null
                          ? "Đang lưu…"
                          : confirming === "TRANSFERRED"
                            ? `Xác nhận đã chuyển ${money(refundDue)}`
                            : `Xác nhận hoàn ${money(refundDue)} vào tài khoản`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className={`${BTN} border border-white/10 text-neutral-300 hover:text-white`}
                      >
                        Thôi
                      </button>
                    </>
                  ) : working ? (
                    <>
                      {ticket.status === "OPEN" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => move("IN_PROGRESS")}
                          className={`${BTN} border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20`}
                        >
                          <Wrench className="h-3.5 w-3.5" aria-hidden />
                          {busy === "IN_PROGRESS" ? "Đang lưu…" : "Đang xử lý"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy !== null || note.trim().length === 0}
                        onClick={() => move("RESOLVED")}
                        title="Đóng yêu cầu, gửi kèm nội dung đang soạn cho khách"
                        className={`${BTN} border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {busy === "RESOLVED" ? "Đang lưu…" : "Đã khắc phục"}
                      </button>
                      {ticket.orderPaid ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => {
                            setRefunding(true);
                            setMethod("WALLET");
                          }}
                          className={`${BTN} border border-white/15 text-neutral-200 hover:bg-white/5 hover:text-white`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Hoàn tiền
                        </button>
                      ) : null}
                    </>
                  ) : (
                    // REFUNDING over a bank: confirm the transfer once it is
                    // sent, or switch to the site account if the buyer never
                    // answers.
                    <>
                      <button
                        type="button"
                        disabled={busy !== null || !ticket.bankAccount}
                        onClick={() => setConfirming("TRANSFERRED")}
                        title={ticket.bankAccount ? undefined : "Khách chưa gửi số tài khoản"}
                        className={`${BTN} border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Đã chuyển khoản
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null || note.trim().length === 0}
                        onClick={() => setConfirming("WALLET")}
                        title="Ghi lý do ở ô trên trước"
                        className={`${BTN} border border-white/15 text-neutral-200 hover:bg-white/5 hover:text-white`}
                      >
                        <Banknote className="h-3.5 w-3.5" aria-hidden />
                        Đổi sang hoàn qua tài khoản
                      </button>
                    </>
                  )}
                </div>
                {!refunding && !confirming ? (
                  <button
                    type="button"
                    disabled={busy !== null || note.trim().length === 0}
                    onClick={() => void sendMessage()}
                    className={`${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]`}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    {busy === "MESSAGE" ? "Đang gửi…" : "Gửi tin"}
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-neutral-500">
                {/* Email goes out only once SMTP is set in Cấu hình. */}
                {mailOn
                  ? "Khách nhận thông báo (web + email) ngay khi bấm."
                  : "Khách nhận thông báo trên web ngay khi bấm (email: chưa cấu hình SMTP)."}
              </p>
            </div>
          ) : (
            <p className="border-t border-white/[0.06] px-4 py-4 text-[12px] text-neutral-500 sm:px-5">
              Yêu cầu đã xong, khung trao đổi đã đóng.
            </p>
          )}
        </section>

        {/* WHO, WHAT, AND THE MONEY */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section className={`${CARD} p-4`}>
            <span className={LABEL}>Khách hàng</span>
            <Link href={`/admin/users/${ticket.uid}`} className="group mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-sm font-black uppercase text-neutral-400">
                {ticket.username.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-sm font-bold text-white group-hover:text-[var(--brand)]">
                  {ticket.username}
                  <ExternalLink className="h-3 w-3 shrink-0 text-neutral-500" aria-hidden />
                </span>
                <span className="block truncate text-[11px] text-neutral-500">
                  UID {ticket.uid}
                  {ticket.email ? ` · ${ticket.email}` : ""}
                </span>
              </span>
            </Link>
          </section>

          <section className={`${CARD} p-4`}>
            <span className={LABEL}>Đơn hàng</span>
            <div className="mt-3 flex items-start gap-3">
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-neutral-900">
                {ticket.productImage ? (
                  <Image src={ticket.productImage} alt="" fill sizes="192px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white">{ticket.productName}</p>
                {ticket.packageLabel ? (
                  <span className="mt-1.5 inline-flex rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                    {ticket.packageLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[12px]">
              <dt className="text-neutral-500">Mã đơn</dt>
              <dd className="text-right">
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(ticket.orderCode)}`}
                  className="font-mono font-semibold text-white hover:text-[var(--brand)]"
                >
                  {ticket.orderCode}
                </Link>
              </dd>
              <dt className="text-neutral-500">Tổng tiền</dt>
              <dd className="text-right font-semibold tabular-nums text-white">{money(ticket.orderTotal)}</dd>
              <dt className="text-neutral-500">Ngày mua</dt>
              <dd className="text-right text-neutral-300">{ticket.purchasedAt}</dd>
              <dt className="text-neutral-500">Báo lỗi</dt>
              <dd className="text-right text-neutral-300">
                {ticket.reportedAfter}{" "}
                <span className={ticket.reportedInWindow ? "text-emerald-400" : "text-neutral-500"}>
                  ({ticket.reportedInWindow ? "trong 3 ngày đầu" : "sau 3 ngày đầu"})
                </span>
              </dd>
              <dt className="text-neutral-500">Trạng thái đơn</dt>
              <dd className="text-right text-neutral-300">{ticket.orderStatusLabel}</dd>
            </dl>
          </section>

          {/* The refund, once there is one: settled, or a bank transfer
              waiting on the buyer's account and then on the shop. */}
          {ticket.refundAmount !== null && (ticket.status === "REFUNDING" || ticket.status === "REFUNDED") ? (
            <section className={`${CARD} p-4`}>
              <span className={LABEL}>Hoàn tiền</span>
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-white">
                {ticket.refundMethod === "MANUAL" ? (
                  <Landmark className="h-4 w-4 text-neutral-400" aria-hidden />
                ) : (
                  <Banknote className="h-4 w-4 text-neutral-400" aria-hidden />
                )}
                {ticket.status === "REFUNDED" ? "Đã hoàn" : "Hoàn"} {money(ticket.refundAmount)}{" "}
                {ticket.refundMethod ? REFUND_METHOD[ticket.refundMethod].label.replace("Hoàn ", "") : ""}
              </p>
              {ticket.refundMethod === "MANUAL" ? (
                ticket.bankAccount ? (
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                    <dt className="text-neutral-500">Ngân hàng</dt>
                    <dd className="font-semibold text-white">{ticket.bankName}</dd>
                    <dt className="text-neutral-500">Số tài khoản</dt>
                    <dd className="flex flex-wrap items-center gap-2 font-mono font-semibold text-white">
                      {ticket.bankAccount}
                      {ticket.status === "REFUNDING" ? (
                        <button
                          type="button"
                          onClick={copyAccount}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-sans text-[10px] font-bold text-neutral-300 hover:text-white"
                        >
                          <Copy className="h-3 w-3" aria-hidden />
                          {copied ? "Đã chép" : "Chép"}
                        </button>
                      ) : null}
                    </dd>
                    <dt className="text-neutral-500">Chủ tài khoản</dt>
                    <dd className="font-semibold text-white">{ticket.accountHolder}</dd>
                    <dt className="text-neutral-500">Khách gửi lúc</dt>
                    <dd className="text-neutral-400">{ticket.bankSubmittedAt}</dd>
                  </dl>
                ) : (
                  <p className="mt-2 text-[12px] text-amber-300">Đang chờ khách nhập số tài khoản.</p>
                )
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
