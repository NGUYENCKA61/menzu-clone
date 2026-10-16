"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "./AdminStates";
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
  /** One press moved the whole commission; it asks first now. */
  const [confirming, setConfirming] = useState(false);
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
      setConfirming(false);
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
      <ConfirmDialog
        open={confirming}
        title="Rút hoa hồng về ví?"
        body={`${formatVnd(amount)}đ hoa hồng sẽ chuyển sang số dư khả dụng để mua hàng. Một lần cho cả khoản, không tách được.`}
        confirmLabel="Rút tiền"
        pending={pending}
        onConfirm={withdraw}
        onCancel={() => setConfirming(false)}
      />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending || amount <= 0}
        title={amount <= 0 ? "Chưa có hoa hồng để rút" : undefined}
        // The plain door's colours, as Lịch sử mua and Đổi thưởng wear on the
        // same card: a white-tinted well with white words when there is money
        // to move, the same well with grey words when there is not. It was a
        // red-tinted ghost, a pair the account area's buttons never use (the
        // owner, 16/10/2026: "cái nút rút tiền đó có đồng bộ màu hay chưa").
        className={`inline-flex h-9 shrink-0 items-center rounded-lg border px-4 text-[12px] font-bold transition-colors disabled:cursor-not-allowed ${
          amount > 0
            ? "border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]"
            : "border-white/10 bg-white/[0.03] text-neutral-500"
        }`}
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
