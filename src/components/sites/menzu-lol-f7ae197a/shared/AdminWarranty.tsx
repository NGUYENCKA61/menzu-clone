"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CheckCircle2, Copy, ExternalLink, Landmark, RotateCcw, Wrench } from "lucide-react";

import { REFUND_METHOD, REFUND_METHOD_KEYS, type RefundMethod } from "@/lib/refundRequests";
import {
  WARRANTY_ISSUE,
  WARRANTY_REFUND_REPLIES,
  WARRANTY_REPLIES,
  WARRANTY_STATUS,
  type WarrantyIssue,
  type WarrantyStatus,
} from "@/lib/warrantyRequests";

export interface WarrantyRow {
  id: string;
  status: WarrantyStatus;
  issue: WarrantyIssue;
  description: string;
  imageUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  username: string;
  uid: number;
  orderCode: string;
  /** Still PAID — the only orders money can go back on. */
  orderPaid: boolean;
  productName: string;
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
}

const FILTERS: { key: WarrantyStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OPEN", label: "Mới gửi" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "REFUNDING", label: "Đang hoàn tiền" },
  { key: "RESOLVED", label: "Đã xử lý" },
  { key: "REFUNDED", label: "Đã hoàn tiền" },
];

/** Open first, then the bank refunds waiting on somebody, then the closed. */
const RANK: Record<WarrantyStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  REFUNDING: 2,
  RESOLVED: 3,
  REFUNDED: 4,
};

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";

function money(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/**
 * The warranty queue. Open reports float to the top whatever the filter; a
 * report is answered right on its card — a note and a button — so the desk
 * never leaves the list to deal with one. Since 01/10/2026 the card is also
 * where a refund is decided: "Hoàn tiền" with an amount and a way back, to
 * the buyer's account on the site or over a bank.
 */
export function AdminWarranty({ rows, mailOn }: { rows: WarrantyRow[]; mailOn: boolean }) {
  const [filter, setFilter] = useState<WarrantyStatus | "ALL">("ALL");

  const count = (key: WarrantyStatus | "ALL") =>
    key === "ALL" ? rows.length : rows.filter((r) => r.status === key).length;
  const shown = rows
    .filter((r) => filter === "ALL" || r.status === filter)
    .sort((a, b) => RANK[a.status] - RANK[b.status]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                on
                  ? "border-[var(--brand)]/50 bg-[var(--brand)]/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {f.label}
              <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-neutral-300">
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <Wrench className="mx-auto h-8 w-8 text-neutral-600" />
          <p className="mt-3 text-sm font-bold text-white">Chưa có yêu cầu bảo hành nào</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Khách báo lỗi từ nút &ldquo;Yêu cầu bảo hành&rdquo; trong hóa đơn đơn hàng.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((row) => (
            <TicketCard key={row.id} row={row} mailOn={mailOn} />
          ))}
        </div>
      )}
    </div>
  );
}

type Move = "IN_PROGRESS" | "RESOLVED" | "REFUND" | "TRANSFERRED";

