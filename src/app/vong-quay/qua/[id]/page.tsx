import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Gift, PackageCheck, Truck } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SpinPrizeClaim } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinPrizeClaim";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { listSpinPrizes } from "@/lib/spinPrizes";

export const metadata: Metadata = {
  title: "Phần quà đã trúng",
  // One winner's own parcel and their home address. Followed, not indexed.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

function stamp(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * One won parcel, from the wheel stopping to the courier number.
 *
 * The address form lives here as well as under the wheel, because this is the
 * page a notice can point at and the page a winner comes back to: "đã gửi
 * chưa" is answered from their own history, not by asking the shop. Everything
 * the shop has said about this parcel is on it, in the order it happened.
 */
export default async function SpinPrizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/vong-quay/qua/${id}`)}`);
  }

  // Scoped to this winner: somebody else's win answers 404 rather than
  // confirming it exists.
  const win = await db.spinWin.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      label: true,
      prizeId: true,
      status: true,
      createdAt: true,
      recipient: true,
      phone: true,
      address: true,
      note: true,
      tracking: true,
      shopNote: true,
      pointsBack: true,
    },
  });
  if (!win) notFound();

  const prizes = await listSpinPrizes();
  const prize = prizes.find((p) => p.id === win.prizeId);

  return (
    <SimplePage title="Phần quà đã trúng" crumb="Phần quà đã trúng">
      <div className="flex max-w-3xl flex-col gap-5">
        <Link
          href="/vong-quay"
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vòng quay
        </Link>

        {/* WHAT WAS WON */}
        <section className={CARD}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--menzu-violet)]/30 bg-[var(--menzu-violet)]/10">
              {prize?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prize.image} alt="" className="h-full w-full object-contain" />
              ) : (
                <Gift className="h-6 w-6 text-[#a78bfa]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black text-white">{win.label}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">
                Trúng lúc {stamp(win.createdAt)}
              </p>
              {prize?.description ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-400">
                  {prize.description}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* WHAT THE SHOP HAS SAID BACK */}
        {win.tracking || win.shopNote ? (
          <section className={`${CARD} border-emerald-500/25 bg-emerald-500/[0.05]`}>
            <span className={LABEL}>Shop đã phản hồi</span>
            {win.tracking ? (
              <p className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[13px] text-neutral-300">
                <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
                Mã vận đơn:{" "}
                <span className="font-mono text-base font-black tracking-widest text-white">
                  {win.tracking}
                </span>
              </p>
            ) : null}
            {win.shopNote ? (
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
                {win.shopNote}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* WHERE IT IS GOING, OR THE FORM TO SAY SO */}
        {win.status === "EXCHANGED" ? (
          <section className={CARD}>
            <span className={LABEL}>Đã đổi lấy điểm</span>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-300">
              Bạn đã đổi phần quà này lấy{" "}
              <b className="text-[#a78bfa]">
                {(win.pointsBack ?? 0).toLocaleString("vi-VN")} điểm
              </b>
              . Điểm đã vào tài khoản.
            </p>
          </section>
        ) : win.address ? (
          <section className={CARD}>
            <span className={LABEL}>Địa chỉ nhận hàng</span>
            <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-300">
              <b className="text-white">{win.recipient}</b>
              {win.phone ? (
                <span className="ml-2 font-mono text-neutral-400">{win.phone}</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-400">
              {win.address}
            </p>
            {win.note ? (
              <p className="mt-0.5 text-[12px] text-neutral-500">
                Ghi chú: {win.note}
              </p>
            ) : null}
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-neutral-400">
              <PackageCheck className="h-4 w-4 text-neutral-500" />
              {win.status === "SENT"
                ? "Shop đã gửi phần quà này."
                : "Shop đã nhận địa chỉ và sẽ gửi cho bạn."}
            </p>
          </section>
        ) : (
          <SpinPrizeClaim
            winId={win.id}
            label={win.label}
            exchangePoints={prize?.exchangePoints ?? null}
            defaultName={user.username}
          />
        )}
      </div>
    </SimplePage>
  );
}
