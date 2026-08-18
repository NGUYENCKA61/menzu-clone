"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, ImageOff, Search } from "lucide-react";
import type { AccountDetail } from "./AccountBuyPanel";

export interface InventoryItemView {
  id: string;
  kind: string;
  name: string;
  iconUrl: string | null;
  weapon: string | null;
}

export interface AccountInventoryProps {
  account: AccountDetail;
  items: InventoryItemView[];
}

// Verbatim section-scoped CSS from the live site's <style> block.
const ACCOUNT_INVENTORY_STYLES = `
@keyframes skin-tab-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes card-appear {
  0%   { opacity: .2; transform: translateY(20px) scale(.95); filter: blur(1px); }
  100% { opacity: 1;  transform: translateY(0) scale(1);      filter: blur(0);   }
}
.skin-tab-enter   { animation: skin-tab-enter 0.38s cubic-bezier(.22,1,.36,1) both; will-change: opacity; }
.card-item-appear { animation: card-appear 0.5s cubic-bezier(.22,1,.36,1) both; }
`;

type InventoryTabKey = "weaponSkins" | "buddies" | "agents" | "cards" | "sprays";

interface InventoryTab {
  key: InventoryTabKey;
  label: string;
  /** SkinKind the tab draws from. */
  kind: string;
}

// The kinds wear this shop's labels: AGENT rows are characters and BUDDY rows
// are gear — the Valorant taxonomy's spare slots, reused instead of migrated.
// Cards and sprays stay only for legacy scraped data; at zero they never show.
const INVENTORY_TABS: InventoryTab[] = [
  { key: "weaponSkins", label: "Trang bị súng", kind: "WEAPON_SKIN" },
  { key: "agents", label: "Nhân vật", kind: "AGENT" },
  { key: "buddies", label: "Trang bị", kind: "BUDDY" },
  { key: "cards", label: "Cards", kind: "CARD" },
  { key: "sprays", label: "Sprays", kind: "SPRAY" },
];

const ALL_WEAPONS = "All Skin";
// Three rows of the desktop grid (5 columns); "Xem thêm" pages the rest in.
const PAGE_SIZE = 15;

// Each tab wears its own colour when open — đỏ, cam, hồng in tab order — and
// the block's small accents (filter chips, tile hover, "Xem thêm") follow the
// open tab's colour. Everything is a complete literal string per colour,
// because Tailwind cannot see a composed class name. Type per the buy panel's
// "Mua ngay" button.
const TAB_BASE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-colors border";
const TAB_INACTIVE =
  "border-[#24252a] bg-[#101114] text-neutral-400 hover:border-neutral-600 hover:text-white";
const FILTER_BASE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-bold transition-colors border";
const FILTER_INACTIVE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-bold transition-colors border bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white";

interface TabAccent {
  tabActive: string;
  filterActive: string;
  tileHover: string;
  searchFocus: string;
}

const RED_ACCENT: TabAccent = {
  tabActive:
    "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] text-white",
  filterActive: "bg-[var(--menzu-accent)] border-[var(--menzu-accent)] text-white",
  tileHover: "hover:border-[var(--menzu-accent)]/50",
  searchFocus: "focus-within:border-[var(--menzu-accent)]/60",
};
const PURPLE_ACCENT: TabAccent = {
  tabActive: "border-[#7c3aed] bg-[#7c3aed] hover:bg-[#6d28d9] text-white",
  filterActive: "bg-[#7c3aed] border-[#7c3aed] text-white",
  tileHover: "hover:border-[#7c3aed]/50",
  searchFocus: "focus-within:border-[#7c3aed]/60",
};
const ORANGE_ACCENT: TabAccent = {
  tabActive: "border-[#f97316] bg-[#f97316] hover:bg-[#ea580c] text-white",
  filterActive: "bg-[#f97316] border-[#f97316] text-white",
  tileHover: "hover:border-[#f97316]/50",
  searchFocus: "focus-within:border-[#f97316]/60",
};

const TAB_ACCENTS: Record<InventoryTabKey, TabAccent> = {
  weaponSkins: RED_ACCENT,
  agents: PURPLE_ACCENT,
  buddies: ORANGE_ACCENT,
  // Legacy scraped kinds; never shown for typed accounts.
  cards: RED_ACCENT,
  sprays: RED_ACCENT,
};

/**
 * The five inventory tabs on the account-detail page, with a weapon filter
 * over the skins tab.
 *
 * Item counts come from `account` rather than from `items.length`: the totals
 * were scraped for every product, but the per-item rows only exist for those
 * scripts/scrape-skins.mjs has reached. A tab with a total but no rows shows
 * placeholder tiles instead of claiming the account is empty.
 */
