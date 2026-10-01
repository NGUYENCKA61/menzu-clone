"use client";

import { Eye, History } from "lucide-react";
import Link from "next/link";

import { useMemo, useRef, useState } from "react";

import {
  FilterDate,
  FilterSelect,
  ListPager,
  ListToolbar,
  normalise,
  scrollPanelTop,
} from "./AccountListChrome";
import { formatVnd } from "./productData";

export interface LedgerView {
  code: string;
  /** TOPUP · PURCHASE · REFUND · REWARD · ADJUSTMENT */
  kind: string;
  /** SUCCESS · PENDING · FAILED, and on a top-up request that never reached
   *  the wallet also EXPIRED · CANCELLED. */
  status: string;
  delta: number;
  balanceAfter: number;
  description: string;
  method: string | null;
  /** "22:55 - 28/09/2026", written on the server in the shop's clock. */
  createdAt: string;
  /** "2026-09-28", the shop-clock day the date filters compare. */
  day: string;
  /** Where the eye leads: the top-up's invoice, or the purchase history. */
  href: string | null;
}

/*
 * menzu's /transactions, measured off the live page: the panel, the search
 * and filter menu, four columns, the before/after balances, the status pill
 * and eye, the pager. One change: the time has the first column to itself —
 * a buyer hunts a line by when, not by its code — and the code sits small
 * beside the method chip (29/09/2026, after five columns proved too wide).
 * menzu's violet (the title's mark, the current page) is the shop's accent;
 * its green and red are what money did.
 */

/** menzu shows ten to a page. */
const PAGE_SIZE = 10;

