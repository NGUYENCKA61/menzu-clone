"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

import {
  MAX_SLICES,
  PRIZE_KIND_LABEL,
  readWedgeColor,
  totalWeight,
  wedgeSwatch,
  type Prize,
} from "@/lib/spin";

const ROW =
  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/[0.08] bg-[#0e0e11] px-4 py-3 transition-colors hover:border-white/20";
const ACTION =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const ICON_BTN =
  "grid h-7 w-7 place-items-center rounded-md border border-white/10 text-neutral-500 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/**
 * The wheel's slices, in wheel order.
 *
 * A list, not a form: each slice is set on its own page, where every field can
 * carry the sentence that says what it does. What stays here is what only
 * makes sense across the whole wheel — the order the wedges sit in, and the
 * odds each one works out to against the others.
 *
 * Reordering saves immediately. It is the one edit with no fields to fill in,
 * and a pair of arrows that needed a separate Save press would be a trap.
 */
export function AdminSpinPrizes({
  prizes,
  /** False while the shop is still on the table in code. */
  stored,
}: {
  prizes: Prize[];
  stored: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightTotal = totalWeight(prizes);

  async function send(body: unknown, method: "PUT" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/spin-prizes", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không lưu được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= prizes.length) return;
    const next = [...prizes];
    [next[index], next[to]] = [next[to]!, next[index]!];
    void send({ prizes: next }, "PUT");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] leading-relaxed text-neutral-400">
          Danh sách này <b className="text-white">chính là bánh xe</b> — thứ tự ở
          đây là thứ tự nan, và cơ cấu giải thưởng khách đọc cũng lấy từ đây.{" "}
          {stored ? null : (
            <span className="text-neutral-500">
              Shop chưa chỉnh gì; đang chạy bảng mặc định.
            </span>
          )}
        </p>
        <span className="shrink-0 text-[11px] font-black uppercase tracking-widest text-neutral-500">
          {prizes.length}/{MAX_SLICES} ô
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {prizes.map((prize, index) => {
          const share =
            weightTotal > 0 ? (prize.weight / weightTotal) * 100 : 0;
          return (
            <div key={prize.id} className={ROW}>
              {/* The number sits on the wedge's own colour, so the list reads
                  as the wheel from top to bottom rather than as nine identical
                  rows. */}
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-black tabular-nums text-neutral-300"
                style={wedgeSwatch(readWedgeColor(prize.color))}
              >
                {index + 1}
              </span>

              <Link
                href={`/admin/spin/${prize.id}`}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="truncate text-[13px] font-bold text-white transition-colors group-hover:text-[var(--brand)]">
                      {prize.label}
                    </span>
                    {prize.image ? (
                      <ImageIcon size={11} className="shrink-0 text-neutral-600" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                    <span className="font-mono">{prize.id}</span> ·{" "}
                    {PRIZE_KIND_LABEL[prize.kind].label}
                    {PRIZE_KIND_LABEL[prize.kind].unit
                      ? ` ${prize.amount.toLocaleString("vi-VN")}${PRIZE_KIND_LABEL[prize.kind].unit}`
                      : ""}{" "}
                    · nan ghi &ldquo;{prize.short}&rdquo;
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-black tabular-nums text-[var(--brand)]">
                  {share.toFixed(1)}%
                </span>
                <ArrowRight size={14} className="shrink-0 text-neutral-600" />
              </Link>

              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  aria-label="Lên trên"
                  className={ICON_BTN}
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === prizes.length - 1}
                  aria-label="Xuống dưới"
                  className={ICON_BTN}
                >
                  <ChevronDown size={13} />
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {prizes.length < MAX_SLICES ? (
          <Link
            href="/admin/spin/moi"
            className={`${ACTION} border border-white/12 bg-white/[0.04] text-neutral-300 hover:border-[var(--brand)]/50 hover:text-white`}
          >
            <Plus size={13} />
            Thêm ô
          </Link>
        ) : null}
        {stored ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => send({}, "DELETE")}
            title="Xoá bảng đã lưu và quay về bảng mặc định trong mã nguồn"
            className={`${ACTION} border border-white/12 bg-white/[0.04] text-neutral-400 hover:border-rose-500/40 hover:text-rose-300`}
          >
            <RotateCcw size={13} />
            Về mặc định
          </button>
        ) : null}
      </div>
    </div>
  );
}
