"use client";

import { Check, ChevronDown, Crown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** The VIP levels an account can carry, as the shop numbers them. */
export const VIP_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface VipRangeSelectProps {
  /** Lowest VIP wanted, or null for no floor. */
  min: number | null;
  /** Highest VIP wanted, or null for no ceiling. */
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

/**
 * The account panel's VIP filter, menzu's rank picker in this shop's dress
 * (the owner, 24/10/2026: "thêm lọc vip giống menzu", "mà đánh số 1 2 3 4 5
 * 6 7"): one button reading the range, and under it a list with two tabs,
 * "Từ VIP" and "Đến VIP", so a buyer can ask for VIP 3 to 5 or VIP 4 and up.
 * A floor above the ceiling (or the other way) drops the other end rather
 * than leaving a range nothing can match.
 */
export function VipRangeSelect({ min, max, onChange }: VipRangeSelectProps) {
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

  const label =
    min === null && max === null
      ? "Bất kỳ"
      : min !== null && max !== null
        ? min === max
          ? `${min}`
          : `${min} - ${max}`
        : min !== null
          ? `từ ${min}`
          : `đến ${max}`;

  const picked = tab === "from" ? min : max;

  function choose(level: number | null) {
    if (tab === "from") onChange(level, level !== null && max !== null && level > max ? null : max);
    else onChange(level !== null && min !== null && level < min ? null : min, level);
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
        <Crown size={14} aria-hidden className="shrink-0 text-neutral-400" />
        <span className="truncate">VIP: {label}</span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`ml-auto shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="drop-in absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] rounded-xl border border-neutral-700/50 bg-[#141416] p-2 shadow-[0_18px_40px_#0009]">
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
                {key === "from" ? "Từ VIP" : "Đến VIP"}
              </button>
            ))}
          </div>
          <div role="listbox" aria-label={tab === "from" ? "Từ VIP" : "Đến VIP"} className="flex flex-col gap-1">
            <button
              type="button"
              role="option"
              aria-selected={picked === null}
              onClick={() => choose(null)}
              className={item(picked === null)}
            >
              Tất cả VIP
              {picked === null ? <Check size={14} aria-hidden /> : null}
            </button>
            {VIP_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={picked === level}
                onClick={() => choose(level)}
                className={item(picked === level)}
              >
                VIP {level}
                {picked === level ? <Check size={14} aria-hidden /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
