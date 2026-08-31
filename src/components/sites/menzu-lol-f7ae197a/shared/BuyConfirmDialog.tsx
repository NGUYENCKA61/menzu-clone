"use client";

import { Check, Ticket, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { formatVnd } from "./productData";

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
  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest";
const TILE = "rounded-xl border border-white/[0.06] bg-white/[0.02]";
/** The footer pair, exported so a view other than the confirm one — the
 *  "đã mua" view — can close with the same two buttons. */
export const FOOTER_PRIMARY_BTN =
  "inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--menzu-accent)] text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]";
export const FOOTER_GHOST_BTN =
  "inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/5";

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

  if (!open) return null;

  return createPortal(
    <div
      className="order-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
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
        className="order-modal-card relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101114] shadow-[0_25px_80px_rgba(0,0,0,0.7)] outline-none"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1 h-5 w-[3px] shrink-0 rounded-full ${
                accent === "success" ? "bg-emerald-400" : "bg-[var(--menzu-accent)]"
              }`}
            />
            <div>
              <h2
                id={titleId}
                className="text-base font-black uppercase tracking-wider text-white"
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
            sizes="72px"
            className={imageClassName}
            onError={() => setBroken(true)}
          />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {chip ? (
            <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
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
      <label htmlFor={id} className={`mb-2 text-neutral-500 ${LABEL}`}>
        <Ticket className="h-3.5 w-3.5" />
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold uppercase tracking-wide text-white outline-none transition-colors placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 focus:border-[var(--menzu-accent)]/60"
        />
        <button
          type="button"
          disabled={!ready}
          onClick={onApply}
          className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-white/5"
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
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Đã áp dụng — giảm {formatVnd(applied.cut)}đ
        </p>
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
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  canAfford: boolean;
  /** The order went through; the button stays but takes no second press. */
  done?: boolean;
}) {
  return (
    <>
      <button type="button" onClick={onCancel} className={FOOTER_GHOST_BTN}>
        Huỷ
      </button>
      {canAfford ? (
        <button
          type="button"
          disabled={busy || done}
          onClick={onConfirm}
          className={`${FOOTER_PRIMARY_BTN} disabled:opacity-60`}
        >
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </button>
      ) : (
        <Link href="/wallet" className={FOOTER_PRIMARY_BTN}>
          Nạp tiền
        </Link>
      )}
    </>
  );
}
