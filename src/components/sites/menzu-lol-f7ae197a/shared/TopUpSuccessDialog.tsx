"use client";

import { Check, X } from "lucide-react";

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
 * Built as a receipt rather than a celebration — header, figures, one action,
 * separated by hairlines. A payment confirmation is read, not admired, and
 * anything decorative here competes with the two numbers that matter.
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
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The panel rather than the button, so a screen reader announces the
    // dialog and its title before offering the way out of it.
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the sheet; behind it is a form the customer has
      // finished with, and reaching it without seeing it is disorienting.
      const stops = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!stops?.length) return;
      const first = stops[0]!;
      const last = stops[stops.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // Letting the page scroll under the sheet reads as the dialog drifting.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* A click anywhere outside dismisses, which is what people try first.
          Its own element rather than a handler on the wrapper, so selecting
          the code to copy it does not close the sheet. */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-success-title"
        tabIndex={-1}
        className="relative w-full max-w-[400px] rounded-xl border border-white/10 bg-[#12141c] shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-neutral-600 hover:text-neutral-300 transition-colors"
        >
          <X size={15} />
        </button>

        <header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Check size={16} strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2
              id="topup-success-title"
              className="text-[14px] font-semibold text-white leading-tight"
            >
              Nạp tiền thành công
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-500 leading-tight">
              Số dư ví đã được cập nhật
            </p>
          </div>
        </header>

        <div className="px-5 py-5">
          <p className="text-[11px] text-neutral-500">Số tiền đã nạp</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-emerald-400 tabular-nums">
            +{formatVnd(amount)}đ
          </p>

          {/* Hairlines instead of a boxed panel: one fewer border to read, and
              the labels stay aligned with the figure above them. */}
          <dl className="mt-5 divide-y divide-white/[0.07] border-t border-white/[0.07]">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-neutral-500">Mã lệnh nạp</dt>
              <dd className="font-mono text-[13px] text-neutral-200">{code}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-neutral-500">Số dư ví</dt>
              <dd className="text-[13px] font-semibold text-white tabular-nums">
                {formatVnd(balance)}đ
              </dd>
            </div>
          </dl>
        </div>

        <footer className="border-t border-white/[0.07] px-5 py-4">
          {/* Red on the brand purple sits at about 1.9:1 and cannot be read,
              so the fill is a tint of the same red the label carries. */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[13px] font-semibold text-red-400 transition-colors"
          >
            Xong
          </button>
        </footer>
      </div>
    </div>
  );
}
