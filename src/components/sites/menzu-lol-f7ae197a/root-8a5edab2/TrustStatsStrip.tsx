import { Clock, ShoppingBag, Star, Users, type LucideIcon } from "lucide-react";

import type { TrustStats } from "@/lib/trustStats";

import { CountUp } from "./CountUp";

/**
 * 8.400 for 8,478, 21.200 for 21,285: rounded down to the hundred once past
 * a thousand, so the figure reads as a scale rather than a count that is
 * stale by tomorrow. The "+" the tile adds says the rest.
 */
function compact(n: number): number {
  return n >= 1000 ? Math.floor(n / 100) * 100 : n;
}

interface Tile {
  icon: LucideIcon;
  value: number;
  decimals: number;
  /** The coloured tail after the number — "+", "+ năm", "/5". */
  unit: string;
  label: string;
}

/**
 * The strip of four figures above the reviews: how much the shop has done,
 * for how many, for how long, and how it was rated. The numbers are the
 * loud part — big, white, counting up as the strip scrolls into view, with
 * the unit in the accent — and the labels sit quiet and uppercase under
 * them, the way the reference shop does it.
 *
 * `slim` is the lower strip the home page sets between Hot trending and the
 * game list, where elitehacks puts its own figures: smaller numbers and less
 * air, so it reads as a pause between two rows rather than a section.
 */
export function TrustStatsStrip({ stats, slim = false }: { stats: TrustStats; slim?: boolean }) {
  const tiles: Tile[] = [];
  if (stats.orders) {
    tiles.push({ icon: ShoppingBag, value: compact(stats.orders), decimals: 0, unit: "+", label: "Đơn đã giao" });
  }
  if (stats.customers) {
    tiles.push({ icon: Users, value: compact(stats.customers), decimals: 0, unit: "+", label: "Khách hàng" });
  }
  if (stats.years) {
    tiles.push({ icon: Clock, value: stats.years, decimals: 0, unit: "+", label: "Năm hoạt động" });
  }
  if (stats.rating) {
    tiles.push({ icon: Star, value: stats.rating, decimals: 1, unit: "/5", label: "Đánh giá trung bình" });
  }
  // One figure alone is a boast; two make a record.
  if (tiles.length < 2) return null;

  return (
    <section
      aria-label="Số liệu của shop"
      // Slim, it sits among the rows and takes their width; on its own it
      // brings its own gutter.
      className={slim ? "w-full" : "mx-auto w-full max-w-[1320px] px-4 pb-4 lg:px-6"}
    >
      <div
        className={
          slim
            ? "grid grid-cols-2 gap-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 lg:grid-cols-4 lg:gap-y-0 lg:px-8 lg:py-6"
            : "grid grid-cols-2 gap-y-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 lg:grid-cols-4 lg:gap-y-0 lg:px-8 lg:py-10"
        }
      >
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className={`flex flex-col items-center text-center ${slim ? "gap-1.5" : "gap-2"} ${
                index > 0 ? "lg:border-l lg:border-white/[0.08]" : ""
              } ${index % 2 === 1 ? "border-l border-white/[0.08] lg:border-l" : ""}`}
            >
              <div className="flex items-baseline gap-1.5">
                <Icon size={slim ? 14 : 16} aria-hidden className="mb-0.5 self-center text-[var(--menzu-accent)]" />
                <span
                  className={`font-black leading-none tracking-tight text-white ${
                    slim ? "text-2xl sm:text-3xl lg:text-[34px]" : "text-3xl sm:text-5xl"
                  }`}
                >
                  <CountUp value={tile.value} decimals={tile.decimals} />
                </span>
                <span
                  className={`font-black leading-none text-[var(--menzu-accent)] ${
                    slim ? "text-base sm:text-xl" : "text-lg sm:text-2xl"
                  }`}
                >
                  {tile.unit}
                </span>
              </div>
              <span
                className={`font-bold uppercase text-neutral-500 ${
                  // Tighter on a phone, so "Đánh giá trung bình" keeps to one line.
                  slim
                    ? "text-[10px] tracking-[0.12em] sm:text-[11px] sm:tracking-[0.2em]"
                    : "text-[11px] tracking-[0.2em]"
                }`}
              >
                {tile.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