export function AccountInventory({ account, items }: AccountInventoryProps) {
  // Only tabs with something behind them. The taxonomy is Valorant's five
  // kinds, but a CrossFire account only ever fills the weapons one — and a
  // bar of four zero-count tabs sells emptiness, not inventory.
  const tabs = INVENTORY_TABS.filter((t) => account[t.key] > 0);

  const [activeTab, setActiveTab] = useState<InventoryTabKey>(
    () => tabs[0]?.key ?? "weaponSkins",
  );
  const [weapon, setWeapon] = useState(ALL_WEAPONS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");

  const tab = INVENTORY_TABS.find((t) => t.key === activeTab) ?? INVENTORY_TABS[0]!;
  const tabItems = useMemo(
    () => items.filter((item) => item.kind === tab.kind),
    [items, tab.kind],
  );

  /** Weapons present on this account, so the row never offers an empty filter. */
  const weapons = useMemo(() => {
    if (tab.key !== "weaponSkins") return [];
    const names = [...new Set(tabItems.map((item) => item.weapon).filter(Boolean))] as string[];
    return [ALL_WEAPONS, ...names.sort()];
  }, [tabItems, tab.key]);

  const filtered = useMemo(() => {
    const base =
      tab.key === "weaponSkins" && weapon !== ALL_WEAPONS
        ? tabItems.filter((item) => item.weapon === weapon)
        : tabItems;
    const q = query.trim().toLowerCase();
    return q ? base.filter((item) => item.name.toLowerCase().includes(q)) : base;
  }, [tabItems, weapon, tab.key, query]);

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;
  const total = account[activeTab];
  const accent = TAB_ACCENTS[activeTab];

  function selectTab(key: InventoryTabKey) {
    setActiveTab(key);
    setWeapon(ALL_WEAPONS);
    setShown(PAGE_SIZE);
    // Each tab searches its own goods; a stale query would open the next tab
    // pre-filtered by a word typed for the last one.
    setQuery("");
  }

  // Nothing listed anywhere: no box at all, rather than a heading over an
  // empty grid pretending to load.
  if (tabs.length === 0) return null;

  return (
    <div className="w-full mt-12 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6">
      <style dangerouslySetInnerHTML={{ __html: ACCOUNT_INVENTORY_STYLES }} />

      {/* The reference separates the tab strip from the goods with a hairline. */}
      <div className="flex items-center gap-3 sm:gap-6 lg:gap-0 lg:justify-between overflow-x-auto hide-scrollbar whitespace-nowrap border-b border-neutral-800/80 pb-5">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => selectTab(entry.key)}
            className={`${TAB_BASE} ${
              entry.key === activeTab ? TAB_ACCENTS[entry.key].tabActive : TAB_INACTIVE
            }`}
          >
            {entry.label}
            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-black/20 text-[11px] sm:text-xs font-black">
              {account[entry.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search within the open tab, sized to this panel rather than the
          reference's half-width bar: field-height like the controls around
          it, capped at a readable width, left-aligned. The focus ring follows
          the open tab's colour. */}
      <label
        className={`mt-6 flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-[#24252a] bg-[#101114] px-4 transition-colors ${accent.searchFocus}`}
      >
        <Search size={15} aria-hidden className="shrink-0 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder={`Tìm kiếm ${tab.label.toLowerCase()}…`}
          className="h-full w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-neutral-500"
        />
      </label>

      {weapons.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-4 pb-1">
          {weapons.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setWeapon(name);
                setShown(PAGE_SIZE);
              }}
              aria-pressed={weapon === name}
              className={
                weapon === name ? `${FILTER_BASE} ${accent.filterActive}` : FILTER_INACTIVE
              }
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div key={`${activeTab}-${weapon}`} className="flex flex-col min-h-[400px] skin-tab-enter">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {visible.length === 0 && query.trim() !== "" ? (
            // A search that found nothing is an answer, not a loading state —
            // the placeholder tiles below would read as one.
            <p className="col-span-full py-10 text-center text-sm font-semibold text-neutral-500">
              Không tìm thấy “{query.trim()}” trong {tab.label.toLowerCase()}.
            </p>
          ) : visible.length > 0
            ? visible.map((item) => (
                <div
                  key={item.id}
                  className={`group aspect-[4/3] rounded-xl bg-neutral-950 border border-neutral-800 ${accent.tileHover} transition-colors flex flex-col items-center justify-center p-2 gap-1.5 card-item-appear overflow-hidden`}
                >
                  {item.iconUrl ? (
                    <div className="relative w-full flex-1">
                      <Image
                        src={item.iconUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <ImageOff size={18} className="text-neutral-700 flex-1" />
                  )}
                  <span className="w-full text-center text-[10px] font-bold text-neutral-400 group-hover:text-white transition-colors truncate">
                    {item.name}
                  </span>
                </div>
              ))
            : // Totals exist for every product, per-item rows do not yet.
              Array.from({ length: Math.min(total, PAGE_SIZE) }, (_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center card-item-appear"
                >
                  <ImageOff size={18} className="text-neutral-700" />
                </div>
              ))}
        </div>

        {/* The reference's bare tracked-out line, not a pill — under a grid
            of bordered tiles, another bordered box would read as one more
            tile. Type matches the panel's small caps labels. */}
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE_SIZE)}
            className="mx-auto mt-8 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-white"
          >
            Xem thêm {remaining} món
            <ChevronDown size={14} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
