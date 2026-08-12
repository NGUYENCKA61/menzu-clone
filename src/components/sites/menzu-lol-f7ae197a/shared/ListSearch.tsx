"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export interface SearchableRow {
  /** Everything the query is matched against, already flattened to strings. */
  haystack: string[];
  node: ReactNode;
  key: string;
}

export interface ListSearchProps {
  placeholder: string;
  rows: SearchableRow[];
  /** Shown when the query matches nothing. */
  emptyLabel?: string;
  /**
   * Shown when there is nothing to search in the first place.
   *
   * Kept separate from `emptyLabel` because "you have no orders yet" and "no
   * order matches that" call for different words and a different next step —
   * and the live pages keep the search box visible in both cases.
   */
  emptyState?: ReactNode;
}

/**
 * Client-side filter over an already-rendered list.
 *
 * The account lists are capped at 50 rows server-side, so filtering in the
 * browser avoids a round trip per keystroke. Matching is diacritic-insensitive
 * because these lists hold Vietnamese account names and nobody types the
 * accents when they are hunting for one.
 */
export function ListSearch({ placeholder, rows, emptyLabel, emptyState }: ListSearchProps) {
  const [query, setQuery] = useState("");

  const normalise = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      // Strip combining marks so "đơn" matches a typed "don".
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d");

  const filtered = useMemo(() => {
    const needle = normalise(query.trim());
    if (!needle) return rows;
    return rows.filter((row) => row.haystack.some((value) => normalise(value).includes(needle)));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full appearance-none rounded-2xl border border-white/5 bg-[#111111] pl-11 pr-10 py-3 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Xoá tìm kiếm"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {rows.length === 0 && emptyState ? (
        emptyState
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-neutral-400">
          {emptyLabel ?? "Không tìm thấy kết quả nào khớp."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.key}>{row.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}
