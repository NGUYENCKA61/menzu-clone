"use client";

import { Check, Loader2, ShoppingCart, Ticket, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { useOverlayPresence } from "./useOverlayPresence";
import { formatVnd } from "./productData";
import {
  VOUCHER_APPLIED,
  VOUCHER_ICON,
  VOUCHER_LABEL,
  voucherButtonClass,
  voucherInputClass,
} from "./voucherLook";

/*
 * The buy-confirm dialog the account page and the software page share.
 *
 * Buying spends real balance, so each panel asks once and shows the figure
 * it is about to take — after any voucher — before it does. The shell, the
 * product tile, the voucher box and the "Tổng thanh toán" block live here so the
 * two dialogs are one dialog with different price lines in the middle; each
 * panel keeps its own lines and its own buy call. Same dress as the order
 * receipt: neutral card, one red bar, the sum in red, and the label and
 * button styles of the account area throughout.
 */

const LABEL =
  "flex items-center gap-1.5 text-[12px] font-semibold ";
const TILE = "rounded-xl border border-white/[0.06] bg-white/[0.02]";
/** The footer pair, exported so a view other than the confirm one — the
 *  "đã mua" view — can close with the same two buttons. */
export const FOOTER_PRIMARY_BTN =
  "inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--menzu-accent)] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]";
export const FOOTER_GHOST_BTN =
  "inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 text-[13px] font-semibold text-neutral-300 transition-colors hover:bg-white/5";

/**
 * The card over the backdrop, with the header and the footer strip.
 *
 * Esc and a click on the backdrop close it; focus moves into the card on
 * open, cycles inside it, and returns to whatever opened it on close; the
 * page behind does not scroll while it is up. Portalled to `document.body`
 * so no stacking context above it can put it under the site header.
 */
export function BuyConfirmDialog({
  open,
  onClose,
  title = "Xác nhận mua",
  subtitle = "Kiểm tra lại đơn trước khi trừ ví.",
  children,
  footer,
  accent = "brand",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "success" dresses the receipt: the title bar turns emerald. */
  accent?: "brand" | "success";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through a ref so a panel can pass a fresh arrow each render
  // without the open effect re-running — and re-focusing the card — on
  // every keystroke in the voucher box.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  // A drag that starts in the card and ends past its edge is a selection,
  // not a dismissal — only a press that began on the backdrop closes.
  const pressedBackdrop = useRef(false);
  const { mounted, leaving } = useOverlayPresence(open);

  useEffect(() => {
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    panel?.focus();
    lockScroll();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && panel) trapTab(panel, event);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      opener?.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`order-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md${leaving ? " order-modal-backdrop-out" : ""}`}
      inert={leaving}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`order-modal-card relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_25px_80px_rgba(0,0,0,0.7)] outline-none${leaving ? " order-modal-card-out" : ""}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-start gap-3">
            {/* The page titles' own mark in the accent (AccountPanel) in place of
                the 3px bar (the owner, 23/10/2026: "dấu | nên thay bằng cái icon
                giỏ hàng"): a cart while the buyer decides, a tick once paid. */}
            {accent === "success" ? (
              <Check size={20} strokeWidth={2.5} aria-hidden className="mt-0.5 shrink-0 text-emerald-400" />
            ) : (
              <ShoppingCart size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--menzu-accent)]" />
            )}
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-white"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 gap-2.5 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The head of a receipt: a small tick and the order code.
 *
 * One piece for every purchase on the site — a tool, an account, a basket —
 * so paying for anything is answered the same way. LAB (17/10/2026): the
 * house notice look, a small green tick beside the label instead of the
 * round badge, its ring and sparks. The code keeps its box: it is the one
 * thing on the receipt the buyer has to keep.
 */
export function ReceiptTick({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center pt-1 text-center">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-mist">
        <Check size={16} strokeWidth={2.5} aria-hidden className="shrink-0 text-emerald-400" />
        Mã đơn hàng
      </p>
      <span className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-base font-bold tracking-wider text-white">
        {code}
      </span>
    </div>
  );
}

/** What is being bought, as its card showed it: picture, name, one chip. */
export function ProductTile({
  imageUrl,
  imageClassName = "object-cover",
  name,
  chip,
  meta,
}: {
  imageUrl: string | null;
  /** Where the picture is cropped from; account banners keep their subject
   *  to the right. */
  imageClassName?: string;
  name: string;
  /** A tier for a tool, a rank for an account; null draws nothing. */
  chip: string | null;
  meta: string;
}) {
  // An account's by-code picture is a guess at a path; when nothing is
  // there the dark box stays empty rather than showing the broken-image
  // glyph.
  const [broken, setBroken] = useState(false);
  return (
    <div className={`flex items-center gap-3 p-3 ${TILE}`}>
      <span className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
        {imageUrl && !broken ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="144px"
            className={imageClassName}
            onError={() => setBroken(true)}
          />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {chip ? (
            <span className="rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[12px] font-medium text-frost/90">
              {chip}
            </span>
          ) : null}
          <span className="text-[11px] font-semibold text-neutral-500">
            {meta}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PriceList({ children }: { children: ReactNode }) {
  return <dl className="space-y-1.5 text-[13px] tabular-nums">{children}</dl>;
}

/** One label/figure line; "ok" is a cut in green, "strike" a crossed-out
 *  shelf price. */
export function PriceRow({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "ok" | "strike";
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={tone === "ok" ? "text-emerald-400" : "text-neutral-500"}>
        {label}
      </dt>
      <dd
        className={
          tone === "ok"
            ? "font-bold text-emerald-400"
            : tone === "strike"
              ? "font-semibold text-neutral-500 line-through"
              : "font-semibold text-white"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The voucher box. The code is priced before the customer commits — the
 * panel behind `onApply` asks /api/vouchers/check, which runs the checkout
 * rules themselves, so what is quoted here is what is charged.
 */
export function VoucherField({
  value,
  onChange,
  onApply,
  checking,
  error,
  applied,
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  checking: boolean;
  error: string | null;
  applied: { cut: number } | null;
}) {
  const id = useId();
  const ready = !checking && value.trim().length > 0;
  return (
    <div className={`p-3 ${TILE}`}>
      {/* The basket's summary wears the same box (voucherLook). */}
      <label htmlFor={id} className={`mb-2 ${VOUCHER_LABEL}`}>
        <Ticket className={VOUCHER_ICON} />
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          // Upper-cased as typed, so what the box shows is what is sent: the
          // CSS `uppercase` below only dressed the letters, and a code typed
          // in lower case was refused as "không tồn tại" while it looked
          // right on screen. The cart's box already does this.
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (ready) onApply();
            }
          }}
          placeholder="Nhập mã voucher"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className={voucherInputClass(value.trim().length > 0)}
        />
        <button
          type="button"
          disabled={!ready}
          onClick={onApply}
          className={voucherButtonClass(value.trim().length > 0 && applied === null)}
        >
          {checking ? "Đang kiểm…" : "Áp dụng"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-red-400">
          {error}
        </p>
      ) : null}
      {applied ? (
        <p className={VOUCHER_APPLIED}>Đã áp dụng mã</p>
      ) : null}
    </div>
  );
}

/**
 * The figure the decision turns on, and under it the one wallet fact that
 * matters at that moment: what will be left after the purchase when the
 * wallet can cover it, or the balance and the gap when it cannot — the
 * buyer then needs to see why the button below says "Nạp tiền" and by how
 * much. A wallet that has not answered yet (null; a guest stays null too)
 * adds nothing.
 */
export function PayableBlock({
  payable,
  balance,
}: {
  payable: number;
  balance: number | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/[0.06] p-4">
      <div className="flex items-end justify-between gap-4">
        <span className={`text-neutral-400 ${LABEL}`}>
          <Wallet className="h-3.5 w-3.5" />
          Tổng thanh toán
        </span>
        <span className="text-xl font-black tabular-nums text-[var(--menzu-accent)]">
          {formatVnd(payable)}đ
        </span>
      </div>
      {balance !== null ? (
        <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-[12px] tabular-nums">
          {balance >= payable ? (
            <div className="flex justify-between gap-4">
              <span className="text-neutral-500">Số dư ví còn lại</span>
              <span className="font-semibold text-white">
                {formatVnd(balance - payable)}đ
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Số dư ví</span>
                <span className="font-semibold text-white">
                  {formatVnd(balance)}đ
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Cần nạp thêm</span>
                <span className="font-bold text-red-400">
                  {formatVnd(payable - balance)}đ
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A refusal from the buy call, or the word that it went through. */
export function DialogAlert({
  tone,
  children,
}: {
  tone: "ok" | "err";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "err" ? "alert" : "status"}
      className={
        tone === "ok"
          ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
          : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
      }
    >
      {children}
    </p>
  );
}

/**
 * Huỷ beside the one action that makes sense: confirm when the wallet can
 * cover it, otherwise the way to top up — pressing confirm then would only
 * fetch the same refusal.
 */
export function ConfirmFooter({
  onCancel,
  onConfirm,
  busy,
  canAfford,
  done = false,
  blocked = false,
  confirmLabel = "Xác nhận",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  canAfford: boolean;
  /** The order went through; the button stays but takes no second press. */
  done?: boolean;
  /** Something in the card above is still waiting on the buyer — a warning
   *  they have to acknowledge. Money is not spent until it is. */
  blocked?: boolean;
  /** What the red button says — "Đăng nhập để mua" for a guest, who is
   *  about to be sent to the login page rather than charged. */
  confirmLabel?: string;
}) {
  return (
    <>
      {/* What the spinner says, for a reader that cannot see it: aria-busy
          on a disabled control is announced by nothing. */}
      <span role="status" aria-live="polite" className="sr-only">{busy ? "Đang xử lý" : ""}</span>
      <button type="button" onClick={onCancel} className={FOOTER_GHOST_BTN}>
        Huỷ
      </button>
      {canAfford ? (
        <button
          type="button"
          disabled={busy || done || blocked}
          aria-busy={busy}
          onClick={onConfirm}
          className={`${FOOTER_PRIMARY_BTN} gap-2 disabled:opacity-60`}
        >
          {/* The one button on the site that takes money, and it only dimmed.
              The spinner every other waiting control wears, so "is it
              doing anything" is answered the same way here. */}
          {busy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? "Đang xử lý…" : confirmLabel}
        </button>
      ) : (
        <Link href="/wallet" className={FOOTER_PRIMARY_BTN}>
          Nạp tiền
        </Link>
      )}
    </>
  );
}
