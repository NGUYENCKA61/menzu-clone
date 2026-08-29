"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusToast } from "./StatusToast";
import { formatVnd } from "./productData";

/**
 * The commission card's "Rút tiền": one click moves the whole commission
 * balance into the wallet, a refresh redraws every figure from the row, and
 * the outcome speaks through the same corner toast the auth forms use.
 * Locked while there is nothing to move — a zero that can be pressed reads
 * as a bug.
 */
export function WithdrawCommission({ amount }: { amount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  async function withdraw() {
    if (pending || amount <= 0) return;
    setPending(true);
    setToast(null);
    try {
      const response = await fetch("/api/referral/withdraw", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        moved?: number;
        error?: string;
      } | null;
      if (!response.ok) {
        setToast({
          tone: "error",
          title: "Rút hoa hồng thất bại",
          message: data?.error ?? "Không kết nối được máy chủ",
        });
        return;
      }
      setToast({
        tone: "success",
        title: "Đã rút hoa hồng",
        message: `${formatVnd(data?.moved ?? 0)}đ đã chuyển vào số dư khả dụng.`,
      });
      router.refresh();
    } catch {
      setToast({
        tone: "error",
        title: "Rút hoa hồng thất bại",
        message: "Không kết nối được máy chủ",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={withdraw}
        disabled={pending || amount <= 0}
        title={amount <= 0 ? "Chưa có hoa hồng để rút" : undefined}
        className="inline-flex h-9 shrink-0 items-center rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-amber-300 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Đang rút…" : "Rút tiền"}
      </button>
      {toast ? (
        <StatusToast
          tone={toast.tone}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
