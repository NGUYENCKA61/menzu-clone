"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "./AdminStates";

/** One key still on the shelf. */
export interface ShelfKeyView {
  id: string;
  value: string;
}

/** One key already handed over, and to whom. */
export interface SoldKeyView {
  id: string;
  value: string;
  username: string;
  orderCode: string | null;
  deliveredAt: string;
}

export interface PackageKeysView {
  available: number;
  sold: number;
  /** Keys owed to orders that were paid while the shelf was empty. */
  pending: number;
  shelf: ShelfKeyView[];
  /** Capped — the newest deliveries, not the whole history. */
  recent: SoldKeyView[];
  /** True when `shelf` had to be cut short. */
  shelfTruncated: boolean;
}

const FIELD =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400";
const HEAD = "text-[12px] font-semibold text-zinc-500";
const KEY_TEXT = "flex-1 truncate font-mono text-[11px] text-zinc-800";

/**
 * One tier's key store: what is on the shelf, what went out, and the box the
 * shop pastes new stock into.
 *
 * Adding is the only way stock arrives and the only way a backlog clears — the
 * server serves whoever paid while the shelf was empty in the same transaction
 * that takes the paste, so there is no second button here to forget.
 */
export function AdminPackageKeys({
  packageId,
  keys,
}: {
  packageId: string;
  keys: PackageKeysView;
}) {
  const router = useRouter();
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  /** True while the clear-shelf confirm is on screen. */
  const [clearing, setClearing] = useState(false);
  /** Keys the shop pasted to delete, one per line. */
  const [removePaste, setRemovePaste] = useState("");

  // Counted here rather than trusted from the box's own line count, so the
  // button can say exactly what it is about to send.
  const pending = paste
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const uniquePending = new Set(pending).size;

  async function addKeys() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/software/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId, keys: paste }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        added?: number;
        skipped?: number;
        deliveredKeys?: number;
        deliveredOrders?: number;
      };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không thêm được key" });
        return;
      }

      // The two numbers that are not obvious from the list refreshing under
      // them: what was a duplicate, and what walked straight out to somebody
      // who had already paid.
      const parts = [`Đã thêm ${data.added ?? 0} key`];
      if (data.skipped) parts.push(`${data.skipped} key trùng bị bỏ qua`);
      if (data.deliveredKeys) {
        parts.push(`giao ngay ${data.deliveredKeys} key cho ${data.deliveredOrders} đơn đang chờ`);
      }
      setPaste("");
      setMsg({ tone: "ok", text: parts.join(" · ") });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function removeByValue() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/software/keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId, keys: removePaste }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        sold?: number;
        missing?: number;
      };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không xoá được key" });
        return;
      }
      // Say all three outcomes: what went, what a customer is holding (and
      // therefore stayed), and what was never in this tier to begin with.
      const parts = [`Đã xoá ${data.deleted ?? 0} key`];
      if (data.sold) parts.push(`${data.sold} key đã giao cho khách nên giữ nguyên`);
      if (data.missing) parts.push(`${data.missing} key không có trong gói này`);
      setRemovePaste("");
      setMsg({ tone: "ok", text: parts.join(" · ") });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function clearShelf() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/software/keys?packageId=${encodeURIComponent(packageId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
      };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không xoá được kho key" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã xoá ${data.deleted ?? 0} key khỏi kho` });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-100 bg-zinc-50 px-3 py-3.5">
      {msg ? (
        <p
          className={`text-[11px] ${
            msg.tone === "ok" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      {/* The backlog first: it is the only thing here that is somebody waiting. */}
      {keys.pending > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-700">
          <strong className="font-black">{keys.pending} key đang nợ khách.</strong> Dán
          key vào ô dưới là hệ thống giao ngay cho đơn cũ nhất trước.
        </p>
      ) : null}

      {/* The two pastes side by side: keys in on the left, keys out on the
          right — one motion, two directions, so they read as a pair instead of
          the delete hiding under the shelf. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`paste-${packageId}`} className={HEAD}>
            Thêm key, mỗi dòng một key
          </label>
          <textarea
            id={`paste-${packageId}`}
            rows={3}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder={"ABCD-1234-EFGH\nIJKL-5678-MNOP"}
            className={`${FIELD} resize-y font-mono`}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy || uniquePending === 0}
              onClick={addKeys}
              className="h-[34px] px-4 rounded-lg bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-[12px] font-semibold text-zinc-900 transition-colors inline-flex items-center gap-1.5"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Thêm {uniquePending > 0 ? `${uniquePending} key` : "key"}
            </button>
            {pending.length > uniquePending ? (
              <span className="text-[11px] text-zinc-500">
                {pending.length - uniquePending} dòng trùng nhau sẽ chỉ tính một lần
              </span>
            ) : null}
          </div>
        </div>

        {/* Delete by value: for the key the shop is holding in its clipboard —
            leaked, refunded, mistyped — without hunting the shelf for it. Only
            shelf keys can go; one a customer holds is reported back, not
            touched. */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`remove-${packageId}`} className={HEAD}>
            Xoá theo key, dán key cần xoá
          </label>
          <textarea
            id={`remove-${packageId}`}
            rows={3}
            value={removePaste}
            onChange={(event) => setRemovePaste(event.target.value)}
            placeholder="ABCD-1234-EFGH"
            className={`${FIELD} resize-y font-mono`}
          />
          <button
            type="button"
            disabled={busy || !removePaste.trim()}
            onClick={() => void removeByValue()}
            className="self-start h-[34px] px-4 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-[12px] font-semibold text-rose-600 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 size={11} />
            Xoá key đã nhập
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* The shelf in its own rounded panel: the keys are one list — stock
            waiting to be sold — and a frame around them says so better than
            loose rows floating on the section's ground. Scrolls inside itself
            past ten keys or so, rather than stretching the page. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className={HEAD}>Key còn trong kho ({keys.available})</span>
            {keys.available > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setClearing(true)}
                className="rounded-md border border-red-500/25 bg-rose-50 px-2 py-1 text-[12px] font-semibold text-rose-600/90 transition-colors hover:bg-rose-50 disabled:opacity-40"
              >
                Xoá tất cả
              </button>
            ) : null}
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
            {keys.shelf.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-zinc-500">
                Kho trống. Khách vẫn mua được, đơn sẽ nằm chờ tới khi có key.
              </p>
            ) : (
              // Plain rows ruled apart by hairlines: the panel around them is
              // the frame now, and a box per key inside a box of keys was a
              // border drawn twice for one idea.
              <div className="max-h-[340px] divide-y divide-zinc-100 overflow-y-auto pr-0.5">
                {/* Value only: dates and per-row buttons made every line a
                    control panel. Deleting goes through the paste box or
                    "Xoá tất cả", both of which take the key by name. */}
                {keys.shelf.map((key) => (
                  <div key={key.id} className="flex items-center gap-2 px-1.5 py-1.5">
                    <KeyRound size={11} className="shrink-0 text-zinc-400" />
                    <span className={KEY_TEXT}>{key.value}</span>
                  </div>
                ))}
                {keys.shelfTruncated ? (
                  <p className="px-1.5 py-1.5 text-[11px] text-zinc-500">
                    …và {keys.available - keys.shelf.length} key nữa không hiện ở đây.
                  </p>
                ) : null}
              </div>
            )}
          </div>

        </div>

        {/* Same dress as the shelf beside it: one rounded panel, plain rows
            ruled apart by hairlines, scrolling inside itself. The facts a row
            keeps are the ones the shelf cannot have — who holds the key and
            since when. */}
        <div className="flex flex-col gap-2">
          <span className={HEAD}>Đã thuê ({keys.sold})</span>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
            {keys.recent.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-zinc-500">
                Chưa giao key nào cho khách.
              </p>
            ) : (
              <div className="max-h-[340px] divide-y divide-zinc-100 overflow-y-auto pr-0.5">
                {keys.recent.map((key) => (
                  <div
                    key={key.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1.5 py-1.5"
                  >
                    <KeyRound size={11} className="shrink-0 text-zinc-400" />
                    <span className={KEY_TEXT}>{key.value}</span>
                    <span className="shrink-0 text-[10px] font-bold text-zinc-700">
                      {key.username}
                    </span>
                    {/* When it was handed over, the order on the hover. No
                        expiry: a key's clock starts when the customer activates
                        it, which the shop never sees (the owner, 22/10/2026:
                        "key không có hết hạn"). */}
                    <span
                      title={key.orderCode ? `Đơn ${key.orderCode}` : undefined}
                      className="shrink-0 text-[10px] tabular-nums text-zinc-500"
                    >
                      Giao {key.deliveredAt}
                    </span>
                  </div>
                ))}
                {keys.sold > keys.recent.length ? (
                  <p className="px-1.5 py-1.5 text-[11px] text-zinc-500">
                    …và {keys.sold - keys.recent.length} key đã giao trước đó.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={clearing}
        danger
        pending={busy}
        title="Xoá toàn bộ key trong kho?"
        body={`${keys.available} key chưa bán của gói này sẽ bị xoá hẳn. Key đã giao cho khách không bị đụng tới; đơn đang chờ key vẫn chờ như khi kho hết hàng. Không hoàn tác được.`}
        confirmLabel="Xoá tất cả"
        onCancel={() => setClearing(false)}
        onConfirm={() => void clearShelf()}
      />
    </div>
  );
}
