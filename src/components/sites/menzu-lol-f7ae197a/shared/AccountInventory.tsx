"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ImageOff, Search } from "lucide-react";
import type { AccountDetail } from "./AccountBuyPanel";
import { ALL_GROUPS, CHARACTER_GROUPS, GEAR_GROUPS, WEAPON_GROUPS } from "@/lib/cfInventoryGroups";

export interface InventoryItemView {
  id: string;
  kind: string;
  name: string;
  iconUrl: string | null;
  /** The item's group: a weapon's "Vũ khí phụ", a gear item's "Chức năng". */
  weapon: string | null;
  /** VIP / PVE / Nano (lib/cfGrades); null is an ordinary item. */
  grade: "VIP" | "PVE" | "Nano" | null;
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
@media (prefers-reduced-motion: reduce) {
  .skin-tab-enter, .card-item-appear { animation: none; }
}
`;

type InventoryTabKey = "weaponSkins" | "characters" | "buddies" | "cards" | "sprays";

interface InventoryTab {
  key: InventoryTabKey;
  label: string;
  /** The SkinKinds the tab draws from. */
  kinds: string[];
  /** Its chips after "Tất cả", in the game's order. */
  groups: string[];
}

// CrossFire's own inventory, three tabs each with its sub-tabs as a chip row
// (the owner, 25/10/2026, with screenshots of the game and of menzu's "All
// Skin" row). The characters tab gathers the three character kinds, its
// chips being the kinds; weapons and gear chip by group. Cards and sprays
// stay only for legacy scraped data; at zero they never show.
const INVENTORY_TABS: InventoryTab[] = [
  { key: "weaponSkins", label: "Trang bị súng", kinds: ["WEAPON_SKIN"], groups: WEAPON_GROUPS },
  { key: "characters", label: "Nhân vật", kinds: ["AGENT", "COSTUME", "ACCESSORY"], groups: CHARACTER_GROUPS },
  { key: "buddies", label: "Trang bị", kinds: ["BUDDY"], groups: GEAR_GROUPS },
  { key: "cards", label: "Cards", kinds: ["CARD"], groups: [] },
  { key: "sprays", label: "Sprays", kinds: ["SPRAY"], groups: [] },
];

const KIND_GROUP: Record<string, string> = {
  AGENT: "Nhân vật",
  COSTUME: "Trang phục",
  ACCESSORY: "Phụ kiện",
};

function tabTotal(account: AccountDetail, key: InventoryTabKey): number {
  return key === "characters" ? account.agents + account.costumes + account.accessories : account[key];
}

/** The chip an item sits under: its kind on the characters tab, its group elsewhere. */
function groupOf(tab: InventoryTab, item: InventoryItemView): string | null {
  return tab.key === "characters" ? (KIND_GROUP[item.kind] ?? null) : item.weapon;
}

/**
 * menzu's tile treatment, tinted by the item's grade the way CrossFire tints
 * its own inventory (the owner, 25/10/2026: "làm đi", "ô tím hình như là
 * súng AI"): VIP gold, PVE purple, Nano blue. A bar along the top with the
 * colour falling from it down the tile, as menzu's does ("sao cái khoảng đó
 * của mình đen hơn menzu": a glow from the foot left the top black),
 * a tinted border, the name and a corner badge in the same colour.
 * Ordinary items stay plain. Every tile sits on menzu's warm dark grey, not
 * black, and the tint is half as strong (the owner, 25/10/2026, comparing
 * the feet of two tiles: menzu's #1c1916 against our #0a0a0a).
 */
const GRADE_TILES: Record<"VIP" | "PVE" | "Nano", { border: string; top: string; glow: string; name: string; badge: string }> = {
  VIP: {
    border: "border-amber-500/40",
    top: "bg-amber-400",
    glow: "from-amber-500/10",
    name: "text-amber-300",
    badge: "bg-amber-400 text-black",
  },
  PVE: {
    border: "border-violet-500/40",
    top: "bg-violet-500",
    glow: "from-violet-500/10",
    name: "text-violet-300",
    badge: "bg-violet-500 text-white",
  },
  Nano: {
    border: "border-sky-500/40",
    top: "bg-sky-400",
    glow: "from-sky-500/10",
    name: "text-sky-300",
    badge: "bg-sky-400 text-black",
  },
};

// Grade first across the whole tab, then the game's groups (the owner,
// 25/10/2026: "theo thứ tự sắp vip -> nano -> pve -> đồ thường từ trái sang phải").
const GRADE_ORDER = { VIP: 0, Nano: 1, PVE: 2 } as const;
const gradeRank = (item: InventoryItemView) => (item.grade ? GRADE_ORDER[item.grade] : 3);

// Three rows of the desktop grid (5 columns); "Xem thêm" pages the rest in.
const PAGE_SIZE = 15;

// The open tab and its active chip are solid: weapons red, characters orange,
// gear violet; the block's small accents (filter chips and their scroll bar,
// tile hover, "Xem thêm") follow the open tab's colour. Everything is a complete literal string per colour,
// because Tailwind cannot see a composed class name. Tab type is menzu's:
// 14px, 16px from sm, black capitals (the owner, 25/10/2026: "6 thử 3p").
const TAB_BASE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 rounded-2xl text-sm sm:text-base font-black uppercase transition-colors border";
const TAB_INACTIVE =
  "border-line bg-raise text-mist hover:border-line-strong hover:text-frost";
const FILTER_BASE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-semibold transition-colors border";
const FILTER_INACTIVE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-semibold transition-colors border bg-raise border-line text-mist hover:border-line-strong hover:text-frost";

interface TabAccent {
  tabActive: string;
  filterActive: string;
  barFill: string;
  tileHover: string;
  searchFocus: string;
}

const RED_ACCENT: TabAccent = {
  // The open tab in solid red, menzu's way (the owner, 25/10/2026: "đỏ đặc").
  tabActive: "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white",
  filterActive: "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white",
  barFill: "bg-[var(--menzu-accent)]",
  tileHover: "hover:border-white/25",
  searchFocus: "focus-within:border-[var(--menzu-accent)]/60 focus-within:ring-2 focus-within:ring-[var(--menzu-accent)]/25",
};
// Each tab its own colour, in the order the owner named them (25/10/2026:
// "đỏ đặc", "cam", "tím", "ứng với 3 lựa chọn"): weapons red, characters
// orange, gear violet.
const ORANGE_ACCENT: TabAccent = {
  tabActive: "border-transparent bg-orange-500 text-white",
  filterActive: "border-transparent bg-orange-500 text-white",
  barFill: "bg-orange-500",
  tileHover: "hover:border-white/25",
  searchFocus: "focus-within:border-[var(--menzu-accent)]/60 focus-within:ring-2 focus-within:ring-[var(--menzu-accent)]/25",
};
const VIOLET_ACCENT: TabAccent = {
  tabActive: "border-transparent bg-violet-500 text-white",
  filterActive: "border-transparent bg-violet-500 text-white",
  barFill: "bg-violet-500",
  tileHover: "hover:border-white/25",
  searchFocus: "focus-within:border-[var(--menzu-accent)]/60 focus-within:ring-2 focus-within:ring-[var(--menzu-accent)]/25",
};

const TAB_ACCENTS: Record<InventoryTabKey, TabAccent> = {
  weaponSkins: RED_ACCENT,
  characters: ORANGE_ACCENT,
  buddies: VIOLET_ACCENT,
  // Legacy scraped kinds; never shown for typed accounts.
  cards: RED_ACCENT,
  sprays: RED_ACCENT,
};

/**
 * A chip row that scrolls sideways the way menzu's does (the owner,
 * 25/10/2026: "7. Thêm này đi"): a mouse can drag it, and while it is wider
 * than the panel a bar under it fills as it scrolls, beside a hint. A row
 * that fits shows neither, since there is nothing to drag.
 */
function DragScrollRow({ fill, children }: { fill: string; children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  // How much of the row has been seen, 0 to 1; null while it all fits.
  const [reach, setReach] = useState<number | null>(null);

  // No first measure by hand: a ResizeObserver reports once as soon as it
  // starts watching. The track as well as the row, because a new tab's
  // chips widen the track, not the row.
  useEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const measure = () =>
      setReach(
        row.scrollWidth - row.clientWidth > 1 ? (row.scrollLeft + row.clientWidth) / row.scrollWidth : null,
      );
    row.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(track);
    return () => {
      row.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="mt-4">
      <div
        ref={rowRef}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          // Released outside the row: this move is a hover, not a drag.
          if ((event.buttons & 1) === 0) {
            drag.current = null;
            return;
          }
          const dx = event.clientX - start.x;
          if (!start.moved) {
            if (Math.abs(dx) < 4) return;
            start.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          event.currentTarget.scrollLeft = start.left - dx;
        }}
        onPointerUp={() => {
          // A drag that ends over a chip must not also pick it.
          dragged.current = drag.current?.moved ?? false;
          drag.current = null;
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClickCapture={(event) => {
          if (!dragged.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        className={`overflow-x-auto hide-scrollbar pb-1 ${reach !== null ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
      >
        <div ref={trackRef} className="flex w-max items-center gap-2">
          {children}
        </div>
      </div>
      {reach !== null ? (
        <div aria-hidden className="mt-2 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${fill}`} style={{ width: `${reach * 100}%` }} />
          </div>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-neutral-500">
            Kéo để xem thêm
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The inventory tabs on the account-detail page, each with its sub-tab chips.
 *
 * Item counts come from `account` rather than from `items.length`: the totals
 * were scraped for every product, but the per-item rows only exist for those
 * scripts/scrape-skins.mjs has reached. A tab with a total but no rows shows
 * placeholder tiles instead of claiming the account is empty.
 */
export function AccountInventory({ account, items }: AccountInventoryProps) {
  // Only tabs with something behind them; a bar of zero-count tabs sells
  // emptiness, not inventory.
  const tabs = INVENTORY_TABS.filter((t) => tabTotal(account, t.key) > 0);

  const [activeTab, setActiveTab] = useState<InventoryTabKey>(
    () => tabs[0]?.key ?? "weaponSkins",
  );
  const [group, setGroup] = useState(ALL_GROUPS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");

  const tab = INVENTORY_TABS.find((t) => t.key === activeTab) ?? INVENTORY_TABS[0]!;

  /** This tab's items: VIP, Nano, PVE, then the rest, each in the game's group order. */
  const tabItems = useMemo(() => {
    const rank = (item: InventoryItemView) => {
      const at = tab.groups.indexOf(groupOf(tab, item) ?? "");
      return at === -1 ? tab.groups.length : at;
    };
    return items
      .filter((item) => tab.kinds.includes(item.kind))
      .map((item, index) => ({ item, index }))
      .sort((a, b) => gradeRank(a.item) - gradeRank(b.item) || rank(a.item) - rank(b.item) || a.index - b.index)
      .map(({ item }) => item);
  }, [items, tab]);

  /** The groups present on this account, so the row never offers an empty chip. */
  const groups = useMemo(() => {
    const present = new Set(tabItems.map((item) => groupOf(tab, item)).filter(Boolean) as string[]);
    const known = tab.groups.filter((name) => present.has(name));
    const other = [...present].filter((name) => !tab.groups.includes(name)).sort();
    return [ALL_GROUPS, ...known, ...other];
  }, [tabItems, tab]);

  const filtered = useMemo(() => {
    const base = group !== ALL_GROUPS ? tabItems.filter((item) => groupOf(tab, item) === group) : tabItems;
    const q = query.trim().toLowerCase();
    return q ? base.filter((item) => item.name.toLowerCase().includes(q)) : base;
  }, [tabItems, group, tab, query]);

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;
  const total = tabTotal(account, activeTab);
  const accent = TAB_ACCENTS[activeTab];

  function selectTab(key: InventoryTabKey) {
    setActiveTab(key);
    setGroup(ALL_GROUPS);
    setShown(PAGE_SIZE);
    // Each tab searches its own goods; a stale query would open the next tab
    // pre-filtered by a word typed for the last one.
    setQuery("");
  }

  // Nothing listed anywhere: no box at all, rather than a heading over an
  // empty grid pretending to load.
  if (tabs.length === 0) return null;

  return (
    <div className="w-full mt-12 bg-white/[0.02] border border-white/10 border-neutral-800/80 rounded-2xl p-6">
      <style dangerouslySetInnerHTML={{ __html: ACCOUNT_INVENTORY_STYLES }} />

      {/* The reference separates the tab strip from the goods with a hairline.
          The tabs sit together at the start, not spread across the row (the
          owner, 25/10/2026: "cho sát nhau đi khỏi tách ra khoảng trống"). */}
      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar whitespace-nowrap border-b border-neutral-800/80 pb-5">
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
              {tabTotal(account, entry.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search within the open tab, sized to this panel rather than the
          reference's half-width bar: field-height like the controls around
          it, capped at a readable width, left-aligned. The focus ring follows
          the open tab's colour. */}
      <label
        className={`mt-6 flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 transition-[border-color,box-shadow] ${accent.searchFocus}`}
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

      {groups.length > 1 ? (
        <DragScrollRow fill={accent.barFill}>
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setGroup(name);
                setShown(PAGE_SIZE);
              }}
              aria-pressed={group === name}
              className={
                group === name ? `${FILTER_BASE} ${accent.filterActive}` : FILTER_INACTIVE
              }
            >
              {name}
            </button>
          ))}
        </DragScrollRow>
      ) : null}

      <div key={`${activeTab}-${group}`} className="flex flex-col min-h-[400px] skin-tab-enter">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {visible.length === 0 && query.trim() !== "" ? (
            // A search that found nothing is an answer, not a loading state —
            // the placeholder tiles below would read as one.
            <p className="col-span-full py-10 text-center text-sm font-semibold text-neutral-500">
              Không tìm thấy “{query.trim()}” trong {tab.label.toLowerCase()}.
            </p>
          ) : visible.length > 0
            ? visible.map((item) => {
                const look = item.grade ? GRADE_TILES[item.grade] : null;
                return (
                  <div
                    key={item.id}
                    className={`group relative aspect-[4/3] rounded-xl bg-[#161414] border ${look ? look.border : "border-neutral-800"} ${accent.tileHover} transition-colors flex flex-col items-center justify-center p-2 gap-1.5 card-item-appear overflow-hidden`}
                  >
                    {look ? (
                      <>
                        <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${look.top}`} />
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b ${look.glow} to-transparent`}
                        />
                        <span
                          className={`absolute left-0 top-0 z-[1] rounded-br-lg px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${look.badge}`}
                        >
                          {item.grade}
                        </span>
                      </>
                    ) : null}
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
                      <ImageOff size={18} className="relative text-neutral-700 flex-1" />
                    )}
                    <span
                      className={`relative w-full px-1 text-left text-[12px] font-bold ${look ? look.name : "text-neutral-400"} group-hover:text-white transition-colors truncate`}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })
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
            className="mx-auto mt-8 flex items-center gap-1.5 text-[14px] font-semibold text-neutral-500 transition-colors hover:text-white"
          >
            Xem thêm {remaining} món
            <ChevronDown size={14} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
