"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { useOverlayPresence } from "./useOverlayPresence";

/**
 * The storefront's confirmation dialog — the dark original, word for word.
 *
 * When the admin went white (30/10/2026) this box was shared three ways:
 * admin screens, the wheel's exchange button and the commission withdraw.
 * The last two front the DARK storefront, which the owner said not to touch,
 * so they keep this copy while AdminStates' ConfirmDialog turned white.
 */
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
      <div className={`order-modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm${leaving ? " order-modal-backdrop-out" : ""}`} onClick={onCancel} />

      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className={`order-modal-card relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-panel p-6 shadow-2xl outline-none${leaving ? " order-modal-card-out" : ""}`}
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
        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[13px] font-semibold text-neutral-300 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`flex-1 h-10 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-wait ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-[var(--brand-dark)] hover:bg-[var(--brand)]"
            }`}
          >
            {pending ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
