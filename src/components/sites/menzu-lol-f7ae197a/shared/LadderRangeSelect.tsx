"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface LadderGroup {
  /** A small caption over the group ("Cấp úy"), or none. */
  label?: string;
  items: { place: number; label: string }[];
}

export interface LadderRangeSelectProps {
  /** What is being ranged: "VIP", "Rank". */
  name: string;
  icon: ReactNode;
  /** The first line of the list, picking no bound ("Tất cả VIP"). */
  allLabel: string;
  groups: LadderGroup[];
  /** Lowest place wanted, or null for no floor. */
  min: number | null;
  /** Highest place wanted, or null for no ceiling. */
  max: number | null;
  /** How a place reads on the button ("3", "Đại úy"). */
  short: (place: number) => string;
  onChange: (min: number | null, max: number | null) => void;
}

/**
 * The account panel's range pickers, menzu's rank picker in this shop's
 * dress (the owner, 24/10/2026: "thêm lọc vip giống menzu", then "thêm lọc
 * rank nữa"): one button reading the range ("VIP: 2 - 5"), and under it a
 * list with two tabs, "Từ" and "Đến", so a buyer can ask for a span or just
 * a floor or a ceiling. A floor above the ceiling (or the other way) drops
 * the other end rather than leaving a range nothing can match.
 */
export function LadderRangeSelect({
  name,
  icon,
  allLabel,
  groups,
  min,
  max,
  short,
  onChange,
}: LadderRangeSelectProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"from" | "to">("from");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const reading =
    min === null && max === null
      ? "Bất kỳ"
      : min !== null && max !== null
        ? min === max
          ? short(min)
          : `${short(min)} - ${short(max)}`
        : min !== null
          ? `từ ${short(min)}`
          : `đến ${short(max as number)}`;

  const picked = tab === "from" ? min : max;

  function choose(place: number | null) {
    if (tab === "from") onChange(place, place !== null && max !== null && place > max ? null : max);
    else onChange(place !== null && min !== null && place < min ? null : min, place);
  }

  const item = (selected: boolean) =>
    `flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] font-semibold transition-colors ${
      selected
        ? "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/15 text-white"
        : "border-transparent text-neutral-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 min-w-[170px] items-center gap-2 rounded-xl border border-neutral-700/40 bg-neutral-800/40 px-3 text-[11px] font-bold text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white aria-expanded:border-[var(--menzu-accent)]/50 aria-expanded:text-white"
      >
        <span aria-hidden className="shrink-0 text-neutral-400">
          {icon}
        </span>
        <span className="truncate">
          {name}: {reading}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`ml-auto shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="drop-in absolute left-0 top-[calc(100%+6px)] z-50 w-[230px] rounded-xl border border-neutral-700/50 bg-[#141416] p-2 shadow-[0_18px_40px_#0009]">
          <div className="mb-2 flex gap-4 border-b border-white/10 px-1">
            {(["from", "to"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  tab === key
                    ? "border-[var(--menzu-accent)] text-[var(--menzu-accent)]"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {key === "from" ? `Từ ${name}` : `Đến ${name}`}
              </button>
            ))}
          </div>
          <div
            role="listbox"
            aria-label={tab === "from" ? `Từ ${name}` : `Đến ${name}`}
            className="flex max-h-[320px] flex-col gap-1 overflow-y-auto"
          >
            <button
              type="button"
              role="option"
              aria-selected={picked === null}
              onClick={() => choose(null)}
              className={item(picked === null)}
            >
              {allLabel}
              {picked === null ? <Check size={14} aria-hidden /> : null}
            </button>
            {groups.map((group, index) => (
              <div key={group.label ?? index} className="flex flex-col gap-1">
                {group.label ? (
                  <span className="mt-1 px-3 text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    {group.label}
                  </span>
                ) : null}
                {group.items.map((entry) => (
                  <button
                    key={entry.place}
                    type="button"
                    role="option"
                    aria-selected={picked === entry.place}
                    onClick={() => choose(entry.place)}
                    className={item(picked === entry.place)}
                  >
                    {entry.label}
                    {picked === entry.place ? <Check size={14} aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
