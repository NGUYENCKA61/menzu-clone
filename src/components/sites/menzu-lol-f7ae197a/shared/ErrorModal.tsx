"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { lockScroll, unlockScroll } from "./modalChrome";
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
        // A red outline instead of the house sheet's white hairline: the strip
        // this replaced was drawn with the same red border, and it is the one
        // cue that says "error" before a single word is read. 1.5px, as the
        // category page's red-rimmed search field draws it.
        className={`relative w-full max-w-[380px] rounded-xl border-[1.5px] bg-[#131316] px-7 py-8 text-center shadow-2xl ${
          done
            ? "notice-modal-card border-white/10 shadow-black/60"
            : "error-modal-card border-red-500/40 shadow-red-950/40"
        }${leaving ? " order-modal-card-out" : ""}`}
      >
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 ${
            done
              ? "border-neutral-500 bg-white/5 text-neutral-200"
              : "border-red-500 bg-red-500/15 text-red-500"
          }`}
        >
          {done ? <Check size={30} strokeWidth={3} /> : <X size={30} strokeWidth={3} />}
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
          onClick={leave}
          className="mt-6 h-11 w-full rounded-lg bg-[var(--menzu-accent)] text-[13px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          {done ? "Đóng" : "Thử lại"}
        </button>
      </div>
    </div>
  );
}