function TicketCard({ row, mailOn }: { row: WarrantyRow; mailOn: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Move | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The refund panel, opened by "Hoàn tiền". */
  const [refunding, setRefunding] = useState(false);
  const [amount, setAmount] = useState(String(row.refundAmount ?? row.suggestedRefund));
  const [method, setMethod] = useState<RefundMethod>("WALLET");
  /** A bank refund's last step, waiting for its second press. */
  const [confirming, setConfirming] = useState<"TRANSFERRED" | "WALLET" | null>(null);
  const [copied, setCopied] = useState(false);
  const state = WARRANTY_STATUS[row.status];
  const working = row.status === "OPEN" || row.status === "IN_PROGRESS";
  const refundDue = row.refundAmount ?? row.suggestedRefund;

  async function move(status: Move, extra: { method?: RefundMethod; amount?: string } = {}) {
    if (busy) return;
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/admin/warranty-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id, status, note, ...extra }),
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

  async function copyAccount() {
    if (!row.bankAccount) return;
    try {
      await navigator.clipboard.writeText(row.bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the number is on screen to copy by hand */
    }
  }

  const replies = refunding || row.status === "REFUNDING" ? WARRANTY_REFUND_REPLIES : WARRANTY_REPLIES[row.issue];
  const amountNumber = Number(amount);
  const amountOk = Number.isInteger(amountNumber) && amountNumber > 0 && amountNumber <= row.orderTotal;

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
          {state.label}
        </span>
        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-300">
          {WARRANTY_ISSUE[row.issue].label}
        </span>
        <span className="text-[11px] font-semibold text-neutral-500">{row.createdAt}</span>
        {row.resolvedAt ? (
          <span className="text-[11px] font-semibold text-neutral-600">· xong {row.resolvedAt}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-black text-white">{row.productName}</span>
        {row.packageLabel ? (
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
            {row.packageLabel}
          </span>
        ) : null}
        <span className="text-[11px] font-semibold text-neutral-500">
          Đơn <span className="font-mono text-neutral-400">{row.orderCode}</span> · {row.username}{" "}
          <span className="text-neutral-600">#{row.uid}</span> · {money(row.orderTotal)}
        </span>
      </div>
      {/* When it was bought and how long after the buyer reported — what the
          refund decision turns on. */}
      <p className="mt-1.5 text-[11px] font-semibold text-neutral-500">
        Mua {row.purchasedAt} · báo lỗi {row.reportedAfter}{" "}
        <span className={row.reportedInWindow ? "text-emerald-400" : "text-neutral-400"}>
          ({row.reportedInWindow ? "trong 3 ngày đầu" : "sau 3 ngày đầu"})
        </span>
      </p>

      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
        {row.description}
      </p>

      {row.imageUrl ? (
        <a
          href={row.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--brand)] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mở ảnh khách gửi
        </a>
      ) : null}
      {row.imageUrl ? (
        <div className="mt-2 w-full max-w-xs overflow-hidden rounded-lg border border-white/10">
          <Image
            src={row.imageUrl}
            alt=""
            width={640}
            height={360}
            unoptimized
            className="max-h-[180px] w-full object-cover"
          />
        </div>
      ) : null}

      {row.adminNote ? (
        <p className="mt-3 rounded-r-lg border-l-2 border-[var(--brand)] bg-[var(--brand)]/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-neutral-300">
          <span className="font-bold text-white">Shop đã trả lời:</span> {row.adminNote}
        </p>
      ) : null}

      {/* The refund, once there is one: settled, or a bank transfer waiting
          on the buyer's account and then on the shop. */}
      {row.refundAmount !== null && (row.status === "REFUNDING" || row.status === "REFUNDED") ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[12.5px] text-neutral-300">
          <p className="flex items-center gap-2 font-bold text-white">
            {row.refundMethod === "MANUAL" ? (
              <Landmark className="h-4 w-4 text-neutral-400" />
            ) : (
              <Banknote className="h-4 w-4 text-neutral-400" />
            )}
            {row.status === "REFUNDED" ? "Đã hoàn" : "Hoàn"} {money(row.refundAmount)}{" "}
            {row.refundMethod ? REFUND_METHOD[row.refundMethod].label.replace("Hoàn ", "") : ""}
          </p>
          {row.refundMethod === "MANUAL" ? (
            row.bankAccount ? (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                <dt className="text-neutral-500">Ngân hàng</dt>
                <dd className="font-semibold text-white">{row.bankName}</dd>
                <dt className="text-neutral-500">Số tài khoản</dt>
                <dd className="flex items-center gap-2 font-mono font-semibold text-white">
                  {row.bankAccount}
                  {row.status === "REFUNDING" ? (
                    <button
                      type="button"
                      onClick={copyAccount}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-sans text-[10px] font-bold text-neutral-300 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Đã chép" : "Chép"}
                    </button>
                  ) : null}
                </dd>
                <dt className="text-neutral-500">Chủ tài khoản</dt>
                <dd className="font-semibold text-white">{row.accountHolder}</dd>
                <dt className="text-neutral-500">Khách gửi lúc</dt>
                <dd className="text-neutral-400">{row.bankSubmittedAt}</dd>
              </dl>
            ) : (
              <p className="mt-1.5 text-[12px] text-amber-300">Đang chờ khách nhập số tài khoản.</p>
            )
          ) : null}
        </div>
      ) : null}

      {working || row.status === "REFUNDING" ? (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-white/[0.06] pt-4">
          {/* The answers this kind of fault actually gets — or, once a refund
              is on the table, the reasons for one. Tapped in, then edited. */}
          <div className="flex flex-wrap gap-1.5">
            {replies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => setNote(reply)}
                title={reply}
                className={
                  note === reply
                    ? "max-w-full truncate rounded-lg border border-[var(--brand)]/50 bg-[var(--brand)]/15 px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--brand)] transition-colors"
                    : "max-w-full truncate rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-[11px] font-medium text-neutral-400 transition-colors hover:border-white/20 hover:text-white"
                }
              >
                {reply}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            rows={2}
            placeholder={
              refunding
                ? "Vì sao hoàn tiền: không khắc phục được thế nào… (bắt buộc)"
                : "Trả lời khách: đã cấp key mới / cập nhật bản mới / hướng dẫn… (bắt buộc khi đóng hoặc hoàn tiền)"
            }
            className={`${FIELD} resize-y leading-relaxed`}
          />

          {refunding ? (
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Số tiền hoàn (tối đa {money(row.orderTotal)})
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={row.orderTotal}
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
                      name={`method-${row.id}`}
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

          <div className="flex flex-wrap items-center gap-2">
            {refunding ? (
              <>
                <button
                  type="button"
                  disabled={busy !== null || note.trim().length === 0 || !amountOk}
                  onClick={() => move("REFUND", { method, amount })}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {busy === "REFUND"
                    ? "Đang lưu…"
                    : `Xác nhận ${method === "WALLET" ? "hoàn" : "hoàn qua ngân hàng"} ${amountOk ? money(amountNumber) : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => setRefunding(false)}
                  className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-neutral-300 hover:text-white"
                >
                  Thôi
                </button>
              </>
            ) : working ? (
              <>
                {row.status === "OPEN" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => move("IN_PROGRESS")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    {busy === "IN_PROGRESS" ? "Đang lưu…" : "Đang xử lý"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy !== null || note.trim().length === 0}
                  onClick={() => move("RESOLVED")}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {busy === "RESOLVED" ? "Đang lưu…" : "Đã khắc phục"}
                </button>
                {row.orderPaid ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setRefunding(true);
                      setMethod("WALLET");
                      setNote("");
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Hoàn tiền
                  </button>
                ) : null}
              </>
            ) : confirming ? (
              // One more press before money moves, or before the buyer is told
              // it has — the same second step "Hoàn tiền" has.
              <>
                <button
                  type="button"
                  disabled={busy !== null || (confirming === "WALLET" && note.trim().length === 0)}
                  onClick={() =>
                    confirming === "TRANSFERRED"
                      ? move("TRANSFERRED")
                      : move("REFUND", { method: "WALLET", amount: String(refundDue) })
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {busy !== null
                    ? "Đang lưu…"
                    : confirming === "TRANSFERRED"
                      ? `Xác nhận đã chuyển ${money(refundDue)}`
                      : `Xác nhận hoàn ${money(refundDue)} vào tài khoản`}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-neutral-300 hover:text-white"
                >
                  Thôi
                </button>
              </>
            ) : (
              // REFUNDING over a bank: confirm the transfer once it is sent,
              // or switch to the site account if the buyer never answers.
              <>
                <button
                  type="button"
                  disabled={busy !== null || !row.bankAccount}
                  onClick={() => setConfirming("TRANSFERRED")}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã chuyển khoản
                </button>
                <button
                  type="button"
                  disabled={busy !== null || note.trim().length === 0}
                  onClick={() => setConfirming("WALLET")}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3.5 text-[11px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Đổi sang hoàn qua tài khoản
                </button>
              </>
            )}
            <span className="text-[11px] text-neutral-500">
              {/* Email goes out only once SMTP is set in Cấu hình; until then the
                  desk should not be told the buyer got one. */}
              {mailOn
                ? "Khách nhận thông báo (web + email) ngay khi bấm."
                : "Khách nhận thông báo trên web ngay khi bấm (email: chưa cấu hình SMTP)."}
            </span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
