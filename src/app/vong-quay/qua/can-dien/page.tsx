import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gift, MapPin } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Quà cần điền địa chỉ",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-white/10 bg-neutral-900/50 p-5 sm:p-6";

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
 * "Quà của bạn đây, điền địa chỉ đi" — resolved per reader.
 *
 * A notice is one row read by many people, so its button carries one address
 * for all of them; a parcel form lives at a per-win URL. This page is the join
 * between the two: everyone follows the same link and each lands on their own
 * parcel. Without it the shop could only send them to the wheel and hope they
 * found the form.
 *
 * One waiting parcel goes straight there rather than showing a list of one.
 */
export default async function ParcelsNeedingAddressPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/vong-quay/qua/can-dien")}`);

  const waiting = await db.spinWin.findMany({
    where: { userId: user.id, status: "PENDING", address: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  });

  if (waiting.length === 1) redirect(`/vong-quay/qua/${waiting[0]!.id}`);

  // Nothing waiting on an address: the reader either already answered or is
  // following an old notice. Their history is where both questions are
  // answered, so that is where they are sent — with the reason said out loud
  // rather than a bare redirect that looks like the link was broken.
  if (waiting.length === 0) {
    return (
      <SimplePage title="Quà cần điền địa chỉ" crumb="Quà cần điền địa chỉ">
        <div className={`${CARD} text-center`}>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neutral-400">
            <Gift size={20} />
          </span>
          <p className="text-sm font-bold text-white">
            Không có phần quà nào đang chờ địa chỉ
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-neutral-400">
            Bạn đã điền địa chỉ cho tất cả phần quà rồi. Tình trạng gửi hàng và
            mã vận đơn nằm trong lịch sử nhận thưởng.
          </p>
          <Link
            href="/vong-quay/lich-su"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-bold text-neutral-200 transition-colors hover:border-white/20 hover:text-white"
          >
            <ArrowLeft size={14} />
            Lịch sử nhận thưởng
          </Link>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage title="Quà cần điền địa chỉ" crumb="Quà cần điền địa chỉ">
      <div className={`${CARD} flex flex-col gap-3`}>
        <p className="text-[12.5px] leading-relaxed text-neutral-400">
          Có {waiting.length} phần quà đang chờ địa chỉ nhận hàng. Chọn từng
          phần quà để điền thông tin — shop gửi ngay sau khi nhận được.
        </p>

        {waiting.map((win) => (
          <Link
            key={win.id}
            href={`/vong-quay/qua/${win.id}`}
            className="group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 transition-colors hover:border-amber-500/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Gift size={17} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-bold text-white">
                {win.label}
              </span>
              <span className="text-[11px] tabular-nums text-neutral-500">
                {stamp(win.createdAt)}
              </span>
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
              <MapPin size={12} />
              Điền địa chỉ
            </span>
          </Link>
        ))}
      </div>
    </SimplePage>
  );
}
