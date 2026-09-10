"use client";

import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "./AdminStates";

import {
  REFUND_METHOD,
  REFUND_METHOD_KEYS,
  type RefundMethod,
} from "@/lib/refundRequests";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--brand)]/60";
const LABEL =
  "mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const ACTION =
  "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[11px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The decision, on the detail page where the whole request is readable.
 *
 * The method is picked before the money is typed because it changes what the
 * number means: in "hoàn vào ví" it is a figure the site is about to move, and
 * in "chuyển tay" it is a note about what the shop says it sent. The box says
 * which, so nobody types one meaning and gets the other.
 */
export function AdminRefundDecide({
  id,
  orderTotal,
  suggested,
  refundRate,
}: {
  id: string;
  /** The ceiling — a refund larger than the order is not a refund. */
  orderTotal: number;
  /** The published rate worked out on this order, or null where none is set. */
  suggested: number | null;
  refundRate: number | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<RefundMethod>("WALLET");
  const [amount, setAmount] = useState(String(suggested ?? ""));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The wallet credit asks once before it moves money. */
  const [confirming, setConfirming] = useState(false);

  async function decide(status: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/refund-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, method, amount, note }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không cập nhật được");
        setBusy(false);
        return;
      }
      setConfirming(false);
      router.refresh();
      // Only a failure gives the buttons back at once. On success the page
      // is about to change under them; buttons that revived first invited
      // a second credit. If nothing has changed in eight seconds something
      // upstream is stuck - give them back rather than leave them dead.
      window.setTimeout(() => setBusy(false), 8000);
    } catch {
      setError("Không kết nối được máy chủ");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className={LABEL}>Cách hoàn</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {REFUND_METHOD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethod(key)}
              aria-pressed={method === key}
              className={`rounded-xl border p-3 text-left transition-colors ${
                method === key
                  ? "border-[var(--brand)]/50 bg-[var(--brand)]/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span
                className={`block text-[12px] font-black uppercase tracking-widest ${
                  method === key ? "text-[var(--brand)]" : "text-neutral-300"
                }`}
              >
                {REFUND_METHOD[key].label}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">
                {REFUND_METHOD[key].hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="refund-amount" className={LABEL}>
          Số tiền hoàn (đ)
        </label>
        <input
          id="refund-amount"
          type="number"
          min={1}
          max={orderTotal}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={String(suggested ?? orderTotal)}
          className={`${FIELD} max-w-xs`}
        />
        <p className="mt-1.5 text-[11px] text-neutral-500">
          {typeof refundRate === "number" && suggested !== null ? (
            <>
              Sản phẩm hứa hoàn <b className="text-neutral-300">{refundRate}%</b> ={" "}
              <button
                type="button"
                onClick={() => setAmount(String(suggested))}
                className="font-black text-[var(--brand)] underline-offset-2 hover:underline"
              >
                {suggested.toLocaleString("vi-VN")}đ
              </button>
              . Sửa được — con số lưu lại là con số gõ ở đây.
            </>
          ) : (
            <>
              Sản phẩm này chưa đặt tỷ lệ hoàn trả. Tối đa{" "}
              {orderTotal.toLocaleString("vi-VN")}đ.
            </>
          )}
        </p>
      </div>

      <div>
        <label htmlFor="refund-note" className={LABEL}>
          Trả lời gửi khách
        </label>
        <textarea
          id="refund-note"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          rows={3}
          placeholder="Khách đọc được câu này. Bắt buộc khi từ chối."
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      {/* Crediting a wallet is the one press in this box that cannot be
          taken back, and it used to happen on the press itself. */}
      <ConfirmDialog
        open={confirming}
        danger
        title="Cộng tiền vào ví khách?"
        body={`Ví của khách được cộng ${amount ? Number(amount).toLocaleString("vi-VN") : "…"}đ ngay khi xác nhận, kèm một dòng trong lịch sử giao dịch. Không hoàn tác được.`}
        confirmLabel="Chấp nhận & cộng ví"
        pending={busy}
        onConfirm={() => decide("APPROVED")}
        onCancel={() => setConfirming(false)}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => (method === "WALLET" ? setConfirming(true) : decide("APPROVED"))}
          className={`${ACTION} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
        >
          <Check size={13} />
          {method === "WALLET" ? "Chấp nhận & cộng ví" : "Chấp nhận (chuyển tay)"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("REJECTED")}
          className={`${ACTION} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
        >
          <X size={13} />
          Từ chối
        </button>
        {method === "WALLET" ? (
          <span className="text-[11px] text-neutral-500">
            Tiền vào ví khách ngay khi bấm, kèm một dòng trong lịch sử giao dịch.
          </span>
        ) : (
          <span className="text-[11px] text-neutral-500">
            Chỉ ghi nhận quyết định — tiền vẫn phải chuyển ngoài web.
          </span>
        )}
      </div>
    </div>
  );
}
