"use client";

import { useRouter } from "next/navigation";
import { Coins, Gift, Send } from "lucide-react";
import { useState } from "react";

import { ADDRESS_MIN, CLAIM_NOTE_MAX } from "@/lib/spin";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--menzu-violet)]/60";
const LABEL =
  "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const ACTION =
  "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[11px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * What happens after the wheel lands on something the shop has to post.
 *
 * Two ways out, and the parcel is the one offered first: it is what was won.
 * Points are the way out for somebody who has no use for a mousepad, which is
 * a real answer and is better than a prize that sits unclaimed forever — and
 * it is only offered when the shop has said what the thing is worth, because a
 * number invented here would be a promise nobody made.
 */
export function SpinPrizeClaim({
  winId,
  label,
  /** Points the shop offers instead. Zero or null means this one is post-only. */
  exchangePoints,
  /** Prefilled from the account, and editable — the parcel may be for someone
   *  else, and the number on file may not be the one to ring. */
  defaultName,
}: {
  winId: string;
  label: string;
  exchangePoints: number | null;
  defaultName: string;
}) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"deliver" | "exchange" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"deliver" | "exchange" | null>(null);

  const short = address.trim().length < ADDRESS_MIN;

  async function send(action: "deliver" | "exchange") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/spin/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: winId, action, recipient, phone, address, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không gửi được");
        return;
      }
      setDone(action);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3.5 text-[13px] leading-relaxed text-emerald-300">
        {done === "exchange" ? (
          <>
            Đã đổi <b>{label}</b> lấy{" "}
            <b>{exchangePoints?.toLocaleString("vi-VN")} điểm</b>. Điểm đã vào tài
            khoản, quay tiếp được ngay.
          </>
        ) : (
          <>
            Đã ghi nhận địa chỉ. Shop sẽ gửi <b>{label}</b> và liên hệ qua số điện
            thoại bạn để lại.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start gap-2.5">
        <Gift size={16} className="mt-0.5 shrink-0 text-[var(--menzu-violet)]" />
        <p className="text-[13px] leading-relaxed text-neutral-300">
          Bạn trúng <b className="text-white">{label}</b>. Điền địa chỉ để shop gửi
          tận nơi
          {exchangePoints && exchangePoints > 0 ? (
            <>
              , hoặc đổi lấy{" "}
              <b className="text-[#a78bfa]">
                {exchangePoints.toLocaleString("vi-VN")} điểm
              </b>{" "}
              nếu bạn không có nhu cầu.
            </>
          ) : (
            "."
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="claim-name" className={LABEL}>
            Tên người nhận
          </label>
          <input
            id="claim-name"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="claim-phone" className={LABEL}>
            Số điện thoại
          </label>
          <input
            id="claim-phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912 345 678"
            className={FIELD}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="claim-address" className={LABEL}>
            Địa chỉ nhận hàng
          </label>
          <textarea
            id="claim-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            className={`${FIELD} resize-y`}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="claim-note" className={LABEL}>
            Ghi chú (không bắt buộc)
          </label>
          <input
            id="claim-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, CLAIM_NOTE_MAX))}
            placeholder="Gọi trước khi giao, giao giờ hành chính…"
            className={FIELD}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy !== null || short}
          onClick={() => send("deliver")}
          className={`${ACTION} bg-[var(--menzu-violet)] text-white hover:bg-[var(--menzu-violet)]/85`}
        >
          <Send size={13} />
          {busy === "deliver" ? "Đang gửi…" : "Gửi địa chỉ"}
        </button>
        {exchangePoints && exchangePoints > 0 ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => send("exchange")}
            className={`${ACTION} border border-white/12 bg-white/[0.04] text-neutral-300 hover:border-[#a78bfa]/50 hover:text-white`}
          >
            <Coins size={13} />
            Đổi lấy {exchangePoints.toLocaleString("vi-VN")} điểm
          </button>
        ) : null}
      </div>
    </div>
  );
}
