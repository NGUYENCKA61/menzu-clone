"use client";

import { AlertTriangle, Inbox, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Spinner for a panel that is fetching. */
export function AdminLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-400"
    >
      <Loader2 size={22} className="animate-spin text-indigo-400" />
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <Inbox size={24} className="text-neutral-600" />
      <p className="text-sm font-bold text-white">{title}</p>
      {body ? <p className="text-xs text-neutral-400 max-w-[420px]">{body}</p> : null}
      {action}
    </div>
  );
}

/** A failed request, with the message the server actually sent. */
export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] py-12 text-center"
    >
      <AlertTriangle size={22} className="text-red-400" />
      <p className="text-sm font-bold text-red-400">Không tải được dữ liệu</p>
      <p className="text-xs text-neutral-400 max-w-[420px]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-9 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white transition-colors"
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Clicking the backdrop cancels — the safe outcome, never the action. */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#12141c] p-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <h2 id="confirm-title" className="text-base font-black text-white pr-6">
          {title}
        </h2>
        <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{body}</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-colors disabled:opacity-60 disabled:cursor-wait ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-[var(--brand)] hover:bg-[var(--brand-dark)]"
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
 * The admin's search box.
 *
 * Four screens — người dùng, đơn hàng, tài liệu, thông báo — had already
 * settled on the same markup for this, copied between them: a 40px field on
 * #0e0e11 with the magnifier inset on the left and a rose focus ring. This is
 * that markup, written once, so the fifth screen is the same shape as the four
 * rather than a sixth variant of it.
 *
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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        maxLength={maxLength}
        className="w-full h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors"
      />
    </label>
  );
}
