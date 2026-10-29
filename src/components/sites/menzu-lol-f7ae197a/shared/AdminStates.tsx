"use client";

import { AlertTriangle, Inbox, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { useOverlayPresence } from "./useOverlayPresence";

/**
 * The admin's shared states and small controls, white since the 30/10/2026
 * rebuild ("đập đi xây lại… màu trắng"). Same exports and props as the dark
 * originals, so every screen that leans on them crossed over for free.
 */

/** Spinner for a panel that is fetching. */
export function AdminLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500"
    >
      <Loader2 size={22} className="animate-spin text-zinc-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Nothing to show yet — distinct from "your filter matched nothing". */
export function AdminEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
      <Inbox size={24} className="text-zinc-300" />
      <p className="text-sm font-bold text-zinc-900">{title}</p>
      {body ? <p className="max-w-[420px] text-xs leading-relaxed text-zinc-500">{body}</p> : null}
      {action}
    </div>
  );
}

/** A failed request, with the message the server actually sent. */
export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 py-12 text-center"
    >
      <AlertTriangle size={22} className="text-rose-500" />
      <p className="text-sm font-bold text-rose-600">Không tải được dữ liệu</p>
      <p className="max-w-[420px] text-xs text-zinc-500">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-9 rounded-lg border border-zinc-300 bg-white px-4 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  /** Red styling for anything that destroys or reverses money. */
  danger?: boolean;
  pending?: boolean;
  /** A field between the body and the buttons, for the one action that needs
   *  a figure typed before it goes — the amount a transfer actually carried. */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation before an irreversible admin action.
 *
 * Focus moves to the dialog on open and Escape closes it. Without that, a
 * keyboard user tabs straight past the dialog into the page behind it and can
 * trigger the very thing the dialog is guarding.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Xác nhận",
  danger = false,
  pending = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const { mounted, leaving } = useOverlayPresence(open);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    // The same lock and the same Tab trap as every other overlay: this one
    // fronts the storefront too (the wheel's exchange button), and a
    // confirm box the page scrolls away behind reads as pasted on.
    lockScroll();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Tab" && panel.current) trapTab(panel.current, event);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, onCancel]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" inert={leaving}>
      {/* Clicking the backdrop cancels — the safe outcome, never the action. */}
      <div
        className={`order-modal-backdrop absolute inset-0 bg-zinc-950/40 backdrop-blur-sm${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={onCancel}
      />

      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className={`order-modal-card relative w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl outline-none${leaving ? " order-modal-card-out" : ""}`}
        style={{ colorScheme: "light" }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-zinc-900"
        >
          <X size={16} />
        </button>

        <h2 id="confirm-title" className="pr-6 text-base font-black text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{body}</p>
        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`h-10 flex-1 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${
              danger ? "bg-rose-600 hover:bg-rose-500" : "bg-zinc-900 hover:bg-zinc-700"
            }`}
          >
            {pending ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The admin's search box: one shape for every screen that filters a list.
 * The wrapper is a label, so a click anywhere on the field — the icon
 * included — puts the cursor in the input.
 */
export function AdminSearch({
  value,
  onChange,
  placeholder,
  label,
  className = "",
  maxLength = 80,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Read out instead of the placeholder, which disappears once typing starts. */
  label: string;
  className?: string;
  maxLength?: number;
}) {
  return (
    <label className={`relative block ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        maxLength={maxLength}
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-[13px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
      />
    </label>
  );
}