const STATUS: Record<string, { label: string; tone: string }> = {
  SUCCESS: { label: "Thành công", tone: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  PENDING: { label: "Chờ xử lý", tone: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  FAILED: { label: "Thất bại", tone: "text-red-400 border-red-500/20 bg-red-500/10" },
  // Top-up requests that never reached the wallet (they have no ledger line
  // of their own; the page lists them beside it). Same words and colours as
  // /wallet used for them: overdue still warns in red, since a late transfer
  // is still honoured; a dropped request is only grey.
  EXPIRED: { label: "Quá hạn", tone: "text-red-400 border-red-500/20 bg-red-500/10" },
  CANCELLED: { label: "Đã hủy", tone: "text-neutral-500 border-white/10 bg-white/5" },
};

/** A row's kind in words, for a row that carries no method of its own. */
const KIND_LABEL: Record<string, string> = {
  TOPUP: "Nạp tiền",
  PURCHASE: "Mua hàng",
  REFUND: "Hoàn tiền",
  REWARD: "Thưởng",
  ADJUSTMENT: "Điều chỉnh",
};

/** "22:55 - 28/09/2026" as its clock and its date. */
function splitStamp(stamp: string): [string, string] {
  const [clock = stamp, date = ""] = stamp.split(" - ");
  return [clock, date];
}

/** The method as its chip: the part before any " · " note ("duyệt bởi …"). */
function methodChip(row: LedgerView): string {
  const method = (row.method ?? "").split(" · ")[0]?.trim();
  return method || KIND_LABEL[row.kind] || row.kind;
}

/** "280.000đ", the way every price on the site is written. */
function money(value: number): string {
  return `${formatVnd(value)}đ`;
}

/** The figure, and for money that moved the balance on either side of it. */
function Amount({ row, phone = false }: { row: LedgerView; phone?: boolean }) {
  const sign = row.delta >= 0 ? "+" : "-";
  const tone =
    row.status === "FAILED"
      ? "text-neutral-500 line-through"
      : row.status === "PENDING"
        ? "text-neutral-300"
        : row.status === "EXPIRED" || row.status === "CANCELLED"
          ? "text-neutral-500"
          : row.delta >= 0
          ? "text-emerald-400"
          : "text-red-400";
  return (
    <>
      <span className={`font-black text-sm block mb-1 ${tone}`}>
        {sign}
        {money(Math.abs(row.delta))}
      </span>
      {row.status === "SUCCESS" ? (
        <div
          className={`text-[10px] text-neutral-500 font-medium ${phone ? "" : "mt-1 "}flex flex-col items-end gap-0.5`}
        >
          <span>Trước: {money(row.balanceAfter - row.delta)}</span>
          <span>Sau: {money(row.balanceAfter)}</span>
        </div>
      ) : null}
    </>
  );
}

function StatusPill({ status, phone = false }: { status: string; phone?: boolean }) {
  const look = STATUS[status] ?? STATUS.SUCCESS!;
  return (
    <span
      className={`whitespace-nowrap ${look.tone} text-[9px] font-bold uppercase tracking-widest border ${phone ? "px-2 py-0.5" : "px-2.5 py-1"} rounded`}
    >
      {look.label}
    </span>
  );
}

/**
 * The account's ledger, as menzu's "Lịch sử giao dịch" draws it: one #111
 * panel with its title inside, a search box and a filter menu, the
 * four-column table (cards on a phone), and a pager.
 *
 * A client component because the filters run in the browser — the query is
 * capped at 50 rows server-side, so a round trip per keystroke would buy
 * nothing. Dates arrive pre-formatted: formatting them here would render on
 * the server in one timezone and rehydrate in another.
 */
export function TransactionsTable({ rows }: { rows: LedgerView[] }) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = normalise(query.trim());
    return rows.filter(
      (row) =>
        (!needle ||
          [row.code, row.description, row.method ?? ""].some((value) =>
            normalise(value).includes(needle),
          )) &&
        (direction === "ALL" || (direction === "IN" ? row.delta >= 0 : row.delta < 0)) &&
        (status === "ALL" || row.status === status) &&
        (!from || row.day >= from) &&
        (!to || row.day <= to),
    );
  }, [rows, query, direction, status, from, to]);

  const filtering = direction !== "ALL" || status !== "ALL" || Boolean(from) || Boolean(to);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamped rather than reset by effect: a narrowing filter shrinks pageCount
  // and the view just follows.
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Every filter change starts reading from the first page.
  const refilter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(0);
  };

  const eye = (row: LedgerView, phone: boolean) =>
    row.href ? (
      <Link
        href={row.href}
        aria-label={`Xem ${row.kind === "TOPUP" ? "hóa đơn" : "đơn hàng"} của giao dịch ${row.code}`}
        className={
          phone
            ? "text-neutral-400 hover:text-white transition-colors"
            : "p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        }
      >
        <Eye size={16} aria-hidden />
      </Link>
    ) : null;

  return (
    <div
      ref={top}
      className="scroll-mt-28 w-full bg-[#111111] border border-white/5 rounded-2xl sm:rounded-[24px] p-4 sm:p-8 lg:p-10 relative min-h-[750px]"
    >
      <div>
        <div className="mb-8 relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <History size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
            Lịch sử giao dịch
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Tra cứu dòng tiền chi tiêu và nạp vào tài khoản.
          </p>
        </div>

        {rows.length === 0 ? (
          // An account with no rows at all is not a search that missed: it
          // gets its own words and the way in, not a filter that found nothing.
          <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl relative z-10">
            <p className="text-neutral-400 text-sm">Chưa có giao dịch nào.</p>
            <p className="mt-1 text-neutral-500 text-xs">
              Mọi lần nạp tiền và mua hàng sẽ hiện ở đây, kèm số dư trước và sau mỗi lần.
            </p>
            <Link
              href="/wallet"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-neutral-200"
            >
              Nạp tiền
            </Link>
          </div>
        ) : (
          <>
            <ListToolbar
              tone="green"
              query={query}
              onQuery={refilter(setQuery)}
              placeholder="Tìm kiếm mã GD, nội dung..."
              filtering={filtering}
              onClear={() => {
                setDirection("ALL");
                setStatus("ALL");
                setFrom("");
                setTo("");
                setPage(0);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <FilterSelect
                  tone="green"
                  label="Phân loại"
                  value={direction}
                  onChange={refilter(setDirection)}
                  options={[
                    ["ALL", "Tất cả loại"],
                    ["IN", "Tiền nạp"],
                    ["OUT", "Chi tiêu"],
                  ]}
                />
                <FilterSelect
                  tone="green"
                  label="Trạng thái"
                  value={status}
                  onChange={refilter(setStatus)}
                  options={[
                    ["ALL", "Tất cả"],
                    ["SUCCESS", "Thành công"],
                    ["PENDING", "Chờ xử lý"],
                    ["FAILED", "Thất bại"],
                    ["EXPIRED", "Quá hạn"],
                    ["CANCELLED", "Đã hủy"],
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FilterDate tone="green" label="Từ ngày" value={from} onChange={refilter(setFrom)} />
                <FilterDate tone="green" label="Đến ngày" value={to} onChange={refilter(setTo)} />
              </div>
            </ListToolbar>

            <div className="hidden md:block border border-white/5 bg-[#111111] rounded-[16px] overflow-hidden relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-white/[0.02] border-b border-white/5 uppercase tracking-widest text-neutral-500">
                    <tr>
                      <th scope="col" className="px-5 py-4 font-bold">Thời gian</th>
                      <th scope="col" className="px-5 py-4 font-bold">Chi tiết &amp; Phương thức</th>
                      <th scope="col" className="px-5 py-4 font-bold text-right">Biến động &amp; Số dư</th>
                      <th scope="col" className="pl-5 pr-[60px] py-4 font-bold text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-14 text-center text-sm text-neutral-500">
                          Không tìm thấy giao dịch nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      visible.map((row) => {
                        const [clock, date] = splitStamp(row.createdAt);
                        return (
                          <tr
                            key={row.code}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                          >
                            {/* The clock on top, the date under it. */}
                            <td className="px-5 py-4 align-middle whitespace-nowrap">
                              <span className="font-bold text-neutral-200 block mb-1 tabular-nums">{clock}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{date}</span>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <span className="font-bold text-neutral-200 block mb-1">{row.description}</span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                  {methodChip(row)}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">#{row.code}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right align-middle">
                              <Amount row={row} />
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-[100px] flex justify-center">
                                  <StatusPill status={row.status} />
                                </div>
                                <div className="w-8 flex justify-center">{eye(row, false)}</div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden flex flex-col gap-3 relative z-10">
              {visible.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-neutral-500 text-sm">Không tìm thấy giao dịch nào phù hợp.</p>
                </div>
              ) : (
                visible.map((row) => (
                  <div
                    key={row.code}
                    className="border border-white/5 bg-[#111111] rounded-[16px] p-4 flex flex-col gap-3 relative overflow-hidden transition-all hover:border-emerald-500/30"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-neutral-200 block text-sm mb-1 break-words">
                          {row.description}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 text-xs font-bold">#{row.code}</span>
                          <span className="text-[9px] text-neutral-500 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                            {methodChip(row)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Amount row={row} phone />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-neutral-500 font-mono">{row.createdAt}</span>
                      <div className="flex items-center gap-3">
                        <StatusPill status={row.status} phone />
                        {eye(row, true)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <ListPager
              page={current}
              pageCount={pageCount}
              onSelect={(next) => {
                setPage(next);
                scrollPanelTop(top.current);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
