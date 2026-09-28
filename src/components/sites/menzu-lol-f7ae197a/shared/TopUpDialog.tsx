"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import Link from "next/link";

import { useEffect, useRef, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "./modalChrome";
import { formatVnd } from "./productData";
import { useLeave } from "./useOverlayPresence";

export interface TopUpDialogProps {
  /** Green for money that arrived, red for an invoice that is gone. */
  tone: "green" | "red";
  title: string;
  children: ReactNode;
  /** The one white button: a way on, as a link or an action. */
  action: { label: string; href?: string; onClick?: () => void };
  onClose: () => void;
}

const TONE = {
  green: {
    glow: "bg-emerald-500/10",
    box: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-500",
    Icon: CircleCheck,
  },
  red: {
    glow: "bg-red-500/10",
    box: "bg-red-500/10 border-red-500/20",
    icon: "text-red-500",
    Icon: CircleX,
  },
} as const;

/**
 * What the green sheet says: the sentence, the figure in green, and for a
 * card the fee — printing only the face value while the balance moved by less
 * made the sheet argue with the ledger.
 */
export function CreditedLines({ credited, face }: { credited: number; face: number }) {
  return (
    <>
      <span className="text-neutral-300">Tài khoản của bạn đã được cộng</span>
      <span className="block text-lg sm:text-xl font-bold tabular-nums text-emerald-500">
        {formatVnd(credited)}đ
      </span>
      {face > credited ? (
        <span className="mt-1 block text-xs tabular-nums text-neutral-500">
          Thẻ {formatVnd(face)}đ · phí {formatVnd(face - credited)}đ
        </span>
      ) : null}
    </>
  );
}

const ACTION =
  "w-full flex items-center justify-center bg-white text-black font-bold text-sm sm:text-base py-4 rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all relative z-10";

/**
 * menzu's invoice sheet, measured off its "Giao dịch đã hủy": a #111 card,
 * 32px round, a faint grid, the icon in a rounded square with a glow behind
 * it, one sentence and a white button. The same sheet says "Nạp tiền thành
 * công" in green.
 *
 * Escape, the backdrop and the cross close it; Tab stays between the cross
 * and the button.
 */
export function TopUpDialog({ tone, title, children, action, onClose }: TopUpDialogProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const primary = useRef<HTMLElement | null>(null);
  const { leaving, leave } = useLeave(onClose);
  const look = TONE[tone];

  useEffect(() => {
    // The sheet takes focus, not its button: a focused button opens wearing
    // a ring menzu's never shows, and the first Tab still lands on it.
    sheet.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        leave();
        return;
      }
      // Two controls: Tab goes from one to the other and never into the page
      // behind the sheet.
      if (event.key === "Tab") {
        event.preventDefault();
        (document.activeElement === primary.current ? close.current : primary.current)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    lockScroll();

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [leave]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      <div
        className={`error-modal-backdrop absolute inset-0 bg-black/60${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />

      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-dialog-title"
        tabIndex={-1}
        className={`notice-modal-card w-full max-w-md relative z-10 outline-none${leaving ? " order-modal-card-out" : ""}`}
      >
        <div className="bg-[#111111] border border-white/5 shadow-none rounded-[32px] p-8 sm:p-10 flex flex-col items-center text-center relative overflow-hidden group">
          <button
            ref={close}
            type="button"
            onClick={leave}
            aria-label="Đóng"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20"
          >
            <X size={18} aria-hidden />
          </button>
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"
          />
          <div
            aria-hidden
            className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${look.glow} blur-[60px] rounded-full pointer-events-none`}
          />

          <div
            className={`w-20 h-20 ${look.box} border rounded-[24px] flex items-center justify-center mb-6 relative z-10`}
          >
            <look.Icon size={40} className={look.icon} aria-hidden />
          </div>

          <h2
            id="topup-dialog-title"
            className="text-2xl sm:text-3xl font-black text-white mb-2 relative z-10 tracking-tight"
          >
            {title}
          </h2>
          <div className="text-neutral-500 mb-8 text-sm sm:text-base relative z-10 leading-relaxed px-4">
            {children}
          </div>

          {action.href ? (
            <Link
              ref={(node) => {
                primary.current = node;
              }}
              href={action.href}
              onClick={action.onClick}
              className={ACTION}
            >
              {action.label}
            </Link>
          ) : (
            <button
              ref={(node) => {
                primary.current = node;
              }}
              type="button"
              onClick={action.onClick ?? leave}
              className={ACTION}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
