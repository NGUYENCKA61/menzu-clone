import { Clock, ShoppingBag, Star, Users, type LucideIcon } from "lucide-react";

import type { TrustStats } from "@/lib/trustStats";

/**
 * "8.400+", "402.000+": rounded down to the hundred once past a thousand, so
 * the figure reads as a scale rather than a count that is stale by tomorrow.
 */
function compact(n: number): string {
  const floor = n >= 1000 ? Math.floor(n / 100) * 100 : n;
  return `${floor.toLocaleString("vi-VN")}+`;
}

interface Tile {
  icon: LucideIcon;
  value: string;
  /** The coloured tail after the number — "+", "năm", "/5". */
  unit: string;
  label: string;
}

/**
 * The strip of four figures above the reviews: how much the shop has done,
 * for how many, for how long, and how it was rated. The numbers are the
 * loud part — big, white, with the unit in the accent — and the labels sit
 * quiet and uppercase under them, the way the reference shop does it.
 */
export function TrustStatsStrip({ stats }: { stats: TrustStats }) {
  const tiles: Tile[] = [];
  if (stats.orders) {
    tiles.push({ icon: ShoppingBag, value: compact(stats.orders), unit: "", label: "Đơn đã giao" });
  }
  if (stats.customers) {
    tiles.push({ icon: Users, value: compact(stats.customers), unit: "", label: "Khách hàng" });
  }
  if (stats.years) {
    tiles.push({ icon: Clock, value: `${stats.years}`, unit: "+ năm", label: "Hoạt động" });
  }
  if (stats.rating) {
    tiles.push({ icon: Star, value: stats.rating.toFixed(1), unit: "/5", label: "Đánh giá trung bình" });
  }
  // One figure alone is a boast; two make a record.
  if (tiles.length < 2) return null;

  return (
    <section aria-label="Số liệu của shop" className="mx-auto w-full max-w-[1320px] px-4 pb-4 lg:px-6">
      <div className="grid grid-cols-2 gap-y-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 lg:grid-cols-4 lg:gap-y-0 lg:px-8 lg:py-10">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className={`flex flex-col items-center gap-2 text-center ${
                index > 0 ? "lg:border-l lg:border-white/[0.08]" : ""
              } ${index % 2 === 1 ? "border-l border-white/[0.08] lg:border-l" : ""}`}
            >
              <div className="flex items-baseline gap-1.5">
                <Icon size={16} aria-hidden className="mb-0.5 self-center text-[var(--menzu-accent)]" />
                <span className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
                  {tile.value.replace(/\+$/, "")}
                </span>
                <span className="text-xl font-black leading-none text-[var(--menzu-accent)] sm:text-2xl">
                  {tile.value.endsWith("+") ? "+" : ""}
                  {tile.unit}
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                {tile.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
