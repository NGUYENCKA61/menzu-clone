"use client";

import { Check, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useLeave } from "./useOverlayPresence";

export interface StatusToastProps {
  /** Red with a cross, or green with a tick. Defaults to the bad news. */
  tone?: "error" | "success";
  /** What happened — "Đăng nhập thất bại". The line below says more. */
  title: string;
  message: string;
  onClose: () => void;
}

/**
 * Everything that changes between the two tones, and nothing that doesn't.
 * LAB (the owner, 17/10/2026, on this toast: "cái modal dạng này lab xử lý
 * chưa"): the house notice look, as noticeSheet.ts draws the sheets: a plain
 * panel with a hairline, only the small glyph carries the tone, and the
 * countdown bar is grey. Before: a red or green ring, border and bar.
 */
const TONES = {
  error: { Icon: X, glyph: "text-rose-400" },
  success: { Icon: Check, glyph: "text-emerald-400" },
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
/**
 * One fixed column in the corner that every toast portals into, made the
 * first time a toast needs it. Two toasts used to portal to <body> each
 * with its own fixed box at the same corner and sit on top of each other -
 * the second unreadable, the first unreachable. In a flex column they
 * stack, each with its own slide-in, and the column takes no presses of
 * its own so the page under the gap between two toasts stays live.
 */
function toastColumn(): HTMLElement {
  let column = document.getElementById("status-toast-column");
  if (!column) {
    column = document.createElement("div");
    column.id = "status-toast-column";
    column.className =
      "pointer-events-none fixed right-0 top-0 z-[200] flex w-full max-w-[360px] flex-col items-stretch gap-2";
    document.body.appendChild(column);
  }
  return column;
}

export function StatusToast({
  tone = "error",
  title,
  message,
  onClose,
}: StatusToastProps) {
  const look = TONES[tone];
  // Out the way it came in, sliding back off the edge, whether the clock
  // ran down or the cross was pressed. Under reduced motion the exit is
  // no exit at all - and the clock never runs there, so the cross is the
  // only way out and must still work at once.
  const { leaving, leave } = useLeave(onClose);

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
    <div className="pointer-events-auto w-full">
      <div
        role="alert"
        className={`status-toast relative overflow-hidden rounded-bl-xl border border-line bg-panel shadow-2xl shadow-black/60${leaving ? " status-toast-out" : ""}`}
      >
        <div className="flex items-start gap-2.5 py-3.5 pl-4 pr-10">
          <look.Icon size={18} strokeWidth={2.5} aria-hidden className={`mt-[3px] shrink-0 ${look.glyph}`} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug text-frost">
              {title}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-mist">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={leave}
          aria-label="Đóng thông báo"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-frost"
        >
          <X size={14} />
        </button>

        {/* The animationName guard: toast-in ends on the wrapper above, and an
            animationend arriving here must be the clock's own, not a stray. */}
        <span
          aria-hidden
          onAnimationEnd={(event) => {
            if (event.animationName === "toast-clock") leave();
          }}
          className="status-toast-clock absolute inset-x-0 bottom-0 block h-[2px] bg-white/20"
        />
      </div>
    </div>,
    toastColumn(),
  );
}
