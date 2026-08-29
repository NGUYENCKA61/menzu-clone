import { KeyRound } from "lucide-react";

import { AdminPackageKeys, type PackageKeysView } from "./AdminPackageKeys";

export interface AdminPackageDetailView {
  id: string;
  label: string;
  price: number;
  durationHours: number | null;
  orderCount: number;
  keys: PackageKeysView;
}

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";
const CARD_HEAD =
  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * One tier's own screen: its numbers, and its key store with room to breathe.
 *
 * No editor for the tier's facts here — name, price and duration are edited in
 * place on the "Quản lý gói" list, where the sibling tiers sit around them as
 * context, and keeping a second form here was the same fields in two places.
 * This page is the licence desk: the store used to open only as a fold-out
 * inside the product page's tier shelf, cramped for the actual work of pasting
 * a hundred keys and reading who got which; here the panel is simply open.
 *
 * No state of its own, so no "use client" — the key panel below carries its
 * own.
 */
export function AdminPackageDetail({ pkg }: { pkg: AdminPackageDetailView }) {
  return (
    <div className="flex flex-col gap-4">
      {/* The four numbers a tier answers for: what it has, what it sold, what
          it owes, and how many orders it carries. Owed is the amber one — it
          is the only figure the shop must act on. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Key trong kho" value={pkg.keys.available} />
        <Stat label="Key đã giao" value={pkg.keys.sold} />
        <Stat
          label="Khách đang chờ key"
          value={pkg.keys.pending}
          tone={pkg.keys.pending > 0 ? "warn" : undefined}
        />
        <Stat label="Đơn hàng" value={pkg.orderCount} />
      </div>

      <section className={CARD}>
        <span className={CARD_HEAD}>
          <KeyRound size={13} className="text-neutral-400" />
          Kho key
        </span>
        <AdminPackageKeys packageId={pkg.id} keys={pkg.keys} />
      </section>
    </div>
  );
}

/** One figure with its name under it, in the house tile. */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "warn"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-white/[0.08] bg-[#0e0e11]"
      }`}
    >
      <p
        className={`text-lg font-black tabular-nums ${
          tone === "warn" ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </p>
    </div>
  );
}
