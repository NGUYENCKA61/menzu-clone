"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import Link from "next/link";

import { useEffect, useRef, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "./modalChrome";
import { SHEET, SHEET_BUTTON, SHEET_TEXT, SHEET_TITLE } from "./noticeSheet";
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
  green: { icon: "text-emerald-400", Icon: CircleCheck },
  red: { icon: "text-rose-400", Icon: CircleX },
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
          Thẻ {formatVnd(face)}đ, phí {formatVnd(face - credited)}đ
        </span>
      ) : null}
    </>
  );
}

const ACTION = `mt-6 w-full ${SHEET_BUTTON}`;

/**
 * The invoice sheet: "Giao dịch đã hủy" in red, "Nạp tiền thành công" in
 * green, one sentence and one button (lab: the house notice sheet).
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
        {/* LAB: the house notice sheet (noticeSheet.ts), like the shop's
            notices and the error sheet: no grid, no glow, the state's glyph
            beside a left-aligned title, red on the one button (the owner,
            16/10/2026: "thiết kế lại cái modal thông báo cho đồng bộ"). */}
        <div className={`${SHEET} px-6 py-6`}>
          <button
            ref={close}
            type="button"
            onClick={leave}
            aria-label="Đóng"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-frost"
          >
            <X size={16} aria-hidden />
          </button>

          <h2 id="topup-dialog-title" className={`${SHEET_TITLE} pr-10`}>
            <look.Icon size={18} className={`shrink-0 ${look.icon}`} aria-hidden />
            {title}
          </h2>
          <div className={`mt-2 ${SHEET_TEXT}`}>{children}</div>

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
