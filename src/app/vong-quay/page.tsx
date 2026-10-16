import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronRight, Gift } from "lucide-react";

import Link from "next/link";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SpinLockedNotice } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinLockedNotice";
import { SpinWheel } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinWheel";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { readWedgeColor, SPIN_COST, SPIN_LOCKED, WEDGE_COLORS, type Prize } from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";
import { shareCard } from "@/lib/shareCard";

// The card spread in for og:url beside the canonical (the owner's SEO
// review, 13/10/2026).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Vòng quay đổi thưởng",
    description:
      "Dùng điểm thưởng tích được sau mỗi đơn hàng để quay nhận tiền vào ví và điểm thưởng.",
    alternates: { canonical: "/vong-quay" },
    // A closed wheel is a notice over a page that pays nothing: out of the
    // index while the switch is on, back the day it turns (the SEO review,
    // round 2, T7).
    ...(SPIN_LOCKED ? { robots: { index: false, follow: true } } : {}),
    ...(await shareCard({ url: "/vong-quay" })),
  };
}
export const dynamic = "force-dynamic";

/**
 * The wheel on a page of its own.
 *
 * LAB (the owner, 16/10/2026: "nhớ thiết kế lại đổi thưởng", after "bớt AI
 * bớt rối"): the wheel with no box around it, and beside it one plain column
 * read top to bottom: how points turn into spins, what is on the wheel, the
 * history. The points were printed three times (two cards beside the wheel
 * and the line under it); now only the line under the wheel says them, since
 * it is the one that changes after a spin.
 *
 * The page draws nothing it does not know: points come from the reader's own
 * row, and the prize list is the same table the server draws from, so it
 * cannot advertise a prize the wheel does not hold. How often each one comes
 * up is the shop's own tuning and stays off the page.
 */
export default async function SpinPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  // While the wheel is closed the page still draws it (the owner wants it
  // seen) under a notice that sends the reader home. A closed wheel is not
  // worth signing in for, so a visitor sees it with no points of their own.
  if (!user && !SPIN_LOCKED) redirect("/login?next=%2Fvong-quay");
  const points = user?.points ?? 0;

  // The same switch that closes the shop closes the wheel: it pays out real
  // balance, so it has no business running while sales are stopped.
  const canSpin = settings.purchasesEnabled && !SPIN_LOCKED;
  // One read for the drawing, the reward list and the prop the wheel spins on.
  const prizes = await listSpinPrizes();

  // Parcels won and not yet given an address. Only ITEM wins ever reach
  // PENDING; money, points and codes settle inside the spin's own transaction.
  const unclaimed = !user ? [] : await db.spinWin.findMany({
    where: { userId: user.id, status: "PENDING", address: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true },
  });

  return (
    <>
      {/* Beside the page rather than inside it: the page's <main> is its own
          stacking context under the header, so a sheet in there left the
          header sharp over the frost (the owner, 07/10/2026: "full mờ"). */}
      {SPIN_LOCKED ? <SpinLockedNotice /> : null}
      <SimplePage title="Vòng quay đổi thưởng" crumb="Vòng quay đổi thưởng" icon={Gift}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          <div className="flex min-w-0 flex-col gap-6">
            {!canSpin && !SPIN_LOCKED ? (
              <p className="mx-auto max-w-[520px] text-center text-[14px] text-amber-300">
                Shop đang tạm ngưng bán hàng nên vòng quay cũng tạm đóng. Điểm của bạn vẫn giữ
                nguyên.
              </p>
            ) : null}

            <SpinWheel points={points} canSpin={canSpin} prizes={prizes} />

            {/* One line, not one form per parcel: the form lives on each
                parcel's own page, which is also where the courier number
                comes back. */}
            {unclaimed.length > 0 ? (
              <Link
                href={
                  unclaimed.length === 1
                    ? `/vong-quay/qua/${unclaimed[0]!.id}`
                    : "/vong-quay/lich-su"
                }
                className="group mx-auto flex w-full max-w-[520px] items-center gap-3 rounded-[10px] border border-amber-500/30 px-4 py-3 transition-colors hover:border-amber-500/60"
              >
                <span className="flex-1 text-[14px] leading-relaxed text-amber-200">
                  {unclaimed.length === 1 ? (
                    <>
                      Bạn trúng <b className="text-white">{unclaimed[0]!.label}</b>, điền địa chỉ để
                      shop gửi tận nơi.
                    </>
                  ) : (
                    <>
                      Bạn có <b className="text-white">{unclaimed.length} phần quà</b> chưa điền địa
                      chỉ nhận.
                    </>
                  )}
                </span>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-amber-400/70" />
              </Link>
            ) : null}
          </div>

          <aside className="flex min-w-0 flex-col">
            <section className="border-t border-line pt-4">
              <h2 className="text-[16px] font-bold text-frost">Cách đổi điểm</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-mist">
                {formatVnd(SPIN_COST)} điểm đổi một lượt quay. Điểm được cộng sau mỗi đơn hàng
                thành công.
              </p>
            </section>

            <section className="mt-8 border-t border-line pt-4">
              <h2 className="text-[16px] font-bold text-frost">Phần thưởng</h2>
              {/* What is on the wheel, not how often it comes up. A losing
                  slice is left out: "Chúc may mắn lần sau" is not a reward. */}
              <ul className="mt-2 flex flex-col">
                {prizes
                  .filter((prize: Prize) => prize.kind !== "NOTHING")
                  .map((prize: Prize) => (
                    <li key={prize.id} className="flex items-start gap-3 py-2 text-[14px]">
                      {/* The colour its wedge is painted, so the list and the
                          wheel are one picture. */}
                      <span
                        aria-hidden
                        className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            WEDGE_COLORS[readWedgeColor(prize.color)].fill ?? "var(--menzu-violet)",
                        }}
                      />
                      <span className="min-w-0">
                        <span className="text-frost">{prize.label}</span>
                        {prize.description ? (
                          <span className="mt-0.5 block text-[13px] leading-relaxed text-dim">
                            {prize.description}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-[13px] leading-relaxed text-dim">
                Tiền trúng được cộng thẳng vào ví và ghi ở Lịch sử giao dịch.
              </p>
            </section>

            {/* Everything the wheel has already given this reader, beside the
                wheel: "mình trúng gì rồi" is asked while looking at it. */}
            <Link
              href="/vong-quay/lich-su"
              className="group mt-8 flex items-center justify-between gap-3 border-y border-line py-3.5 text-[15px] font-semibold text-frost transition-colors hover:text-white"
            >
              Lịch sử nhận thưởng
              <ChevronRight
                size={16}
                aria-hidden
                className="shrink-0 text-neutral-500 transition-colors group-hover:text-frost"
              />
            </Link>
          </aside>
        </div>
      </SimplePage>
    </>
  );
}
