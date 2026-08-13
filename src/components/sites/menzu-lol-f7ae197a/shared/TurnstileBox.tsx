"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SCRIPT_URL } from "@/lib/turnstile";

/**
 * Cloudflare's widget, in a frame that matches the fields above it.
 *
 * What can and cannot be styled is worth stating: the widget itself is an
 * iframe served by Cloudflare, so its insides — the checkbox, the wording, the
 * tick — are theirs and cannot be recoloured from here. What is ours is the
 * frame around it, which takes the same border, radius, background and padding
 * as the username and password fields, and the theme flag, which is set to
 * dark so the iframe does not arrive as a white slab in the middle of the
 * form.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact" | "flexible";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (id: string) => void;
    };
    onTurnstileReady?: () => void;
  }
}

/** One script tag for the page, however many widgets ask for it. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error("turnstile-script"));
    document.head.appendChild(tag);
  });
  return scriptPromise;
}

export function TurnstileBox({
  siteKey,
  onToken,
}: {
  siteKey: string;
  /** Null whenever there is no usable token: not yet solved, expired, errored. */
  onToken: (token: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Ties the label to the widget for a screen reader without inventing an id.
  const labelId = useId();

  // The callback is read through a ref so re-rendering the parent — which the
  // login form does on every keystroke — cannot tear down and redraw the
  // widget, which would lose a token the visitor has already solved. Kept
  // current in an effect rather than during render, which React forbids.
  const emit = useRef(onToken);
  useEffect(() => {
    emit.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId: string | null = null;
    let dropped = false;

    loadScript()
      .then(() => {
        if (dropped || !host.current || !window.turnstile) return;
        widgetId = window.turnstile.render(host.current, {
          sitekey: siteKey,
          theme: "dark",
          // Fills the frame rather than sitting at Cloudflare's fixed 300px,
          // so the box lines up with the fields above it.
          size: "flexible",
          callback: (token) => emit.current(token),
          // A token is good for a few minutes. When it lapses the button has
          // to go back to disabled, or the visitor presses it and is refused
          // by the server with nothing on screen explaining why.
          "expired-callback": () => emit.current(null),
          "error-callback": () => {
            emit.current(null);
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      dropped = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div className="mt-5">
      <span id={labelId} className="sr-only">
        Xác nhận bạn không phải robot
      </span>
      <div
        ref={host}
        aria-labelledby={labelId}
        className="w-full rounded-2xl border border-white/5 bg-white/5 px-3 py-3 min-h-[68px] flex items-center justify-center"
      />
      {failed ? (
        <p role="alert" className="mt-2 text-[11px] text-red-400">
          Không tải được CAPTCHA. Kiểm tra kết nối mạng rồi tải lại trang.
        </p>
      ) : null}
    </div>
  );
}
