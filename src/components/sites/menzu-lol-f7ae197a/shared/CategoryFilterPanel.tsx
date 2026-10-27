"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Clock, Crown, Layers, Loader2, Search, SlidersHorizontal, Trophy } from "lucide-react";

import { CF_RANK_GROUPS, CF_RANKS, rankPlace } from "@/lib/cfRanks";
import { CF_RANK_MATCHES, rankMatchPlace } from "@/lib/cfRankMatch";

import {
  CHIP_ACTIVE,
  CHIP_INACTIVE,
  GROUP_DIVIDER,
  GROUP_LABEL_CLASS,
  PANEL_CLASS,
  SEGMENT_IDLE,
  SEGMENT_PICKED,
  SEGMENTS_CLASS,
} from "./filterChrome";
import { ScopeSearchField } from "./ScopeSearchField";
import { LadderRangeSelect, type LadderGroup } from "./LadderRangeSelect";

interface PricePreset {
  label: string;
  min: string;
  max: string;
}

// Bands for what this shop sells — accounts from 7.000đ to 70.000đ — not the
// cloned shop's 500K-to-5M ladder, on which every account here fell into the
// first chip and the other five found nothing. The top band stays open.
const PRICE_PRESETS: PricePreset[] = [
  { label: "Dưới 50K", min: "0", max: "50000" },
  { label: "50K - 100K", min: "50000", max: "100000" },
  { label: "100K - 200K", min: "100000", max: "200000" },
  { label: "200K - 500K", min: "200000", max: "500000" },
  { label: "500K trở lên", min: "500000", max: "" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá ↑" },
  { value: "price-desc", label: "Giá ↓" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// The VIP levels an account can carry, as the shop numbers them ("mà đánh
// số 1 2 3 4 5 6 7", then "thêm VIP 8 đi" on 24/10/2026: the game has
// eight), and Đột Kích's ranks in their groups, a rank's place being its
// index plus one.
const VIP_GROUPS: LadderGroup[] = [
  { items: [1, 2, 3, 4, 5, 6, 7, 8].map((level) => ({ place: level, label: `VIP ${level}` })) },
];
const RANK_GROUPS: LadderGroup[] = CF_RANK_GROUPS.map((group) => ({
  label: group.label,
  items: group.ranks.map((rank) => ({ place: CF_RANKS.indexOf(rank.name) + 1, label: rank.name })),
}));
// Rank Match tiers, one list (the owner, 24/10/2026: "thêm lọc rank match").
const RANK_MATCH_GROUPS: LadderGroup[] = [
  { items: CF_RANK_MATCHES.map((tier, index) => ({ place: index + 1, label: tier })) },
];

// "Loại": what mail an account comes with, as its tag on the card says
// (the owner, 24/10/2026: "lọc tài khoản thêm loại nfa, full"). Written to
// the URL as ?loai=nfa|full; empty is every account.
const TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "nfa", label: "NFA" },
  { value: "full", label: "Full thông tin" },
] as const;

const PRICE_INPUT_SHELL_CLASS =
  "flex items-center gap-1.5 h-10 px-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex-1 min-w-0 transition-colors focus-within:border-[var(--menzu-accent)]/60";
const PRICE_INPUT_CLASS =
  "bg-transparent outline-none text-white text-sm w-full min-w-0 font-bold tabular-nums placeholder-neutral-500";
// The currency at the field's end, in the filter's small grey type, as menzu
// closes its price fields (24/10/2026, "thêm từ vnđ vô đi").
const PRICE_UNIT_CLASS = "shrink-0 text-[11px] font-bold text-neutral-500";

export interface CategoryFilterPanelProps {
  /**
   * The rotating cast for the HOT PICK chip, already resolved against the
   * picture library — the pinned item first when Cấu hình names one, then the
   * VIP guns on the shelf's accounts for sale. Empty or absent leaves the chip
   * out entirely.
   */
  hotPicks?: { name: string; imageUrl: string | null }[];
}

/**
 * Search + filter panel above the category listing.
 *
 * Every control writes to the URL and the listing queries from there. The
 * panel used to carry the cloned shop's controls as well — a "Nguồn" split
 * between DROP mail and MENZU, a rank chip, "LOL Free" / "TFT Free", a box
 * for Valorant buddies and cards — over a shelf of Đột Kích accounts; those
 * are gone, and the one box searches the whole account (name, rank,
 * description, skins).
 */
export function CategoryFilterPanel({ hotPicks }: CategoryFilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [skinQuery, setSkinQuery] = useState(params.get("skin") ?? "");
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
  const type = params.get("loai") === "nfa" || params.get("loai") === "full" ? (params.get("loai") as string) : "";
  const vipLevel = (key: string) => {
    const n = Number(params.get(key));
    return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
  };
  const vip = { min: vipLevel("vmin"), max: vipLevel("vmax") };
  const rank = { min: rankPlace(params.get("rmin")) ?? null, max: rankPlace(params.get("rmax")) ?? null };
  const rankMatch = {
    min: rankMatchPlace(params.get("mmin")) ?? null,
    max: rankMatchPlace(params.get("mmax")) ?? null,
  };

  // The pressed chip lights in the same frame as the press. The URL is the
  // only source of truth — these are React's own optimistic copies of it,
  // which it hands back to the URL's value when the navigation commits or
  // fails — so a chip can never stay lit for a filter that did not land.
  const [isPending, startTransition] = useTransition();
  const [shownSort, showSort] = useOptimistic(sort);
  const [shownType, showType] = useOptimistic(type);
  const [shownVip, showVip] = useOptimistic(vip);
  const [shownRank, showRank] = useOptimistic(rank);
  const [shownRankMatch, showRankMatch] = useOptimistic(rankMatch);
  /** The price and chip groups, on a phone: folded until asked for. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtering =
    priceMin !== "" ||
    priceMax !== "" ||
    shownSort !== "newest" ||
    shownType !== "" ||
    shownVip.min !== null ||
    shownVip.max !== null ||
    shownRank.min !== null ||
    shownRank.max !== null ||
    shownRankMatch.min !== null ||
    shownRankMatch.max !== null;

  // The grid is the server page's, out of this panel's reach; it reads this
  // attribute off <html> and steps back while the filter is on its way.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-filtering", isPending);
    return () => document.documentElement.removeAttribute("data-filtering");
  }, [isPending]);

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
    // As a transition: the page in front stays up and interactive until the
    // new one is ready, instead of dropping to its loading skeleton on every
    // chip. This is what lets a category page carry a loading.tsx at all.
    startTransition(() => {
      // scroll: false keeps the shopper where they are; a filter that threw
      // them back to the top of the page made every chip a trip (24/10/2026,
      // "mỗi lần lọc là tự nhảy về đầu trang").
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
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
      min: priceMin.replace(/\D/g, ""),
      max: priceMax.replace(/\D/g, ""),
    });
  }

  return (
    // mt-14 is the room the gold badge needs. It floats 3.2rem clear of the
    // field and takes no space of its own, so without this it would sit on top
    // of whatever heading the page put above the panel.
    // 56px over the panel (a heading above may ask for more: the category
    // page's accounts heading does), 32px under it, the cards' own gap
    // (24/10/2026, "tăng đi").
    <div className="mt-14 mb-8">
      <form onSubmit={handleSubmit} aria-busy={isPending} className="flex flex-col gap-3 w-full">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-1 relative min-w-0">
            <ScopeSearchField
              value={skinQuery}
              onChange={setSkinQuery}
              placeholder="Tìm theo tên, rank, mô tả hoặc skin…"
              busy={isPending}
              // A real non-breaking space, not the "&nbsp;" the capture
              // shows: a JSX string attribute is text, not markup, and the
              // entity would print itself.
              badge={"✦ Tìm tài khoản"}
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

          <button
            type="submit"
            className="hidden md:flex bg-[var(--brand-dark)] hover:bg-[var(--brand)] active:scale-95 text-white font-semibold rounded-xl px-6 transition items-center gap-2 shrink-0"
          >
            {isPending ? (
              <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Search size={16} />
            )}
            Tìm kiếm
          </button>
        </div>

        {/* On a phone the chip groups fold behind one row: two search boxes,
            three rows of chips and a full-width button took the whole first
            screen before a single product was in view. The row stays open
            by itself while a filter other than the default is on, so what is
            narrowing the list is never hidden. From md up the panel is
            always open, as before. */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen || filtering}
          className="md:hidden flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] font-semibold text-neutral-300"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} aria-hidden />
            Bộ lọc
            {filtering ? (
              <span className="rounded-md bg-[var(--brand)]/15 px-1.5 py-0.5 text-[10px] text-[var(--brand)]">
                Đang lọc
              </span>
            ) : null}
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            className={`transition-transform duration-200 motion-reduce:transition-none ${filtersOpen || filtering ? "rotate-180" : ""}`}
          />
        </button>
        <div className={filtersOpen || filtering ? "" : "hidden md:block"}>
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
                  <span className={PRICE_UNIT_CLASS}>VNĐ</span>
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
                  <span className={PRICE_UNIT_CLASS}>VNĐ</span>
                </div>
              </div>
            </div>

            {/* 4px above and below the 32px chips stand the row as tall as the
                40px price fields beside it, so the two sit level. */}
            <div className="flex flex-wrap items-center gap-2 py-1">
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
              <div className={SEGMENTS_CLASS}>
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      startTransition(() => {
                        showSort(option.value);
                        apply({ sort: option.value === "newest" ? "" : option.value });
                      })
                    }
                    className={shownSort === option.value ? SEGMENT_PICKED : SEGMENT_IDLE}
                  >
                    {option.value === "newest" ? <Clock size={12} aria-hidden /> : null}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span aria-hidden className={GROUP_DIVIDER} />

            <div>
              <span className={GROUP_LABEL_CLASS}>Loại</span>
              <div className={SEGMENTS_CLASS}>
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value || "all"}
                    type="button"
                    aria-pressed={shownType === option.value}
                    onClick={() =>
                      startTransition(() => {
                        showType(option.value);
                        apply({ loai: option.value });
                      })
                    }
                    className={shownType === option.value ? SEGMENT_PICKED : SEGMENT_IDLE}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <span aria-hidden className={GROUP_DIVIDER} />

            <div>
              <span className={GROUP_LABEL_CLASS}>VIP</span>
              <LadderRangeSelect
                name="VIP"
                icon={<Crown size={14} />}
                allLabel="Tất cả VIP"
                groups={VIP_GROUPS}
                min={shownVip.min}
                max={shownVip.max}
                short={(place) => String(place)}
                onChange={(min, max) =>
                  startTransition(() => {
                    showVip({ min, max });
                    apply({ vmin: min === null ? "" : String(min), vmax: max === null ? "" : String(max) });
                  })
                }
              />
            </div>

            <span aria-hidden className={GROUP_DIVIDER} />

            <div>
              <span className={GROUP_LABEL_CLASS}>Rank</span>
              <LadderRangeSelect
                name="Rank"
                icon={<Layers size={14} />}
                allLabel="Tất cả rank"
                groups={RANK_GROUPS}
                min={shownRank.min}
                max={shownRank.max}
                short={(place) => CF_RANKS[place - 1]}
                onChange={(min, max) =>
                  startTransition(() => {
                    showRank({ min, max });
                    apply({ rmin: min === null ? "" : String(min), rmax: max === null ? "" : String(max) });
                  })
                }
              />
            </div>

            <span aria-hidden className={GROUP_DIVIDER} />

            <div>
              <span className={GROUP_LABEL_CLASS}>Rank Match</span>
              <LadderRangeSelect
                name="Rank Match"
                icon={<Trophy size={14} />}
                allLabel="Tất cả Rank Match"
                groups={RANK_MATCH_GROUPS}
                min={shownRankMatch.min}
                max={shownRankMatch.max}
                short={(place) => CF_RANK_MATCHES[place - 1]}
                onChange={(min, max) =>
                  startTransition(() => {
                    showRankMatch({ min, max });
                    apply({ mmin: min === null ? "" : String(min), mmax: max === null ? "" : String(max) });
                  })
                }
              />
            </div>
          </div>
        </div>
        </div>

        <button
          type="submit"
          className="press md:hidden flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-dark)] text-[14px] font-semibold text-white hover:bg-[var(--brand)]"
        >
          {isPending ? (
            <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Search size={16} />
          )}
          Tìm kiếm
        </button>
      </form>
    </div>
  );
}
