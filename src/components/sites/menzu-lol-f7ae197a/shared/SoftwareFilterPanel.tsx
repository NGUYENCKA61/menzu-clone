"use client";

import { Crosshair, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CHIP_ACTIVE,
  CHIP_INACTIVE,
  GROUP_LABEL_CLASS,
  PANEL_CLASS,
  SEARCH_SHELL_CLASS,
} from "./filterChrome";
import { ScopeSearchField } from "./ScopeSearchField";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "undetected", label: "Chưa phát hiện" },
  { value: "stable", label: "Ổn định" },
  { value: "updated", label: "Cập nhật mới" },
  { value: "risky", label: "Rủi ro" },
  { value: "updating", label: "Đang cập nhật" },
  { value: "detected", label: "Đã phát hiện" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá ↑" },
  { value: "price-desc", label: "Giá ↓" },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/**
 * Search + filter panel above the software grid, sibling to the account one
 * below it and wearing the same chrome.
 *
 * It carries its own URL keys — `pm`, `cn`, `tt`, `pmsort` — rather than
 * reusing the account panel's `skin` and `sort`. A category can list both kinds
 * at once, and a single `sort` serving two grids would reorder the accounts
 * every time someone sorted the tools. For the same reason nothing here clears
 * `page`: that number belongs to the account listing, which this panel does not
 * touch.
 *
 * The two boxes narrow together rather than widening: a name and a feature both
 * filled means "this tool, and it does that", which is the question someone
 * typing in both boxes is asking.
 *
 * No price band, unlike the account panel. A tool costs whatever its cheapest
 * package costs, so a band would first have to explain which of three or four
 * prices it was matching; the two price sorts answer the same question without
 * the footnote.
 */
export function SoftwareFilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [nameQuery, setNameQuery] = useState(params.get("pm") ?? "");
  const [featureQuery, setFeatureQuery] = useState(params.get("cn") ?? "");
  const status = (params.get("tt") as StatusValue) ?? "all";
  const sort = (params.get("pmsort") as SortValue) ?? "newest";

  /** Rewrites the URL, which is what the listing actually reads. */
  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    apply({ pm: nameQuery.trim(), cn: featureQuery.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      {/* Split 6/4 like the account row above: the name is what most people
          arrive knowing, the feature is what they fall back on. */}
      <div className="flex flex-col md:flex-row gap-2.5">
        <div className="flex-[6] relative min-w-0">
          <ScopeSearchField
            value={nameQuery}
            onChange={setNameQuery}
            placeholder="Tìm: HACK CS2 Bản Midnight, Valorant Tool Premium......"
            // The breathing outline without the gold pill: the pill was tried
            // here and taken back off, the glow was asked to stay — breathing
            // purple into red rather than the account banner's red into gold.
            glow="brand"
          />
        </div>

        <div className="flex-[4] relative min-w-0">
          <div className={SEARCH_SHELL_CLASS}>
            <Crosshair size={15} className="text-neutral-500 shrink-0" />
            <input
              type="text"
              value={featureQuery}
              onChange={(event) => setFeatureQuery(event.target.value)}
              placeholder="Tìm chức năng (Aimbot, ESP...)"
              className="flex-1 bg-transparent outline-none text-white placeholder-neutral-500 text-sm cursor-text"
            />
          </div>
        </div>

        <button
          type="submit"
          className="hidden md:flex bg-[var(--brand)] hover:bg-[var(--brand-dark)] active:scale-95 text-white font-black rounded-xl px-6 transition items-center gap-2 shrink-0"
        >
          <Search size={16} />
          Tìm kiếm
        </button>
      </div>

      <div className={PANEL_CLASS}>
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-2.5 w-full">
          <div>
            {/* First, because it is the one thing a tool is bought or
                abandoned on — the card leads with the same pill. */}
            <span className={GROUP_LABEL_CLASS}>Trạng thái</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => apply({ tt: option.value === "all" ? "" : option.value })}
                  className={status === option.value ? CHIP_ACTIVE : CHIP_INACTIVE}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={GROUP_LABEL_CLASS}>Sắp xếp</span>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    apply({ pmsort: option.value === "newest" ? "" : option.value })
                  }
                  className={sort === option.value ? CHIP_ACTIVE : CHIP_INACTIVE}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="md:hidden w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] active:scale-95 text-white font-black rounded-xl py-3.5 transition flex items-center justify-center gap-2"
      >
        <Search size={16} />
        Tìm kiếm
      </button>
    </form>
  );
}
