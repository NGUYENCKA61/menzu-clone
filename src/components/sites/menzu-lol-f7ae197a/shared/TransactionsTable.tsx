"use client";

import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Funnel,
  History,
  ListFilter,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { GAP, pageStrip } from "@/lib/paging";

import { formatVnd } from "./productData";

export interface LedgerView {
  code: string;
  /** TOPUP · PURCHASE · REFUND · REWARD · ADJUSTMENT */
  kind: string;
  /** SUCCESS · PENDING · FAILED */
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
 * menzu's /transactions, measured off the live page — the panel, the search
 * and filter menu, the before/after balances, the status pill and eye, the
 * pager — with the shop's own columns kept from the ledger it replaced:
 * Thời gian and Mã GD each stand on their own, as the owner asked
 * (28/09/2026; its Loại glyph column was tried and dropped the same night).
 * menzu's violet (the title's mark, the current page) is the shop's accent;
 * its green and red are what money did.
 */

/** menzu shows ten to a page. */
const PAGE_SIZE = 10;

const STATUS: Record<string, { label: string; tone: string }> = {
  SUCCESS: { label: "Thành công", tone: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  PENDING: { label: "Chờ xử lý", tone: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  FAILED: { label: "Thất bại", tone: "text-red-400 border-red-500/20 bg-red-500/10" },
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

const FIELD =
  "w-full bg-white/[0.03] border border-white/10 hover:border-white/20 text-white text-sm rounded-xl pl-3.5 pr-10 py-3 outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer";
const FIELD_LABEL = "block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-wider";
const PAGE_ARROW =
  "w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-neutral-500 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 hover:bg-white/10";
const PAGE_NUMBER =
  "w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center cursor-pointer active:scale-95";

/** Diacritic-insensitive, so "giao dich" finds "giao dịch". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/** The method as its chip: the part before any " · " note ("duyệt bởi …"). */
function methodChip(row: LedgerView): string {
  const method = (row.method ?? "").split(" · ")[0]?.trim();
  return method || KIND_LABEL[row.kind] || row.kind;
}

function money(value: number): string {
  return `${formatVnd(value)} ₫`;
}

/** The figure, and for money that moved the balance on either side of it. */
function Amount({ row, phone = false }: { row: LedgerView; phone?: boolean }) {
  const sign = row.delta >= 0 ? "+" : "-";
  const tone =
    row.status === "FAILED"
      ? "text-neutral-500 line-through"
      : row.status === "PENDING"
        ? "text-neutral-300"
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

function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        aria-hidden
      />
    </div>
  );
}

function DateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD} [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:inset-0`}
      />
      <Calendar
        size={16}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        aria-hidden
      />
    </div>
  );
}

/**
 * The account's ledger, as menzu's "Lịch sử giao dịch" draws it: one #111
 * panel with its title inside, a search box and a filter menu, a four-column
 * table (cards on a phone), and a pager.
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
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const menu = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // A press anywhere outside the menu puts it away, as menzu's does.
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
  const refilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };

  const goTo = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
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
            <div className="mb-6 flex items-center gap-3 relative z-30">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-500" aria-hidden />
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => refilter(setQuery)(event.target.value)}
                  placeholder="Tìm kiếm mã GD, nội dung..."
                  aria-label="Tìm kiếm giao dịch"
                  className="w-full bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50 transition-colors"
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
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#111111] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Funnel size={18} aria-hidden />
                </button>

                {open ? (
                  <div className="absolute top-full right-0 mt-2 w-[min(380px,calc(100vw-2rem))] bg-[#111111] border border-white/10 rounded-[24px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-6 pb-4 border-b border-white/5">
                      <h4 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <ListFilter size={18} className="text-emerald-400" aria-hidden />
                        Bộ Lọc
                      </h4>
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={FIELD_LABEL}>Phân loại</span>
                          <Select label="Phân loại" value={direction} onChange={refilter(setDirection)}>
                            <option value="ALL" className="bg-[#111111] text-white">Tất cả loại</option>
                            <option value="IN" className="bg-[#111111] text-white">Tiền nạp</option>
                            <option value="OUT" className="bg-[#111111] text-white">Chi tiêu</option>
                          </Select>
                        </div>
                        <div>
                          <span className={FIELD_LABEL}>Trạng thái</span>
                          <Select label="Trạng thái" value={status} onChange={refilter(setStatus)}>
                            <option value="ALL" className="bg-[#111111] text-white">Tất cả</option>
                            <option value="SUCCESS" className="bg-[#111111] text-white">Thành công</option>
                            <option value="PENDING" className="bg-[#111111] text-white">Chờ xử lý</option>
                            <option value="FAILED" className="bg-[#111111] text-white">Thất bại</option>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={FIELD_LABEL}>Từ ngày</span>
                          <DateField label="Từ ngày" value={from} onChange={refilter(setFrom)} />
                        </div>
                        <div>
                          <span className={FIELD_LABEL}>Đến ngày</span>
                          <DateField label="Đến ngày" value={to} onChange={refilter(setTo)} />
                        </div>
                      </div>
                    </div>
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
                        onClick={() => {
                          setDirection("ALL");
                          setStatus("ALL");
                          setFrom("");
                          setTo("");
                          setPage(0);
                        }}
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

            {/* Five columns want about 800px, which the account column only
                has from xl; below that each transaction is a card, as the
                old ledger did, rather than a table scrolled sideways. */}
            <div className="hidden xl:block border border-white/5 bg-[#111111] rounded-[16px] overflow-hidden relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left text-xs min-w-[800px]">
                  {/* Fixed shares, so a long description wraps inside its own
                      column instead of squeezing the figures. */}
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[15%]" />
                    <col className="w-[31%]" />
                    <col className="w-[21%]" />
                    <col className="w-[21%]" />
                  </colgroup>
                  <thead className="bg-white/[0.02] border-b border-white/5 uppercase tracking-widest text-neutral-500">
                    <tr>
                      <th scope="col" className="pl-5 pr-4 py-4 font-bold whitespace-nowrap">Thời gian</th>
                      <th scope="col" className="px-4 py-4 font-bold whitespace-nowrap">Mã GD</th>
                      <th scope="col" className="px-4 py-4 font-bold whitespace-nowrap">Chi tiết &amp; Phương thức</th>
                      <th scope="col" className="px-4 py-4 font-bold whitespace-nowrap text-right">Biến động &amp; Số dư</th>
                      <th scope="col" className="pl-4 pr-[52px] py-4 font-bold whitespace-nowrap text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-14 text-center text-sm text-neutral-500">
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
                            <td className="pl-5 pr-4 py-4 align-middle whitespace-nowrap">
                              <span className="font-bold text-neutral-200 block mb-1 tabular-nums">{clock}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{date}</span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="font-bold text-neutral-300 font-mono break-all">#{row.code}</span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="font-bold text-neutral-200 block mb-1">{row.description}</span>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded inline-block">
                                {methodChip(row)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right align-middle">
                              <Amount row={row} />
                            </td>
                            <td className="pl-4 pr-3 py-4 align-middle">
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

            <div className="xl:hidden flex flex-col gap-3 relative z-10">
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

            {pageCount > 1 ? (
              <div className="mt-6 pt-6 border-t border-white/5 relative z-10">
                <div className="w-full flex justify-center items-center">
                  <nav
                    aria-label="Phân trang"
                    className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1.5 items-center justify-center"
                  >
                    <button
                      type="button"
                      onClick={() => goTo(current - 1)}
                      disabled={current === 0}
                      aria-label="Trang trước"
                      className={PAGE_ARROW}
                    >
                      <ChevronLeft size={16} aria-hidden />
                    </button>
                    {pageStrip(current + 1, pageCount).map((n, index) =>
                      n === GAP ? (
                        <span key={`gap-${index}`} className="w-10 text-center text-sm text-neutral-600">
                          {GAP}
                        </span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          onClick={() => goTo(n - 1)}
                          aria-current={n - 1 === current ? "page" : undefined}
                          className={`${PAGE_NUMBER} ${
                            n - 1 === current
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
                      onClick={() => goTo(current + 1)}
                      disabled={current >= pageCount - 1}
                      aria-label="Trang sau"
                      className={PAGE_ARROW}
                    >
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </nav>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
