import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Coins, Gift, History, Ticket } from "lucide-react";

import Link from "next/link";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SpinWheel } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinWheel";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { readWedgeColor, SPIN_COST, WEDGE_COLORS, type Prize } from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";

export const metadata: Metadata = {
  title: "Vòng quay đổi thưởng",
  description:
    "Dùng điểm thưởng tích được sau mỗi đơn hàng để quay nhận tiền vào ví và điểm thưởng.",
  alternates: { canonical: "/vong-quay" },
};
export const dynamic = "force-dynamic";



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
 * row, and the prize list beside the wheel is the same table the server draws
 * from — one source, so it cannot advertise a prize the wheel does not hold.
 * What it no longer prints is how often each one comes up; that is the shop's
 * own tuning and the shop asked for it off the page.
 */
export default async function SpinPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  if (!user) redirect("/login?next=%2Fvong-quay");

  const spinsAfforded = Math.floor(user.points / SPIN_COST);
  // The same switch that closes the shop closes the wheel: it pays out real
  // balance, so it has no business running while sales are stopped.
  const canSpin = settings.purchasesEnabled;
  // One read for the drawing, the reward list and the prop the wheel spins on:
  // a page that pictured one table and posted to another would be advertising
  // prizes that are not on the wheel.
  const prizes = await listSpinPrizes();

  // Parcels won and not yet given an address. Only ITEM wins ever reach
  // PENDING — money, points and codes settle inside the spin's own transaction
  // and are nobody's errand.
  const unclaimed = await db.spinWin.findMany({
    where: { userId: user.id, status: "PENDING", address: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true },
  });

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

          <SpinWheel points={user.points} canSpin={canSpin} prizes={prizes} />

          {/* One line, not one form per parcel. A reader who wins the same
              prize five times was meeting five identical address forms stacked
              down the page; the form itself lives on each parcel's own page,
              which is also where the courier number comes back. */}
          {unclaimed.length > 0 ? (
            <Link
              href={
                unclaimed.length === 1
                  ? `/vong-quay/qua/${unclaimed[0]!.id}`
                  : "/vong-quay/lich-su"
              }
              className="group flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3.5 transition-colors hover:border-amber-500/60"
            >
              <Gift size={16} className="shrink-0 text-amber-400" />
              <span className="flex-1 text-[13px] leading-relaxed text-amber-200">
                {unclaimed.length === 1 ? (
                  <>
                    Bạn trúng <b className="text-white">{unclaimed[0]!.label}</b> —
                    điền địa chỉ để shop gửi tận nơi.
                  </>
                ) : (
                  <>
                    Bạn có{" "}
                    <b className="text-white">{unclaimed.length} phần quà</b> chưa
                    điền địa chỉ nhận.
                  </>
                )}
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 text-amber-400/70 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
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

          {/* Everything the wheel has already given this reader. Beside the
              wheel rather than buried in the account menu: the moment somebody
              wonders "mình trúng gì rồi" is the moment they are looking at
              it. */}
          <Link
            href="/vong-quay/lich-su"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/50 p-5 transition-colors hover:border-[var(--menzu-violet)]/40"
          >
            <History size={16} className="shrink-0 text-[#a78bfa]" />
            <span className="flex-1 text-[13px] font-bold text-white">
              Lịch sử nhận thưởng
            </span>
            <ArrowRight
              size={14}
              className="shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Các phần thưởng
            </span>
            {/* What is on the wheel, not how often it comes up. The odds were
                printed here and the shop asked for them off: a percentage
                beside every slice is the shop's own tuning, published. The
                names are still read from the table the server draws from, so
                nothing here can promise a prize the wheel does not hold.

                A losing slice is left out rather than listed: "Chúc may mắn
                lần sau" is not a reward, and printing it twice under a heading
                that says rewards reads as a joke at the reader's expense. */}
            <ul className="mt-3 flex flex-col">
              {prizes
                .filter((prize: Prize) => prize.kind !== "NOTHING")
                .map((prize: Prize) => (
                  <li
                    key={prize.id}
                    className="flex items-start gap-2.5 border-b border-white/5 py-2 text-[12px] last:border-0"
                  >
                    {/* The colour its wedge is painted, so the list and the
                        wheel are one picture: a reader finds the prize they
                        saw go past by the colour, not by re-reading nine
                        labels. "Auto" keeps the house violet. */}
                    <span
                      aria-hidden
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          WEDGE_COLORS[readWedgeColor(prize.color)].fill ??
                          "var(--menzu-violet)",
                      }}
                    />
                    <span className="min-w-0">
                      <span className="text-neutral-300">{prize.label}</span>
                      {prize.description ? (
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                          {prize.description}
                        </span>
                      ) : null}
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
