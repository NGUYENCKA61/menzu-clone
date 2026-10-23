"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import Link from "next/link";

import { useEffect, useRef, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "./modalChrome";
import { SHEET, SHEET_BUTTON, SHEET_BUTTON_QUIET, SHEET_TITLE } from "./noticeSheet";
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
  /** The figure the sheet is about: the first line of the receipt, in green. */
  amount?: { label: string; value: number };
  /** The receipt's other lines, in order. */
  rows?: TopUpReceiptRow[];
  /** A sentence of its own, the refusal's reason on a red sheet. */
  children?: ReactNode;
  /** The one red button: a way on, as a link or an action. */
  action: { label: string; href?: string; onClick?: () => void };
  /** The quiet button beside it, as a link. */
  secondary?: { label: string; href: string };
  /**
   * "menzu" is the cut the owner chose on 23/10/2026 ("như menzu mà màu đỏ",
   * then "trắng thì nút", then "như này đi"): the tile, the title, one
   * sentence and the figure centred, one white button; "receipt" is the
   * hairline table the checkout receipt uses, kept for the purchase flows.
   */
  layout?: "receipt" | "menzu";
  /**
   * Opened in place of another dialog (the confirm card turning into the
   * paid notice): the dark ground is already there, so it does not fade
   * in again, and the sheet settles where the card stood.
   */
  handoff?: boolean;
  /** LAB (23/10/2026, "nút trắng thành màu xám thử"): the paid notice's
   *  one button in grey instead of white. */
  grey?: boolean;
  onClose: () => void;
}

const TONE = {
  green: { Icon: CircleCheck, icon: "text-emerald-400", figure: "text-emerald-400" },
  red: { Icon: CircleX, icon: "text-rose-400", figure: "text-rose-300" },
} as const;

/**
 * The invoice sheet as a receipt, cut like the checkout's own (the owner,
 * 23/10/2026: the one-sentence sheet "nhìn xấu và AI quá", then "làm sao
 * đừng AI"): the house title, left with its small glyph, the request code
 * and time under it, one hairline table whose first line is the figure the
 * sheet is about, the refusal's reason in its own line, and the checkout's
 * footer, a quiet button beside the red one. No emblem, no capitals, no
 * stacked buttons. The system announcement sheet is not this component.
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
  layout = "receipt",
  handoff = false,
  grey = false,
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
        const ring = [close.current, quiet.current, primary.current].filter(
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

  // LAB: menzu's sheet keeps menzu's white button ("trắng thì nút").
  const primaryClass =
    layout === "menzu" && grey
      ? "press inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] px-5 text-[14px] font-semibold text-white hover:border-white/20 hover:bg-white/[0.12]"
      : layout === "menzu"
      ? "press inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-white px-5 text-[14px] font-semibold text-black hover:bg-neutral-200"
      : `flex-1 ${SHEET_BUTTON}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      <div
        className={`${handoff ? "" : "error-modal-backdrop "}absolute inset-0 bg-black/70${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />

      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-dialog-title"
        tabIndex={-1}
        className={`${handoff ? "notice-modal-swap" : "notice-modal-card"} w-full max-w-md relative z-10 outline-none${leaving ? " order-modal-card-out" : ""}`}
      >
        <div className={`${SHEET} px-6 py-6`}>
          <button
            ref={close}
            type="button"
            onClick={leave}
            aria-label="Đóng"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-dim transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-white/5 hover:text-frost"
          >
            <X size={16} aria-hidden />
          </button>

          {layout === "menzu" ? (
            // LAB ("như menzu mà màu đỏ"): menzu's own cut, the tile and the
            // sentence, with the house red on the one button below.
            <div className="flex flex-col items-center pt-4 text-center">
              <span
                className={`grid h-16 w-16 place-items-center rounded-2xl border ${
                  tone === "green"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10"
                }`}
              >
                <look.Icon
                  size={32}
                  strokeWidth={2}
                  // LAB (23/10/2026, "thử đi"): the tick draws itself once
                  // the sheet has settled; the red cross does not move.
                  className={`${look.icon}${tone === "green" ? " tick-draw" : ""}`}
                  aria-hidden
                />
              </span>
              <h2 id="topup-dialog-title" className="mt-5 text-[22px] font-bold leading-snug text-frost">
                {title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-mist">
                {children ?? (tone === "green" ? "Tài khoản của bạn đã được cộng" : "Hóa đơn này đã bị từ chối.")}
              </p>
              {amount ? (
                <p className={`mt-1.5 text-[22px] font-bold leading-none tabular-nums ${look.figure}`}>
                  {formatVnd(amount.value)}đ
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <h2 id="topup-dialog-title" className={`${SHEET_TITLE} pr-10`}>
                <look.Icon size={18} className={`shrink-0 ${look.icon}`} aria-hidden />
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-[12px] font-medium tabular-nums text-dim">{subtitle}</p>
              ) : null}
            </>
          )}

          {layout !== "menzu" && (amount || (rows && rows.length > 0)) ? (
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
              {amount ? (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-[13px] text-mist">{amount.label}</dt>
                  <dd className={`text-[20px] font-bold leading-none tabular-nums ${look.figure}`}>
                    {tone === "green" ? "+" : ""}
                    {formatVnd(amount.value)}đ
                  </dd>
                </div>
              ) : null}
              {(rows ?? []).map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[13px]">
                  <dt className="text-mist">{row.label}</dt>
                  <dd className={`text-right tabular-nums ${row.strong ? "font-bold text-frost" : "text-neutral-200"}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {children && layout !== "menzu" ? (
            <p
              className={`mt-3 text-[13px] leading-relaxed ${
                tone === "red" ? "text-rose-200/90" : "text-mist"
              }`}
            >
              {children}
            </p>
          ) : null}

          <div className="mt-6 flex gap-2.5">
            {secondary && layout !== "menzu" ? (
              <Link ref={quiet} href={secondary.href} className={`flex-1 ${SHEET_BUTTON_QUIET}`}>
                {secondary.label}
              </Link>
            ) : null}
            {action.href ? (
              <Link
                ref={(node) => {
                  primary.current = node;
                }}
                href={action.href}
                onClick={action.onClick}
                className={primaryClass}
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
                className={primaryClass}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
