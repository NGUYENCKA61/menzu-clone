"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export interface ErrorModalProps {
  /** What failed — "Đăng nhập thất bại". The message below says why. */
  title: string;
  message: string;
  onClose: () => void;
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
export function ErrorModal({ title, message, onClose }: ErrorModalProps) {
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirm.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="error-modal-backdrop absolute inset-0 bg-black/75"
        onClick={onClose}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-message"
        // A red outline instead of the house sheet's white hairline: the strip
        // this replaced was drawn with the same red border, and it is the one
        // cue that says "error" before a single word is read. 1.5px, as the
        // category page's red-rimmed search field draws it.
        className="error-modal-card relative w-full max-w-[380px] rounded-xl border-[1.5px] border-red-500/40 bg-[#131316] px-7 py-8 text-center shadow-2xl shadow-red-950/40"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/15 text-red-500">
          <X size={30} strokeWidth={3} />
        </span>

        <h2
          id="error-modal-title"
          className="mt-5 text-[17px] font-black uppercase tracking-wide text-white"
        >
          {title}
        </h2>

        <p id="error-modal-message" className="mt-3 text-[13px] leading-relaxed text-neutral-300">
          {message}
        </p>

        <button
          ref={confirm}
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-lg bg-[var(--menzu-accent)] text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
