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
 * Centred and short on purpose — it carries one fact and two figures, and a
 * customer reads it once. There is no close cross: the one button is the way
 * out, and Escape and the backdrop do the same thing.
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
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirm.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // One control, so trapping Tab is just keeping it here — enough to stop
      // it wandering into the page behind the sheet.
      if (event.key === "Tab") {
        event.preventDefault();
        confirm.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Its own element rather than a handler on the wrapper, so selecting the
          code to copy it does not close the sheet. */}
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-success-title"
        className="relative w-full max-w-[380px] rounded-xl border border-white/10 bg-[#131316] px-7 py-8 text-center shadow-2xl"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500 bg-rose-500/15 text-rose-500">
          <Check size={30} strokeWidth={3} />
        </span>

        <h2
          id="topup-success-title"
          className="mt-5 text-[17px] font-black uppercase tracking-wide text-white"
        >
          Nạp tiền thành công
        </h2>

        <p className="mt-2 text-[25px] font-black leading-none text-rose-500 tabular-nums">
          +{formatVnd(amount)}đ
        </p>

        <dl className="mt-6 flex flex-col gap-3 rounded-lg bg-white/[0.04] px-4 py-3.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Mã lệnh nạp
            </dt>
            <dd className="text-[13px] font-semibold text-neutral-200">{code}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Số dư ví
            </dt>
            <dd className="text-[13px] font-bold text-white tabular-nums">
              {formatVnd(balance)}đ
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-[11px] text-neutral-500">
          Số dư đã được cập nhật vào tài khoản của bạn.
        </p>

        <button
          ref={confirm}
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-lg bg-rose-500 text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-600"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
