"use client";

import {
  CreditCard,
  Gift,
  HandCoins,
  RotateCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Pager, scrollListTop } from "./Pager";
import { formatVnd } from "./productData";

export interface LedgerView {
  code: string;
  /** TOPUP · PURCHASE · REFUND · REWARD · ADJUSTMENT */
  kind: string;
  status: string;
  delta: number;
  balanceAfter: number;
  description: string;
  method: string | null;
  createdAt: string;
}

/* No status column. A row is written here only once money has actually
   moved — a top-up still waiting on the bank lives on the Nạp tiền page,
   not in this ledger — so every row would read "Thành công", and a column
   that says the same word down its whole length says nothing. */
/* The row's kind as a small glyph where a running number used to be: the
   number said nothing, the glyph says what happened before a word is read —
   the way a bank app marks a statement line. Bare, not boxed. */
const KIND: Record<string, { icon: LucideIcon; label: string }> = {
  PURCHASE: { icon: ShoppingCart, label: "Mua hàng" },
  TOPUP: { icon: CreditCard, label: "Nạp tiền" },
  REFUND: { icon: RotateCcw, label: "Hoàn tiền" },
  REWARD: { icon: Gift, label: "Thưởng" },
  ADJUSTMENT: { icon: SlidersHorizontal, label: "Điều chỉnh" },
};

/**
 * A top-up is drawn by how the money arrived, not just by its kind: a bank
 * transfer is the bank, a scratch card is the card. Both are "Nạp tiền" in
 * the ledger, and reading which one it was should not mean reading the
 * method line underneath.
 *
 * Commission moved out of the referral balance is filed as REWARD too, and
 * a gift box is the wrong picture for money the member earned by bringing
 * somebody in — it wears the same hands the overview page gives it.
 * Everything else is its kind and nothing more.
 */
function glyphFor(row: LedgerView): { icon: LucideIcon; label: string } | undefined {
  const kind = KIND[row.kind];
  if (!kind) return undefined;
  if (row.kind === "TOPUP" && normalise(row.method ?? "").includes("the cao")) {
    return { icon: Ticket, label: "Nạp thẻ cào" };
  }
  if (row.kind === "REWARD" && normalise(row.method ?? "").includes("hoa hong")) {
    return { icon: HandCoins, label: "Rút hoa hồng" };
  }
  return kind;
}

const COLUMNS = [
  "Loại",
  "Thời gian",
  "Mã GD",
  "Chi tiết & Phương thức",
  "Biến động & Số dư",
];

/** Same paging rhythm as the wallet's ledger. */
const PAGE_SIZE = 10;

/** Diacritic-insensitive, so "giao dich" finds "giao dịch". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/**
 * The ledger table with its search box.
 *
 * A client component because the filter runs in the browser — the query is
 * capped at 50 rows server-side, so a round trip per keystroke would buy
 * nothing. Dates arrive pre-formatted: formatting them here would render on
 * the server in one timezone and rehydrate in another, and React would flag
 * the mismatch.
 */
export function TransactionsTable({ rows }: { rows: LedgerView[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = normalise(query.trim());
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.code, row.description, row.method ?? ""].some((value) =>
        normalise(value).includes(needle),
      ),
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamped rather than reset by effect: a narrowing search shrinks pageCount
  // and the view just follows.
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div ref={listRef} className="scroll-mt-28 space-y-4">
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
          placeholder="Tìm kiếm mã GD, nội dung..."
          aria-label="Tìm kiếm giao dịch"
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

      {/* The overview page's card language: shell, white header, muted note
          on the right — the table itself sits inside as an inner tile. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Biến động số dư
          </h3>
          <span className="text-xs text-neutral-500">
            {filtered.length} giao dịch gần nhất
          </span>
        </div>

        {/* Under lg the table gives way to cards. A 760px table in a 430px
            screen put "Biến động & Số dư" — the one thing anybody opens this
            page to see — entirely off the right edge, with nothing to say
            that a swipe would find it. Each transaction is one card here,
            its figure on a line of its own, the way a bank app writes a
            statement. */}
        <div className="flex flex-col gap-2 lg:hidden">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-12 text-center text-sm text-neutral-400">
              Không tìm thấy giao dịch nào phù hợp
            </p>
          ) : (
            visible.map((row) => {
              const glyph = glyphFor(row);
              const Icon = glyph?.icon;
              return (
                <article
                  key={row.code}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-neutral-300">
                    {Icon ? <Icon size={15} strokeWidth={2} aria-hidden /> : null}
                    <span className="sr-only">{glyph?.label}</span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-neutral-100">
                        {row.description}
                      </span>
                      <span
                        className={
                          row.delta >= 0
                            ? "shrink-0 text-sm font-black tabular-nums text-emerald-400"
                            : "shrink-0 text-sm font-black tabular-nums text-red-400"
                        }
                      >
                        {row.delta >= 0 ? "+" : "−"}
                        {formatVnd(Math.abs(row.delta))}đ
                      </span>
                    </div>
                    {/* Time, then the code; the balance keeps the right edge
                        even when a long clock pushes it onto its own line. */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
                      <span className="tabular-nums">
                        {row.createdAt}
                        <span className="text-neutral-600">{" · "}</span>
                        <span className="font-mono text-neutral-400">{row.code}</span>
                      </span>
                      <span className="ml-auto shrink-0 tabular-nums">
                        Số dư {formatVnd(row.balanceAfter)}đ
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] lg:block">
        <table className="w-full min-w-[760px] table-fixed text-left">
          {/* Three fixed shares — who/when, what, how much — so a long
              description wraps inside its own column instead of squeezing
              the figures, and the row reads as three blocks in step. */}
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[44%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/10">
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-5 py-14 text-center text-neutral-400">
                  Không tìm thấy giao dịch nào phù hợp
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    {(() => {
                      const glyph = glyphFor(row);
                      if (!glyph) return null;
                      const Icon = glyph.icon;
                      return (
                        <span title={glyph.label} className="inline-flex text-neutral-400">
                          <Icon size={16} strokeWidth={2} aria-hidden />
                          <span className="sr-only">{glyph.label}</span>
                        </span>
                      );
                    })()}
                  </td>
                  {/* "09:07 07/09/2026" — the clock on top, the date under it. */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold tabular-nums text-neutral-200">
                        {row.createdAt.split(" ")[0]}
                      </span>
                      <span className="text-[11px] tabular-nums text-neutral-500">
                        {row.createdAt.split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-white">{row.code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-neutral-200">
                        {row.description}
                      </span>
                      <span className="text-[11px] text-neutral-500">{row.method ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span
                        className={
                          row.delta >= 0
                            ? "text-sm font-black tabular-nums text-emerald-400"
                            : "text-sm font-black tabular-nums text-red-400"
                        }
                      >
                        {row.delta >= 0 ? "+" : "−"}
                        {formatVnd(Math.abs(row.delta))}đ
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Số dư: {formatVnd(row.balanceAfter)}đ
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <Pager
          page={current}
          pageCount={pageCount}
          onSelect={(next) => {
            setPage(next);
            scrollListTop(listRef.current);
          }}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          unit="giao dịch"
        />
      </section>
    </div>
  );
}
