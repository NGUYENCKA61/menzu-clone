"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
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

const INVENTORY_TABS: InventoryTab[] = [
  { key: "weaponSkins", label: "Weapon Skins", kind: "WEAPON_SKIN" },
  { key: "buddies", label: "Buddies", kind: "BUDDY" },
  { key: "agents", label: "Agents", kind: "AGENT" },
  { key: "cards", label: "Cards", kind: "CARD" },
  { key: "sprays", label: "Sprays", kind: "SPRAY" },
];

const ALL_WEAPONS = "All Skin";
const PAGE_SIZE = 20;

// Tailwind can't see dynamically-composed class names, so the tab's active
// and inactive states are always emitted as complete literal strings.
const TAB_BUTTON_ACTIVE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-2xl font-black uppercase transition-colors bg-[#7C3AED] text-white";
const TAB_BUTTON_INACTIVE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-2xl font-black uppercase transition-colors text-neutral-400 hover:text-white";
const FILTER_ACTIVE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-bold transition-colors border bg-[#7C3AED] border-[#7C3AED] text-white";
const FILTER_INACTIVE =
  "shrink-0 px-5 py-2 text-sm rounded-full font-bold transition-colors border bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white";

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
  const [activeTab, setActiveTab] = useState<InventoryTabKey>("weaponSkins");
  const [weapon, setWeapon] = useState(ALL_WEAPONS);
  const [shown, setShown] = useState(PAGE_SIZE);

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

  const filtered = useMemo(
    () =>
      tab.key === "weaponSkins" && weapon !== ALL_WEAPONS
        ? tabItems.filter((item) => item.weapon === weapon)
        : tabItems,
    [tabItems, weapon, tab.key],
  );

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;
  const total = account[activeTab];

  function selectTab(key: InventoryTabKey) {
    setActiveTab(key);
    setWeapon(ALL_WEAPONS);
    setShown(PAGE_SIZE);
  }

  return (
    <div className="w-full mt-12 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6">
      <style dangerouslySetInnerHTML={{ __html: ACCOUNT_INVENTORY_STYLES }} />

      <div className="flex items-center gap-3 sm:gap-6 lg:gap-0 lg:justify-between overflow-x-auto hide-scrollbar whitespace-nowrap">
        {INVENTORY_TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => selectTab(entry.key)}
            className={entry.key === activeTab ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}
          >
            {entry.label}
            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-black/20 text-[11px] sm:text-xs font-black">
              {account[entry.key]}
            </span>
          </button>
        ))}
      </div>

      {weapons.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-6 pb-1">
          {weapons.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setWeapon(name);
                setShown(PAGE_SIZE);
              }}
              aria-pressed={weapon === name}
              className={weapon === name ? FILTER_ACTIVE : FILTER_INACTIVE}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div key={`${activeTab}-${weapon}`} className="flex flex-col min-h-[400px] skin-tab-enter">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {visible.length > 0
            ? visible.map((item) => (
                <div
                  key={item.id}
                  className="group aspect-[4/3] rounded-xl bg-neutral-950 border border-neutral-800 hover:border-[#7C3AED]/50 transition-colors flex flex-col items-center justify-center p-2 gap-1.5 card-item-appear overflow-hidden"
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

        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE_SIZE)}
            className="mt-6 mx-auto px-6 py-2.5 rounded-full border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-300 hover:border-[#7C3AED] hover:text-white transition-colors"
          >
            Xem thêm {remaining} {tab.key === "weaponSkins" ? "skin" : "món"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
