"use client";

import { Banknote, CreditCard } from "lucide-react";
import { useState } from "react";

type Method = "bank" | "card";

/** Preset amounts offered by the live /wallet page. */
const PRESETS = [50_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const TAB_ACTIVE =
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#7C3AED] text-white transition-colors";
const TAB_INACTIVE =
  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

const PRESET_ACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-[#7C3AED]/50 bg-[#7C3AED]/15 text-[#a78bfa] transition-colors whitespace-nowrap";
const PRESET_INACTIVE =
  "px-4 py-2 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap";

export function WalletTopUp() {
  const [method, setMethod] = useState<Method>("bank");
  const [amount, setAmount] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-400">
        Tiền sẽ được hệ thống tự động cộng
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMethod("bank")}
          className={method === "bank" ? TAB_ACTIVE : TAB_INACTIVE}
        >
          <Banknote size={15} />
          Ngân Hàng
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={method === "card" ? TAB_ACTIVE : TAB_INACTIVE}
        >
          <CreditCard size={15} />
          Thẻ Cào
        </button>
      </div>

      {method === "bank" ? (
        <form
          onSubmit={(event) => event.preventDefault()}
          className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Số tiền nạp
            </label>
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-neutral-950/60 border border-neutral-800/60 focus-within:border-[#7C3AED]/60 transition-colors">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="flex-1 bg-transparent outline-none text-white text-sm font-bold tabular-nums placeholder-neutral-600"
              />
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                VNĐ
              </span>
            </div>
            <span className="text-[11px] text-neutral-500">
              Nạp từ 10.000đ trở lên. Miễn phí giao dịch.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={amount === String(p) ? PRESET_ACTIVE : PRESET_INACTIVE}
              >
                {formatVnd(p)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black py-3.5 uppercase tracking-widest text-xs transition-colors"
          >
            Tạo hóa đơn
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            1. Chọn nhà mạng
          </span>
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
            Chưa có lịch sử nạp thẻ nào.
          </div>
        </div>
      )}
    </div>
  );
}
