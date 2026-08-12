"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { formatVnd } from "./productData";

export interface LedgerView {
  code: string;
  status: string;
  delta: number;
  balanceAfter: number;
  description: string;
  method: string | null;
  createdAt: string;
}

const COLUMNS = [
  "Mã GD & Thời gian",
  "Chi tiết & Phương thức",
  "Biến động & Số dư",
  "Trạng thái",
];

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Thành công",
  PENDING: "Đang xử lý",
  FAILED: "Thất bại",
};

const STATUS_CLASS: Record<string, string> = {
  SUCCESS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/30",
};

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

  const filtered = useMemo(() => {
    const needle = normalise(query.trim());
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.code, row.description, row.method ?? ""].some((value) =>
        normalise(value).includes(needle),
      ),
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm kiếm mã GD, nội dung..."
          aria-label="Tìm kiếm giao dịch"
          className="w-full appearance-none rounded-2xl border border-white/5 bg-[#111111] pl-11 pr-10 py-3 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600"
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

      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[720px] text-left">
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
              filtered.map((row) => (
                <tr key={row.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">{row.code}</span>
                      <span className="text-[11px] text-neutral-500">{row.createdAt}</span>
                    </div>
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
                            ? "text-xs font-black text-emerald-400"
                            : "text-xs font-black text-red-400"
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
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                        STATUS_CLASS[row.status] ?? "text-neutral-400 bg-white/5 border-white/10"
                      }`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
