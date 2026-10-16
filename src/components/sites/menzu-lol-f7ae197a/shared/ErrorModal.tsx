"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { lockScroll, unlockScroll } from "./modalChrome";
import { SHEET, SHEET_BUTTON, SHEET_TEXT, SHEET_TITLE } from "./noticeSheet";
import { useLeave } from "./useOverlayPresence";

export interface ErrorModalProps {
  /** What failed — "Đăng nhập thất bại". The message below says why. */
  title: string;
  message: string;
  onClose: () => void;
  /**
   * "error" is the red cross and "Thử lại"; "done" is the same sheet with a
   * quiet tick and a plain "Đóng" — for a thing that finished as asked and
   * simply needs saying (an invoice withdrawn, say).
   */
  tone?: "error" | "done";
}

/**
 * The house dialog dressed for bad news: same sheet, backdrop and focus
 * behaviour as TopUpSuccessDialog, with the tick swapped for a cross and the
 * celebration copy for the server's reason.
 *
 * It replaced an inline strip under the password field. The strip was easy to
 * miss — it appeared below where the eye had just been, in a card already full
 * of red accents — and on a phone the submit button pushed it off-screen. A
 * failed sign-in is the one thing on this page the visitor must not scroll
 * past.
 *
 * No close cross in the corner: the button is the way out, and Escape and the
 * backdrop do the same thing.
 */
export function ErrorModal({ title, message, onClose, tone = "error" }: ErrorModalProps) {
  const done = tone === "done";
  const confirm = useRef<HTMLButtonElement>(null);
  const { leaving, leave } = useLeave(onClose);

  useEffect(() => {
    confirm.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        leave();
        return;
      }
      // One control, so trapping Tab is just keeping it here — enough to stop
      // it wandering into the form behind the sheet.
      if (event.key === "Tab") {
        event.preventDefault();
        confirm.current?.focus();
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
        className={`error-modal-backdrop absolute inset-0 bg-black/75${leaving ? " order-modal-backdrop-out" : ""}`}
        onClick={leave}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-message"
        // LAB: the house notice sheet (noticeSheet.ts). The error keeps its
        // shake and a red cross beside the title; the frame stays calm.
        className={`${SHEET} max-w-[400px] px-6 py-6 ${done ? "notice-modal-card" : "error-modal-card"}${
          leaving ? " order-modal-card-out" : ""
        }`}
      >
        <h2 id="error-modal-title" className={SHEET_TITLE}>
          {done ? (
            <Check size={18} strokeWidth={2.5} aria-hidden className="shrink-0 text-mist" />
          ) : (
            <X size={18} strokeWidth={2.5} aria-hidden className="shrink-0 text-rose-400" />
          )}
          {title}
        </h2>

        <p id="error-modal-message" className={`mt-2 ${SHEET_TEXT}`}>
          {message}
        </p>

        <button
          ref={confirm}
          type="button"
          onClick={leave}
          className={`mt-6 w-full ${SHEET_BUTTON}`}
        >
          {done ? "Đóng" : "Thử lại"}
        </button>
      </div>
    </div>
  );
}
