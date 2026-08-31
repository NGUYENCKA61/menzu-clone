"use client";

import { Bell, BellRing } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const BASE =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-60";
const OFF =
  "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white";
const ON =
  "border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/15";

/**
 * "Nhận thông báo" for one tool: follow it and its status changes land on
 * the bell. A guest gets the same chip as a link to sign in, and comes back
 * to where they pressed it.
 *
 * Calls router.refresh() after a change so the server-drawn parts that
 * depend on it — the bell's list, the subscribe list on /thong-bao — catch
 * up without a reload.
 */
export function StatusSubscribeButton({
  productCode,
  initial,
  loginNext,
}: {
  productCode: string;
  /** Following now; null for a guest, who cannot follow anything. */
  initial: boolean | null;
  loginNext: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial === true);
  const [busy, setBusy] = useState(false);

  if (initial === null) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(loginNext)}`}
        className={`${BASE} ${OFF}`}
      >
        <Bell size={12} />
        Nhận thông báo
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    try {
      const res = await fetch("/api/status-subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productCode, subscribed: next }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }
      if (res.ok) {
        setOn(next);
        router.refresh();
      }
    } catch {
      // Left as it was; the next press tries again.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className={`${BASE} ${on ? ON : OFF}`}
    >
      {on ? <BellRing size={12} /> : <Bell size={12} />}
      {on ? "Đang nhận thông báo" : "Nhận thông báo"}
    </button>
  );
}
