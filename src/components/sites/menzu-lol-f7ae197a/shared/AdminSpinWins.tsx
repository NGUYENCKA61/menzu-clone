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

const REPLY_FIELD =
  "h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-[11px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900";

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
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-zinc-600">
        <Gift size={13} className="text-zinc-400" />
        Quà vòng quay cần gửi ({pending.length})
      </span>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-[11px] text-zinc-500">
          Chưa có phần quà nào chờ gửi.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {slice.map((win) => (
            <div
              key={win.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"
            >
              <span className="min-w-[140px] flex-1 truncate text-xs font-bold text-zinc-900">
                {win.label}
              </span>
              {/* Nothing can be posted until the winner has said where to. The
                  row says which of the two it is waiting on rather than
                  looking identical in both cases. */}
              {win.address ? null : (
                <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                  Chờ khách điền địa chỉ
                </span>
              )}
              <span className="shrink-0 text-[11px] text-zinc-600">
                {win.username}{" "}
                <span className="tabular-nums text-zinc-400">#{win.uid}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                {win.createdAt}
              </span>
              <button
                type="button"
                disabled={busy === win.id}
                onClick={() => void mark(win.id, true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
              >
                <PackageCheck size={12} />
                Đã gửi
              </button>

              {/* The whole address on its own line under the row: it is the one
                  thing here somebody has to copy onto a parcel, and squeezing
                  it into the row would truncate the half with the ward in it. */}
              {win.address ? (
                <div className="w-full border-t border-amber-200/70 pt-2 text-[11.5px] leading-relaxed text-zinc-700">
                  <b className="text-zinc-900">{win.recipient}</b>
                  {win.phone ? (
                    <span className="ml-2 font-mono text-zinc-600">{win.phone}</span>
                  ) : null}
                  <p className="mt-0.5 text-zinc-600">{win.address}</p>
                  {win.note ? (
                    <p className="mt-0.5 text-zinc-500">Ghi chú: {win.note}</p>
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
                      className={`${REPLY_FIELD} w-40 font-mono`}
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
                      placeholder="Lời nhắn gửi khách, gửi qua GHTK, 2-3 ngày…"
                      className={`${REPLY_FIELD} min-w-[220px] flex-1`}
                    />
                    <button
                      type="button"
                      disabled={busy === win.id}
                      onClick={() => void answer(win.id)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
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
        <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
          <span className="text-[12px] font-semibold text-zinc-500">
            Đã gửi gần đây
          </span>
          {sent.slice(0, 5).map((win) => (
            <div
              key={win.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <span className="min-w-[140px] flex-1 truncate text-xs text-zinc-600">
                {win.label}
              </span>
              <span className="shrink-0 text-[11px] text-zinc-500">
                {win.username}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                {win.createdAt}
              </span>
              <button
                type="button"
                disabled={busy === win.id}
                onClick={() => void mark(win.id, false)}
                title="Đánh dấu lại là chưa gửi"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-40"
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
