"use client";

import { useEffect, useRef } from "react";

/** What the status endpoint says once a request has been decided. */
export interface TopUpOutcome {
  status: "COMPLETED" | "FAILED";
  /** The face value that was asked for. */
  amount: number;
  /** What the wallet received; the face value on rows that predate the column. */
  credited: number;
  /** The wallet after crediting, as the server read it. */
  balance: number;
  /** The desk's reason, on a refusal. */
  note: string | null;
}

/**
 * Watches one request until it is decided, then says how.
 *
 * While the customer has something outstanding, this asks the shop to check
 * its statement. That is what makes an automatic top-up land in seconds
 * without a cron server — and when auto is off the sync is skipped, so this
 * costs one status request every ten seconds and no more.
 *
 * Watching one specific code, rather than the shop's overall match count,
 * means a poll that was rate limited or that credited somebody else cannot
 * make the page act. Pass null to stop.
 */
export function useTopUpWatch(
  code: string | null,
  autoEnabled: boolean,
  onDecided: (outcome: TopUpOutcome) => void,
): void {
  // The latest callback, read when the answer arrives, so a parent that
  // re-renders every second (the countdown) does not restart the polling.
  const decided = useRef(onDecided);
  useEffect(() => {
    decided.current = onDecided;
  });

  useEffect(() => {
    if (!code) return;
    let stopped = false;
    let timer = 0;

    const tick = async () => {
      try {
        // Ask the shop to read its statement. The answer is ignored: it covers
        // every customer, and may have been served from the rate-limit window.
        if (autoEnabled) await fetch("/api/wallet/sync", { method: "POST" });

        // Then ask about this request specifically, which also catches one
        // settled by an admin between two ticks.
        const response = await fetch(`/api/wallet/status?code=${encodeURIComponent(code)}`);
        const data = (await response.json()) as {
          status?: string;
          amount?: number;
          credited?: number | null;
          balance?: number;
          note?: string | null;
        };
        if (stopped) return;
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          stopped = true;
          window.clearInterval(timer);
          decided.current({
            status: data.status,
            amount: data.amount ?? 0,
            credited: data.credited ?? data.amount ?? 0,
            balance: data.balance ?? 0,
            note: data.note ?? null,
          });
        }
      } catch {
        // A failed poll is not worth telling the customer about; the next one
        // is ten seconds away and the shop can still confirm by hand.
      }
    };

    timer = window.setInterval(tick, 10_000);
    void tick();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [code, autoEnabled]);
}
