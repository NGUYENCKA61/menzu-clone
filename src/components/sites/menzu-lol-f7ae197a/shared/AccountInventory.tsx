"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { AccountDetail } from "./AccountBuyPanel";

export interface AccountInventoryProps {
  account: AccountDetail;
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
}

const INVENTORY_TABS: InventoryTab[] = [
  { key: "weaponSkins", label: "Weapon Skins" },
  { key: "buddies", label: "Buddies" },
  { key: "agents", label: "Agents" },
  { key: "cards", label: "Cards" },
  { key: "sprays", label: "Sprays" },
];

const MAX_PLACEHOLDER_TILES = 20;

// Tailwind can't see dynamically-composed class names, so the tab's active
// and inactive states are always emitted as complete literal strings.
const TAB_BUTTON_ACTIVE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-2xl font-black uppercase transition-colors bg-[#7C3AED] text-white";
const TAB_BUTTON_INACTIVE =
  "flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base px-4 sm:px-6 py-2.5 rounded-2xl font-black uppercase transition-colors text-neutral-400 hover:text-white";

/**
 * Skin/buddy/agent/card/spray inventory tabs on the account-detail page.
 * Per-item art isn't present in the page markup the live site ships (it must
 * come from an API later), so each tab renders a placeholder grid sized to
 * that tab's item count instead of inventing image paths.
 */
export function AccountInventory({ account }: AccountInventoryProps) {
  const [activeTab, setActiveTab] = useState<InventoryTabKey>("weaponSkins");

  const activeCount = account[activeTab];
  const tileCount = Math.min(activeCount, MAX_PLACEHOLDER_TILES);

  return (
    <div className="w-full mt-12 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6">
      <style dangerouslySetInnerHTML={{ __html: ACCOUNT_INVENTORY_STYLES }} />

      <div className="flex items-center gap-3 sm:gap-6 lg:gap-0 lg:justify-between overflow-x-auto hide-scrollbar whitespace-nowrap">
        {INVENTORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={tab.key === activeTab ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}
          >
            {tab.label}
            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-black/20 text-[11px] sm:text-xs font-black">
              {account[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div key={activeTab} className="flex flex-col min-h-[400px] skin-tab-enter">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {Array.from({ length: tileCount }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/3] rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center card-item-appear"
            >
              <ImageOff size={18} className="text-neutral-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
