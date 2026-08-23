"use client";

import { useState, type ReactNode } from "react";

export interface ProductTab {
  label: string;
  /** Small tabular badge after the label. */
  count?: number;
  /** Amber-dot warning on the tab — work is waiting inside. */
  alert?: boolean;
}

const TAB_ON =
  "relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--brand)] text-white transition-colors inline-flex items-center gap-2";
const TAB_OFF =
  "relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-2";

/**
 * The product desk's four rooms behind one row of tabs.
 *
 * Panels are server-rendered and arrive as children; hiding is display-only,
 * so a half-filled form in one room survives a visit to another. The page
 * used to stack all four full-height — finding the software section meant
 * scrolling past every account card.
 */
export function AdminProductTabs({
  tabs,
  children,
}: {
  tabs: ProductTab[];
  children: ReactNode[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={active === index}
            className={active === index ? TAB_ON : TAB_OFF}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active === index ? "bg-white/20" : "bg-white/[0.06] text-neutral-500"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
            {tab.alert ? (
              <span
                aria-hidden
                title="Có việc đang chờ"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#09090b]"
              />
            ) : null}
          </button>
        ))}
      </div>

      {children.map((panel, index) => (
        <div key={tabs[index]?.label ?? index} className={active === index ? "" : "hidden"}>
          {panel}
        </div>
      ))}
    </div>
  );
}
