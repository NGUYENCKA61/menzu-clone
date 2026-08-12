"use client";

import { useSyncExternalStore } from "react";

import { formatCountdown } from "@/lib/topup";

/**
 * One clock for the whole page.
 *
 * A wallet screen can hold several countdowns at once — the transfer panel and
 * a row per waiting request — and giving each its own interval means several
 * timers waking a moment apart, so the figures visibly disagree by a second.
 * They share this one and tick together.
 *
 * Whole seconds rather than milliseconds because this is read as a snapshot:
 * it has to return the same value until it genuinely changes, or React has no
 * way to know when the subscription is settled.
 */
let nowSeconds = 0;
const listeners = new Set<() => void>();
let clock: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (clock === null) {
    nowSeconds = Math.floor(Date.now() / 1000);
    clock = window.setInterval(() => {
      nowSeconds = Math.floor(Date.now() / 1000);
      for (const notify of listeners) notify();
    }, 1000);
  }

  return () => {
    listeners.delete(listener);
    // Nothing on screen is counting any more; a wallet page left open in a
    // background tab should not keep a timer alive for it.
    if (listeners.size === 0 && clock !== null) {
      window.clearInterval(clock);
      clock = null;
    }
  };
}

/**
 * Milliseconds left until `deadline`, or null while that is not yet knowable.
 *
 * Null on the server, and null through hydration. Two clocks are involved and
 * they do not agree: the page may sit in transit for a while, and a customer
 * whose own clock is ten minutes out would otherwise have the server and the
 * browser rendering different numbers into the same element. The placeholder
 * is the same in both; the real figure arrives once the browser has it.
 */
export function useTimeLeft(deadline: string | null): number | null {
  const now = useSyncExternalStore(
    subscribe,
    () => nowSeconds,
    () => null,
  );

  if (now === null || !deadline) return null;
  const at = new Date(deadline).getTime();
  return Number.isFinite(at) ? at - now * 1000 : null;
}

/** Below this much time left the countdown starts reading as urgent. */
const URGENT_MS = 5 * 60 * 1000;

/**
 * The mm:ss a customer watches while their transfer is in flight.
 *
 * Running out is not a refusal — a transfer that arrives late still credits —
 * so zero reads as "hết giờ" and the surrounding text explains the rest.
 */
export function TopUpCountdown({ deadline }: { deadline: string | null }) {
  const left = useTimeLeft(deadline);

  if (left === null) {
    return <span className="font-mono tabular-nums text-neutral-500">--:--</span>;
  }
  if (left <= 0) {
    return <span className="text-neutral-500">hết giờ</span>;
  }

  return (
    <span
      className={`font-mono tabular-nums ${
        left <= URGENT_MS ? "text-red-400" : "text-amber-300"
      }`}
    >
      {formatCountdown(left)}
    </span>
  );
}
