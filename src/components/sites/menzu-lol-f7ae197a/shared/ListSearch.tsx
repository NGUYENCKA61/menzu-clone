"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Pager } from "./Pager";

export interface SearchableRow {
  /** Everything the query is matched against, already flattened to strings. */
  haystack: string[];
  node: ReactNode;
  key: string;
}

/** Same paging rhythm as the wallet and transactions ledgers. */
const PAGE_SIZE = 10;

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
  /** The noun the pager counts: "đơn hàng", "dòng". */
  unit?: string;
  /**
   * When set, the list and its pager sit inside an overview-style card with
   * this title white on the left and `frameHint` muted on the right.
   */
  frameTitle?: string;
  frameHint?: string;
}

/**
 * Client-side filter over an already-rendered list.
 *
 * The account lists are capped at 50 rows server-side, so filtering in the
 * browser avoids a round trip per keystroke. Matching is diacritic-insensitive
 * because these lists hold Vietnamese account names and nobody types the
 * accents when they are hunting for one.
 */
export function ListSearch({
  placeholder,
  rows,
  emptyLabel,
  emptyState,
  unit = "dòng",
  frameTitle,
  frameHint,
}: ListSearchProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamped rather than reset by effect: a narrowing search shrinks pageCount
  // and the view just follows.
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const body =
    filtered.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-neutral-400">
        {emptyLabel ?? "Không tìm thấy kết quả nào khớp."}
      </p>
    ) : (
      <>
        <div className="space-y-3">
          {visible.map((row) => (
            <div key={row.key}>{row.node}</div>
          ))}
        </div>
        <Pager
          page={current}
          pageCount={pageCount}
          onSelect={setPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          unit={unit}
        />
      </>
    );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // A new search starts reading from its first page.
            setPage(0);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full appearance-none rounded-2xl border-[1.5px] border-red-500/20 bg-[#111] pl-11 pr-10 py-3 text-sm text-white outline-none focus:border-red-500/60 transition-colors placeholder-neutral-600"
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
      ) : frameTitle ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {frameTitle}
            </h3>
            {frameHint ? (
              <span className="text-xs text-neutral-500">{frameHint}</span>
            ) : null}
          </div>
          {body}
        </section>
      ) : (
        <div className="space-y-4">{body}</div>
      )}
    </div>
  );
}
