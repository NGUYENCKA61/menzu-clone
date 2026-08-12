"use client";

import { Check } from "lucide-react";

import { useEffect, useRef } from "react";

import { formatVnd } from "./productData";

export interface TopUpSuccessDialogProps {
  /** The request that just settled, so the customer can match it to a receipt. */
  code: string;
  /** What went in, in đồng. */
  amount: number;
  /** What the wallet holds now, as the server saw it after crediting. */
  balance: number;
  onClose: () => void;
}

/**
 * Says the money landed, and waits to be acknowledged.
 *
 * This replaced a badge that appeared for a second and a half before the page
 * reloaded underneath the customer. Getting paid is the one moment on this
 * screen worth stopping for: somebody who looked away came back to a reloaded
 * page and no statement that anything had happened.
 *
 * Dismissing it reloads, because the balance in the header was rendered before
 * any of this and is now wrong.
 */
export function TopUpSuccessDialog({
  code,
  amount,
  balance,
  onClose,
}: TopUpSuccessDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The dialog holds one control, so cycling is just keeping focus on it —
      // enough to stop Tab wandering into the transfer form behind the sheet.
      if (event.key === "Tab") {
        event.preventDefault();
        confirmRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // The page behind is a form the customer has finished with; letting it
    // scroll under the sheet reads as the dialog drifting.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      // A click anywhere outside dismisses, which is what people try first.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-success-title"
        // Without this the click bubbles to the backdrop and the sheet closes
        // when somebody selects the code to copy it.
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-neutral-950 p-6 shadow-2xl shadow-black/60 flex flex-col items-center gap-4 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <Check size={28} strokeWidth={3} />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2
            id="topup-success-title"
            className="text-base font-black uppercase tracking-widest text-white"
          >
            Nạp tiền thành công
          </h2>
          <p className="text-2xl font-black text-emerald-400 tabular-nums">
            +{formatVnd(amount)}đ
          </p>
        </div>

        <dl className="w-full flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Mã lệnh nạp
            </dt>
            <dd className="font-mono text-xs font-bold text-white">{code}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Số dư ví
            </dt>
            <dd className="text-sm font-black tabular-nums text-white">
              {formatVnd(balance)}đ
            </dd>
          </div>
        </dl>

        <button
          ref={confirmRef}
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-black py-3 uppercase tracking-widest text-xs transition-colors"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
