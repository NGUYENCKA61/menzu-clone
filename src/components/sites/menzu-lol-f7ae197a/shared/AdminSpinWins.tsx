"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, PackageCheck, Undo2 } from "lucide-react";

import { pageCount, PER_PAGE } from "@/lib/paging";

import { Pager } from "./Pager";

export interface SpinWinRow {
  id: string;
  label: string;
  username: string;
  uid: number;
  createdAt: string;
  sent: boolean;
  /** Where it goes, once the winner has said. Null while they have not. */
  recipient: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  /** What the shop has answered with, if anything yet. */
  tracking: string | null;
  shopNote: string | null;
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
  /** What is typed into each row's reply boxes, keyed by win. */
  const [reply, setReply] = useState<Record<string, { tracking: string; note: string }>>(
    {},
  );

  /**
   * Sends the courier number and whatever the shop wrote with it.
   *
   * Separate from the "đã gửi" tick on purpose: a shop can have a number before
   * the parcel moves and can post something it never got a number for, so one
   * must not decide the other.
   */
  async function answer(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/spin-wins/tracking", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          tracking: reply[id]?.tracking ?? "",
          note: reply[id]?.note ?? "",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không gửi được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  const pending = wins.filter((win) => !win.sent);
  const sent = wins.filter((win) => win.sent);

  // Ten at a time, like every other admin list. A queue this screen exists to
  // empty is worked from the top down, and forty addresses on one page is a
  // page nobody finishes — each row here is a parcel to write out by hand.
  const [page, setPage] = useState(0);
  const pages = pageCount(pending.length, PER_PAGE);
  // Clamped rather than reset: ticking the last parcel on page 4 should leave
  // the admin on the last page there is, not send them back to the top.
  const current = Math.min(page, pages - 1);
  const slice = pending.slice(current * PER_PAGE, (current + 1) * PER_PAGE);

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
          {slice.map((win) => (
            <div
              key={win.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2"
            >
              <span className="flex-1 min-w-[140px] truncate text-xs font-bold text-white">
                {win.label}
              </span>
              {/* Nothing can be posted until the winner has said where to. The
                  row says which of the two it is waiting on rather than
                  looking identical in both cases. */}
              {win.address ? null : (
                <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                  Chờ khách điền địa chỉ
                </span>
              )}
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

              {/* The whole address on its own line under the row: it is the one
                  thing here somebody has to copy onto a parcel, and squeezing
                  it into the row would truncate the half with the ward in it. */}
              {win.address ? (
                <div className="w-full border-t border-white/[0.06] pt-2 text-[11.5px] leading-relaxed text-neutral-300">
                  <b className="text-white">{win.recipient}</b>
                  {win.phone ? (
                    <span className="ml-2 font-mono text-neutral-400">{win.phone}</span>
                  ) : null}
                  <p className="mt-0.5 text-neutral-400">{win.address}</p>
                  {win.note ? (
                    <p className="mt-0.5 text-neutral-500">Ghi chú: {win.note}</p>
                  ) : null}

                  {/* What the winner is waiting on. Written here rather than on
                      a screen of its own: the address it answers is right
                      above it, and copying a courier number between two pages
                      is how a number ends up on the wrong parcel. */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <input
                      value={reply[win.id]?.tracking ?? win.tracking ?? ""}
                      onChange={(e) =>
                        setReply((r) => ({
                          ...r,
                          [win.id]: {
                            tracking: e.target.value,
                            note: r[win.id]?.note ?? win.shopNote ?? "",
                          },
                        }))
                      }
                      placeholder="Mã vận đơn"
                      className="h-8 w-40 rounded-lg border border-white/10 bg-neutral-950/60 px-2.5 font-mono text-[11px] text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--brand)]/60"
                    />
                    <input
                      value={reply[win.id]?.note ?? win.shopNote ?? ""}
                      onChange={(e) =>
                        setReply((r) => ({
                          ...r,
                          [win.id]: {
                            tracking: r[win.id]?.tracking ?? win.tracking ?? "",
                            note: e.target.value,
                          },
                        }))
                      }
                      placeholder="Lời nhắn gửi khách — gửi qua GHTK, 2-3 ngày…"
                      className="h-8 min-w-[220px] flex-1 rounded-lg border border-white/10 bg-neutral-950/60 px-2.5 text-[11px] text-white outline-none transition-colors placeholder-neutral-600 focus:border-[var(--brand)]/60"
                    />
                    <button
                      type="button"
                      disabled={busy === win.id}
                      onClick={() => void answer(win.id)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/20 disabled:opacity-40"
                    >
                      Gửi cho khách
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          <Pager
            page={current}
            pageCount={pages}
            onSelect={setPage}
            total={pending.length}
            pageSize={PER_PAGE}
            unit="phần quà"
          />
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
