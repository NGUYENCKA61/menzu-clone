"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, PackageCheck, Undo2 } from "lucide-react";

export interface SpinWinRow {
  id: string;
  label: string;
  username: string;
  uid: number;
  createdAt: string;
  sent: boolean;
}

const CARD =
  "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";
const HEAD =
  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * The parcels the wheel owes.
 *
 * Money and points settle themselves; a physical prize does not, so it waits
 * here until someone says it went out. Without this screen the wheel would be
 * promising things nobody in the shop could see it had promised.
 */
export function AdminSpinWins({ wins }: { wins: SpinWinRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = wins.filter((win) => !win.sent);
  const sent = wins.filter((win) => win.sent);

  async function mark(id: string, sentNext: boolean) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/spin-wins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, sent: sentNext }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không cập nhật được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={CARD}>
      <span className={HEAD}>
        <Gift size={13} className="text-neutral-400" />
        Quà vòng quay cần gửi ({pending.length})
      </span>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400"
        >
          {error}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-neutral-500">
          Chưa có phần quà nào chờ gửi.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pending.map((win) => (
            <div
              key={win.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2"
            >
              <span className="flex-1 min-w-[140px] truncate text-xs font-bold text-white">
                {win.label}
              </span>
              <span className="shrink-0 text-[11px] text-neutral-400">
                {win.username}{" "}
                <span className="text-neutral-600 tabular-nums">#{win.uid}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                {win.createdAt}
              </span>
              <button
                type="button"
                disabled={busy === win.id}
                onClick={() => void mark(win.id, true)}
                className="h-8 shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <PackageCheck size={12} />
                Đã gửi
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Kept in view rather than filed away: a customer asking "shop gửi chưa"
          is answered from this list, and a wrong tick has to be undoable. */}
      {sent.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
            Đã gửi gần đây
          </span>
          {sent.slice(0, 5).map((win) => (
            <div
              key={win.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white/[0.06] bg-neutral-950/50 px-3 py-2"
            >
              <span className="flex-1 min-w-[140px] truncate text-xs text-neutral-400">
                {win.label}
              </span>
              <span className="shrink-0 text-[11px] text-neutral-500">
                {win.username}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-neutral-600">
                {win.createdAt}
              </span>
              <button
                type="button"
                disabled={busy === win.id}
                onClick={() => void mark(win.id, false)}
                title="Đánh dấu lại là chưa gửi"
                className="h-8 w-8 shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-500 transition-colors hover:text-white disabled:opacity-40 inline-flex items-center justify-center"
              >
                <Undo2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
