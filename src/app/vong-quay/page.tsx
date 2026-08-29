import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Ticket } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SpinWheel } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinWheel";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { PRIZES, SPIN_COST } from "@/lib/spin";

export const metadata: Metadata = {
  title: "Vòng quay đổi thưởng",
  description:
    "Dùng điểm thưởng tích được sau mỗi đơn hàng để quay nhận tiền vào ví và điểm thưởng.",
  alternates: { canonical: "/vong-quay" },
};
export const dynamic = "force-dynamic";

/** Denominator for the odds table, from the same weights the draw uses. */
const TOTAL_WEIGHT = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);

/**
 * The wheel on a page of its own.
 *
 * Not inside the account frame any more: that sidebar is for the screens a
 * customer goes to in order to *manage* something — wallet, orders, security —
 * and a game shown between them reads as another form to fill in. On its own
 * page the wheel gets the width to be the thing you came for, and the account
 * menu still names it, so nothing is lost by moving it out.
 *
 * The page draws nothing it does not know: points come from the reader's own
 * row, and the prize list under the wheel is the same table the server draws
 * from — one source, so the odds shown cannot drift from the odds run.
 */
export default async function SpinPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  if (!user) redirect("/login?next=%2Fvong-quay");

  const spinsAfforded = Math.floor(user.points / SPIN_COST);
  // The same switch that closes the shop closes the wheel: it pays out real
  // balance, so it has no business running while sales are stopped.
  const canSpin = settings.purchasesEnabled;

  return (
    <SimplePage title="Vòng quay đổi thưởng" crumb="Vòng quay đổi thưởng">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        {/* The wheel leads and takes the width; the numbers read beside it on a
            wide screen and under it on a phone. */}
        <div className="flex flex-col gap-8 rounded-2xl border border-white/10 bg-neutral-900/40 px-6 py-10">
          {!canSpin ? (
            <p className="mx-auto max-w-[520px] rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-[12px] font-semibold text-amber-300">
              Shop đang tạm ngưng bán hàng nên vòng quay cũng tạm đóng. Điểm của bạn
              vẫn giữ nguyên.
            </p>
          ) : null}

          <SpinWheel points={user.points} canSpin={canSpin} />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--menzu-violet)]/20 bg-[var(--menzu-violet)]/[0.05] p-5">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-300">
              <Coins size={13} className="text-[#a78bfa]" />
              Điểm thưởng của bạn
            </span>
            <span className="text-3xl font-black leading-none text-[#a78bfa]">
              {formatVnd(user.points)}{" "}
              <span className="text-sm font-bold text-[#a78bfa]/80">điểm</span>
            </span>
            <span className="text-xs text-neutral-500">
              Điểm cộng theo mỗi đơn hàng thành công
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-300">
              <Ticket size={13} className="text-neutral-400" />
              Lượt quay có thể đổi
            </span>
            <span className="text-3xl font-black leading-none text-white">
              {spinsAfforded}{" "}
              <span className="text-sm font-bold text-neutral-500">lượt</span>
            </span>
            <span className="text-xs text-neutral-500">
              {formatVnd(SPIN_COST)} điểm đổi được 1 lượt quay
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Cơ cấu giải thưởng
            </span>
            {/* Printed from the same table the server draws from — a wheel that
                showed one set of odds and ran another would be worth nothing
                to the reader who checked. */}
            <ul className="mt-3 flex flex-col">
              {PRIZES.map((prize) => (
                <li
                  key={prize.id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-[12px] last:border-0"
                >
                  <span className="text-neutral-300">{prize.label}</span>
                  <span className="shrink-0 tabular-nums text-neutral-500">
                    {((prize.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
              Tiền trúng được cộng thẳng vào số dư ví và ghi lại ở mục Lịch sử giao
              dịch.
            </p>
          </div>
        </aside>
      </div>
    </SimplePage>
  );
}
