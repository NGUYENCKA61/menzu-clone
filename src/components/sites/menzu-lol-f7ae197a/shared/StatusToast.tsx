"use client";

import { Check, X } from "lucide-react";
import { createPortal } from "react-dom";

export interface StatusToastProps {
  /** Red with a cross, or green with a tick. Defaults to the bad news. */
  tone?: "error" | "success";
  /** What happened — "Đăng nhập thất bại". The line below says more. */
  title: string;
  message: string;
  onClose: () => void;
}

/** Everything that changes between the two tones, and nothing that doesn't. */
const TONES = {
  error: {
    Icon: X,
    ring: "border-red-500 bg-red-500/15 text-red-500",
    shell: "border-red-500/40 shadow-red-950/40",
    clock: "bg-red-500/70",
  },
  success: {
    Icon: Check,
    ring: "border-emerald-500 bg-emerald-500/15 text-emerald-400",
    shell: "border-emerald-500/40 shadow-emerald-950/40",
    clock: "bg-emerald-500/70",
  },
} as const;

/**
 * The auth outcome as a toast: flush in the screen's top-right corner,
 * sliding in from the edge, gone again on its own five seconds later.
 *
 * Unlike the modal this grew out of, it never stops the page — the form is
 * still live underneath, so a visitor whose sign-in failed can already be
 * retyping while the reason is on screen. The trade is deliberate: nothing
 * forces an acknowledgement, so the coloured border and the corner position
 * have to do the catching.
 *
 * The bar along the foot is the countdown, and also the timer itself: the
 * component closes when the bar's CSS animation reports it has finished
 * draining, so how long a toast lives is written in exactly one place
 * (globals.css), and hovering — which pauses the animation — pauses the
 * dismissal with it. Under reduced motion the bar never runs and the toast
 * waits for its close button instead.
 */
export function StatusToast({
  tone = "error",
  title,
  message,
  onClose,
}: StatusToastProps) {
  const look = TONES[tone];

  // Through a portal to <body>. The login card wears transform-gpu, and a
  // transformed ancestor turns position:fixed into "fixed to me" — rendered
  // in place, this toast pinned itself to the card's corner, which is exactly
  // where a screen-corner toast must not be.
  //
  // The typeof guard is the whole SSR story: the toast only ever mounts after
  // a submit, so on the server it simply never renders.
  if (typeof document === "undefined") return null;

  return createPortal(
    // Flush in the corner — no offset. The two corners that touch the edges
    // are squared off, so the toast reads as growing out of the corner
    // instead of a rounded box that missed it by a pixel.
    <div className="fixed right-0 top-0 z-[200] w-full max-w-[360px]">
      <div
        role="alert"
        className={`status-toast relative overflow-hidden rounded-bl-xl border-[1.5px] bg-[#131316] shadow-2xl ${look.shell}`}
      >
        <div className="flex items-start gap-3 py-3.5 pl-4 pr-10">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${look.ring}`}
          >
            <look.Icon size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase tracking-wide text-white">
              {title}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-300">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={14} />
        </button>

        {/* The animationName guard: toast-in ends on the wrapper above, and an
            animationend arriving here must be the clock's own, not a stray. */}
        <span
          aria-hidden
          onAnimationEnd={(event) => {
            if (event.animationName === "toast-clock") onClose();
          }}
          className={`status-toast-clock absolute inset-x-0 bottom-0 block h-[3px] ${look.clock}`}
        />
      </div>
    </div>,
    document.body,
  );
}
