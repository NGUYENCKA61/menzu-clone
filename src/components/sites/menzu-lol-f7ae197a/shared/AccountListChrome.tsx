"use client";

import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Funnel,
  ListFilter,
  Search,
  Trash2,
} from "lucide-react";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { GAP, pageStrip } from "@/lib/paging";

/*
 * The furniture menzu's account lists share, measured off /transactions and
 * /orders: the search box, the funnel and its "Bộ Lọc" menu, and the pager.
 * The one thing that differs from list to list is the colour the box and the
 * funnel light up in — green on the ledger, menzu's indigo on the orders,
 * which is the shop's accent here.
 */

export type ListTone = "green" | "accent";

const TONE = {
  green: {
    focus: "focus:border-emerald-500/50",
    open: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    mark: "text-emerald-400",
  },
  accent: {
    focus: "focus:border-[var(--menzu-accent)]/50",
    open: "bg-[var(--menzu-accent)]/10 border-[var(--menzu-accent)]/30 text-[var(--menzu-accent)]",
    mark: "text-[var(--menzu-accent)]",
  },
} as const;

const FIELD =
  "w-full bg-white/[0.03] border border-white/10 hover:border-white/20 text-white text-sm rounded-xl pl-3.5 pr-10 py-3 outline-none transition-colors appearance-none cursor-pointer";
const FIELD_LABEL = "block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-wider";
const OPTION = "bg-[#111111] text-white";
const PAGE_ARROW =
  "w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-neutral-500 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 hover:bg-white/10";
const PAGE_NUMBER =
  "w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center cursor-pointer active:scale-95";

/** Diacritic-insensitive, so "giao dich" finds "giao dịch". */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/**
 * The search box and the funnel beside it. The menu is the caller's fields
 * inside menzu's "Bộ Lọc" card, with "Đóng" and "Xóa lọc" under them; a press
 * outside it or Escape puts it away.
 */
export function ListToolbar({
  tone,
  query,
  onQuery,
  placeholder,
  filtering,
  onClear,
  children,
}: {
  tone: ListTone;
  query: string;
  onQuery: (next: string) => void;
  placeholder: string;
  /** Whether any filter is set, so the funnel stays lit while the menu is shut. */
  filtering: boolean;
  onClear: () => void;
  /** The menu's fields, laid out by the caller (menzu uses two-column rows). */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const look = TONE[tone];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mb-6 flex items-center gap-3 relative z-30">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-neutral-500" aria-hidden />
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`w-full appearance-none bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none ${look.focus} transition-colors`}
        />
      </div>

      <div ref={menu} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((now) => !now)}
          aria-expanded={open}
          aria-label="Bộ lọc"
          className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors ${
            open || filtering
              ? look.open
              : "bg-[#111111] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Funnel size={18} aria-hidden />
        </button>

        {open ? (
          <div className="absolute top-full right-0 mt-2 w-[min(380px,calc(100vw-2rem))] bg-[#111111] border border-white/10 rounded-[24px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 pb-4 border-b border-white/5">
              <h4 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                <ListFilter size={18} className={look.mark} aria-hidden />
                Bộ Lọc
              </h4>
            </div>
            <div className="p-6 flex flex-col gap-5">{children}</div>
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-neutral-300 font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={onClear}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Trash2 size={16} aria-hidden />
                Xóa lọc
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** One labelled select in the filter menu. */
export function FilterSelect({
  tone,
  label,
  value,
  onChange,
  options,
}: {
  tone: ListTone;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: [value: string, label: string][];
}) {
  return (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      <div className="relative">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD} ${TONE[tone].focus}`}
        >
          {options.map(([key, text]) => (
            <option key={key} value={key} className={OPTION}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          aria-hidden
        />
      </div>
    </div>
  );
}

/** One labelled date in the filter menu; the whole box opens the picker. */
export function FilterDate({
  tone,
  label,
  value,
  onChange,
}: {
  tone: ListTone;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      <div className="relative">
        <input
          type="date"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD} ${TONE[tone].focus} [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:inset-0`}
        />
        <Calendar
          size={16}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          aria-hidden
        />
      </div>
    </div>
  );
}

/** menzu's pager: arrows, the page strip, the current page in the accent. */
export function ListPager({
  page,
  pageCount,
  onSelect,
}: {
  /** Zero-based. */
  page: number;
  pageCount: number;
  onSelect: (next: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-6 pt-6 border-t border-white/5 relative z-10">
      <div className="w-full flex justify-center items-center">
        <nav
          aria-label="Phân trang"
          className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1.5 items-center justify-center"
        >
          <button
            type="button"
            onClick={() => onSelect(page - 1)}
            disabled={page === 0}
            aria-label="Trang trước"
            className={PAGE_ARROW}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          {pageStrip(page + 1, pageCount).map((n, index) =>
            n === GAP ? (
              <span key={`gap-${index}`} className="w-10 text-center text-sm text-neutral-600">
                {GAP}
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onSelect(n - 1)}
                aria-current={n - 1 === page ? "page" : undefined}
                className={`${PAGE_NUMBER} ${
                  n - 1 === page
                    ? "bg-[var(--menzu-accent)] text-white border border-[var(--menzu-accent)]"
                    : "bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onSelect(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Trang sau"
            className={PAGE_ARROW}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      </div>
    </div>
  );
}

/** Scroll the list's panel back to its top after a page change. */
export function scrollPanelTop(node: HTMLElement | null) {
  node?.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}
