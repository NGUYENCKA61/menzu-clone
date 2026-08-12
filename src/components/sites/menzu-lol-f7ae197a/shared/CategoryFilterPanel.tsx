"use client";

import { useState } from "react";
import { Package, Search } from "lucide-react";

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

// Tailwind can't see dynamically-composed class names, so the chip's active
// and inactive states are always emitted as complete literal strings.
const CHIP_INACTIVE =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap";
const CHIP_ACTIVE =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--brand)]/50 bg-[var(--brand)]/15 text-[#a78bfa] transition-colors whitespace-nowrap";

const GROUP_LABEL_CLASS =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block";

const PRICE_INPUT_SHELL_CLASS =
  "flex items-center gap-1.5 h-10 px-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex-1 min-w-0";
const PRICE_INPUT_CLASS =
  "bg-transparent outline-none text-white text-sm w-full min-w-0 font-bold tabular-nums placeholder-neutral-600";

/**
 * Self-contained search + filter panel shown above category/listing grids.
 * Holds all filter state locally; wiring to real search/query params comes
 * later, so submit just prevents the default page reload for now.
 */
export function CategoryFilterPanel() {
  const [skinQuery, setSkinQuery] = useState("");
  const [accessoryQuery, setAccessoryQuery] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [pricePreset, setPricePreset] = useState<number | null>(null);
  const [sort, setSort] = useState<SortValue>("newest");
  const [source, setSource] = useState<SourceValue>("all");
  const [lolFree, setLolFree] = useState(false);
  const [tftFree, setTftFree] = useState(false);

  function handlePricePresetClick(index: number) {
    const preset = PRICE_PRESETS[index];
    setPricePreset(index);
    setPriceMin(preset.min);
    setPriceMax(preset.max);
  }

  function handlePriceMinChange(value: string) {
    setPriceMin(value);
    setPricePreset(null);
  }

  function handlePriceMaxChange(value: string) {
    setPriceMax(value);
    setPricePreset(null);
  }

  return (
    <div className="mb-10">
      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-3 w-full"
      >
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-[6] relative min-w-0">
            <div className="flex items-center gap-2 h-[50px] px-4 rounded-xl bg-neutral-900/60 border border-neutral-800/60 focus-within:border-[var(--brand)]/60 transition-colors">
              <Search size={15} className="text-neutral-500 shrink-0" />
              <input
                type="text"
                value={skinQuery}
                onChange={(event) => setSkinQuery(event.target.value)}
                placeholder="Tìm: ORA by OneTap, Forsaken, Bubblegum Deathwish......"
                className="flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex-[4] relative min-w-0">
            <div className="flex items-center gap-2 h-[50px] px-4 rounded-xl bg-neutral-900/60 border border-neutral-800/60 focus-within:border-[var(--brand)]/60 transition-colors">
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

        <div className="bg-neutral-900/35 border border-neutral-800/40 rounded-2xl p-3.5 md:p-4 flex flex-col gap-4">
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
                    onClick={() => setSort(option.value)}
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
                    onClick={() => setSource(option.value)}
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
                <button type="button" className={CHIP_INACTIVE}>
                  Rank: Bất kỳ
                </button>
              </div>
            </div>

            <div>
              <span className={GROUP_LABEL_CLASS}>Khác</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLolFree((previous) => !previous)}
                  className={lolFree ? CHIP_ACTIVE : CHIP_INACTIVE}
                >
                  LOL Free
                </button>
                <button
                  type="button"
                  onClick={() => setTftFree((previous) => !previous)}
                  className={tftFree ? CHIP_ACTIVE : CHIP_INACTIVE}
                >
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
