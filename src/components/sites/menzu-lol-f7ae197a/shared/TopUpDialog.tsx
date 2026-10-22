"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import Link from "next/link";

import { useEffect, useRef, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "./modalChrome";
import { SHEET, SHEET_BUTTON, SHEET_BUTTON_QUIET } from "./noticeSheet";
import { formatVnd } from "./productData";
import { useLeave } from "./useOverlayPresence";

/** One line of the receipt: a label on the left, its value on the right. */
export interface TopUpReceiptRow {
  label: string;
  value: string;
  /** The line that matters most, printed bold. */
  strong?: boolean;
}

export interface TopUpDialogProps {
  /** Green for money that arrived, red for an invoice that is gone. */
  tone: "green" | "red";
  title: string;
  /** Under the title: the request code and when it was made. */
  subtitle?: string;
  /** The figure the sheet is about, printed large; the credit on a green sheet. */
  amount?: { label: string; value: number };
  /** The receipt's lines, in order. */
  rows?: TopUpReceiptRow[];
  /** A sentence of its own, the refusal's reason on a red sheet. */
  children?: ReactNode;
  /** The one red button: a way on, as a link or an action. */
  action: { label: string; href?: string; onClick?: () => void };
  /** A quieter second way, as a link. */
  secondary?: { label: string; href: string };
  onClose: () => void;
}

const TONE = {
  green: {
    Icon: CircleCheck,
    emblem: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
    figure: "text-emerald-400",
  },
  red: {
    Icon: CircleX,
    emblem: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
    figure: "text-rose-300",
  },
} as const;

/**
 * The invoice sheet as a receipt (the owner, 23/10/2026: the plain sentence
 * sheet "nhìn xấu và AI quá"): the state's emblem and title centred, the
 * figure the sheet is about printed large, then the receipt's lines (what
 * was asked, the fee, the balance after) and one red button with a quiet
 * second way under it. Still the house sheet underneath: the same panel,
 * hairline and buttons as every other notice.
 *
 * Escape, the backdrop and the cross close it; Tab cycles through the cross
 * and the buttons and never into the page behind.
 */
export function TopUpDialog({
  tone,
  title,
  subtitle,
  amount,
  rows,
  children,
  action,
  secondary,
  onClose,
}: TopUpDialogProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const primary = useRef<HTMLElement | null>(null);
  const quiet = useRef<HTMLAnchorElement | null>(null);
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
      if (event.key === "Tab") {
        event.preventDefault();
        const ring = [close.current, primary.current, quiet.current].filter(
          (node): node is HTMLElement => node !== null,
        );
        const at = ring.indexOf(document.activeElement as HTMLElement);
        const step = event.shiftKey ? -1 : 1;
        ring[(at + step + ring.length) % ring.length]?.focus();
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
        className={`error-modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-[2px]${leaving ? " order-modal-backdrop-out" : ""}`}
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
        <div className={`${SHEET} px-6 pb-6 pt-7 sm:px-7`}>
          <button
            ref={close}
            type="button"
            onClick={leave}
            aria-label="Đóng"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-frost"
          >
            <X size={16} aria-hidden />
          </button>

          <div className="flex flex-col items-center text-center">
            <span
              className={`grid h-14 w-14 place-items-center rounded-full ring-1 ${look.emblem}`}
              aria-hidden
            >
              <look.Icon size={28} />
            </span>
            <h2 id="topup-dialog-title" className="mt-4 text-[19px] font-bold leading-snug text-frost">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[12px] font-medium tabular-nums text-neutral-500">{subtitle}</p>
            ) : null}
          </div>

          {amount ? (
            <div className="mt-5 rounded-xl border border-line bg-raise px-4 py-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                {amount.label}
              </p>
              <p className={`mt-1 text-[30px] font-black leading-none tabular-nums ${look.figure}`}>
                {tone === "green" ? "+" : ""}
                {formatVnd(amount.value)}đ
              </p>
            </div>
          ) : null}

          {rows && rows.length > 0 ? (
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[13px]">
                  <dt className="text-mist">{row.label}</dt>
                  <dd className={`tabular-nums text-right ${row.strong ? "font-bold text-frost" : "text-neutral-200"}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {children ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${
                tone === "red"
                  ? "border-rose-500/20 bg-rose-500/[0.06] text-rose-100/90"
                  : "border-line bg-raise text-mist"
              }`}
            >
              {children}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            {action.href ? (
              <Link
                ref={(node) => {
                  primary.current = node;
                }}
                href={action.href}
                onClick={action.onClick}
                className={`w-full ${SHEET_BUTTON}`}
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
                className={`w-full ${SHEET_BUTTON}`}
              >
                {action.label}
              </button>
            )}
            {secondary ? (
              <Link ref={quiet} href={secondary.href} className={`w-full ${SHEET_BUTTON_QUIET}`}>
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
