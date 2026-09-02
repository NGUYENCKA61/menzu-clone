"use client";

import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "./AdminStates";

/**
 * "Đổi lấy N điểm", from a list.
 *
 * The same trade the parcel's own page offers, put where somebody scrolling
 * their wins will meet it: a prize sitting unclaimed for a fortnight usually
 * means the winner has no use for it, and the way out should not be one page
 * further in than the way to claim it.
 *
 * Behind a confirm, because it is not undoable — the parcel is gone and the
 * points are in. One press away is right for claiming, not for giving up.
 */
export function SpinExchangeButton({
  winId,
  label,
  points,
}: {
  winId: string;
  label: string;
  points: number;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exchange() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/spin/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: winId, action: "exchange" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Không đổi được");
        return;
      }
      setAsking(false);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-[#a78bfa]/50 hover:text-white"
      >
        <Coins className="h-3.5 w-3.5" />
        Đổi {points.toLocaleString("vi-VN")} điểm
      </button>

      {error ? (
        <span className="w-full text-[11px] font-semibold text-rose-300">{error}</span>
      ) : null}

      <ConfirmDialog
        open={asking}
        title="Đổi phần quà lấy điểm?"
        body={`"${label}" sẽ không được gửi nữa. Đổi lại bạn nhận ${points.toLocaleString("vi-VN")} điểm để quay tiếp. Không hoàn tác được.`}
        confirmLabel={`Đổi lấy ${points.toLocaleString("vi-VN")} điểm`}
        pending={busy}
        onConfirm={exchange}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
