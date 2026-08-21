"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Package, Search } from "lucide-react";

import {
  CHIP_ACTIVE,
  CHIP_DISABLED,
  CHIP_INACTIVE,
  GROUP_LABEL_CLASS,
  PANEL_CLASS,
  SEARCH_SHELL_CLASS,
} from "./filterChrome";
import { ScopeSearchField } from "./ScopeSearchField";

interface PricePreset {
  label: string;
  min: string;
  max: string;
}

const PRICE_PRESETS: PricePreset[] = [
  { label: "Dưới 500K", min: "0", max: "500000" },
  { label: "500K - 1M", min: "500000", max: "1000000" },
  { label: "1M - 2M", min: "1000000", max: "2000000" },
  { label: "2M - 3M", min: "2000000", max: "3000000" },
  { label: "3M - 5M", min: "3000000", max: "5000000" },
  { label: "5M+ trở lên", min: "5000000", max: "" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá ↑" },
  { value: "price-desc", label: "Giá ↓" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const SOURCE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "drop", label: "DROP" },
  { value: "menzu", label: "MENZU" },
] as const;

type SourceValue = (typeof SOURCE_OPTIONS)[number]["value"];

const NO_DATA = "Shop chưa có dữ liệu cho bộ lọc này";

const PRICE_INPUT_SHELL_CLASS =
  "flex items-center gap-1.5 h-10 px-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex-1 min-w-0";
const PRICE_INPUT_CLASS =
  "bg-transparent outline-none text-white text-sm w-full min-w-0 font-bold tabular-nums placeholder-neutral-600";

export interface CategoryFilterPanelProps {
  /**
   * The rotating cast for the HOT PICK chip, already resolved against the
   * picture library — the pinned item first when Cấu hình names one, then the
   * library's newest. Empty or absent leaves the chip out entirely.
   */
  hotPicks?: { name: string; imageUrl: string | null }[];
}

/**
 * Search + filter panel above the category listing.
 *
 * Every control that has data behind it writes to the URL and the listing
 * queries from there. The two chips under "Khác" and the rank chip are left
 * disabled: nothing in the schema records a free-account flag or a rank band
 * to filter on, and a live-looking control that changes nothing is what this
 * panel was before.
 */
export function CategoryFilterPanel({ hotPicks }: CategoryFilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [skinQuery, setSkinQuery] = useState(params.get("skin") ?? "");
  const [accessoryQuery, setAccessoryQuery] = useState(params.get("phukien") ?? "");
  const [priceMin, setPriceMin] = useState(params.get("min") ?? "");
  const [priceMax, setPriceMax] = useState(params.get("max") ?? "");
  const [pricePreset, setPricePreset] = useState<number | null>(() => {
    const index = PRICE_PRESETS.findIndex(
      (preset) =>
        preset.min === (params.get("min") ?? "") &&
        preset.max === (params.get("max") ?? ""),
    );
    return index === -1 ? null : index;
  });
  const sort = (params.get("sort") as SortValue) ?? "newest";
  const source = (params.get("nguon") as SourceValue) ?? "all";

  /**
   * Rewrites the URL, which is what the listing actually reads.
   *
   * The panel used to keep every choice in local state and prevent the submit,
   * so a shopper could click "Dưới 500K" and watch nothing happen. Going
   * through the URL also makes a filtered listing shareable and survives a
   * reload.
   */
  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any change re-opens the listing at page one; page 4 of the old filter is
    // rarely page 4 of the new one.
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handlePricePresetClick(index: number) {
    const preset = PRICE_PRESETS[index];
    setPricePreset(index);
    setPriceMin(preset.min);
    setPriceMax(preset.max);
    apply({ min: preset.min, max: preset.max });
  }

  function handlePriceMinChange(value: string) {
    setPriceMin(value);
    setPricePreset(null);
  }

  function handlePriceMaxChange(value: string) {
    setPriceMax(value);
    setPricePreset(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    apply({
      skin: skinQuery.trim(),
      phukien: accessoryQuery.trim(),
      min: priceMin.replace(/\D/g, ""),
      max: priceMax.replace(/\D/g, ""),
    });
  }

  return (
    // mt-14 is the room the gold badge needs. It floats 3.2rem clear of the
    // field and takes no space of its own, so without this it would sit on top
    // of whatever heading the page put above the panel.
    <div className="mt-14 mb-10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-[6] relative min-w-0">
            <ScopeSearchField
              value={skinQuery}
              onChange={setSkinQuery}
              placeholder="Tìm: ORA by OneTap, Forsaken, Bubblegum Deathwish......"
              // A real non-breaking space, not the "&nbsp;" the capture
              // shows: a JSX string attribute is text, not markup, and the
              // entity would print itself.
              badge={"✦ Tìm skin yêu thích của bạn"}
              hotPick={
                hotPicks && hotPicks.length > 0
                  ? {
                      items: hotPicks,
                      // The box is filled as well as the URL, so the field
                      // shows what it just searched for and the shopper can
                      // correct it rather than retype the whole name.
                      onPick: (name) => {
                        setSkinQuery(name);
                        apply({ skin: name });
                      },
                    }
                  : undefined
              }
            />
          </div>

          <div className="flex-[4] relative min-w-0">
            <div className={SEARCH_SHELL_CLASS}>
              <Package size={15} className="text-neutral-500 shrink-0" />
              <input
                type="text"
                value={accessoryQuery}
                onChange={(event) => setAccessoryQuery(event.target.value)}
                placeholder="Tìm phụ kiện (Buddy, Card...)"
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
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div>
              <span className={GROUP_LABEL_CLASS}>Khoảng giá</span>
              <div className="flex items-center gap-2">
                <div className={PRICE_INPUT_SHELL_CLASS}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMin}
                    onChange={(event) => handlePriceMinChange(event.target.value)}
                    placeholder="0"
                    className={PRICE_INPUT_CLASS}
                  />
                </div>
                <span className="text-neutral-600">-</span>
                <div className={PRICE_INPUT_SHELL_CLASS}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMax}
                    onChange={(event) => handlePriceMaxChange(event.target.value)}
                    placeholder="Bất kỳ"
                    className={PRICE_INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((preset, index) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePricePresetClick(index)}
                  className={pricePreset === index ? CHIP_ACTIVE : CHIP_INACTIVE}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-neutral-800/40" />

          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-2.5 w-full">
            <div>
              <span className={GROUP_LABEL_CLASS}>Sắp xếp</span>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => apply({ sort: option.value === "newest" ? "" : option.value })}
                    className={sort === option.value ? CHIP_ACTIVE : CHIP_INACTIVE}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={GROUP_LABEL_CLASS}>Nguồn</span>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => apply({ nguon: option.value === "all" ? "" : option.value })}
                    className={source === option.value ? CHIP_ACTIVE : CHIP_INACTIVE}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={GROUP_LABEL_CLASS}>Rank</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled title={NO_DATA} className={CHIP_DISABLED}>
                  Rank: Bất kỳ
                </button>
              </div>
            </div>

            <div>
              <span className={GROUP_LABEL_CLASS}>Khác</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled title={NO_DATA} className={CHIP_DISABLED}>
                  LOL Free
                </button>
                <button type="button" disabled title={NO_DATA} className={CHIP_DISABLED}>
                  TFT Free
                </button>
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
    </div>
  );
}
