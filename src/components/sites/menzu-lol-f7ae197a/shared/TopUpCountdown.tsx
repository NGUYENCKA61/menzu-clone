"use client";

import { formatCountdown } from "@/lib/topup";

import { useClientNow } from "./useClientClock";

/**
 * Milliseconds left until `deadline`, or null while that is not yet knowable.
 *
 * Null through hydration for the reason the shared clock is: the server and
 * the browser do not agree on what time it is, and writing two different
 * numbers into one element is a mismatch by construction.
 */
export function useTimeLeft(deadline: string | null): number | null {
  const now = useClientNow();
  if (now === null || !deadline) return null;
  const at = new Date(deadline).getTime();
  return Number.isFinite(at) ? at - now : null;
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
