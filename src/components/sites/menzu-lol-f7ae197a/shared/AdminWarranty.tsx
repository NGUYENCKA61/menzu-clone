"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, Search, Wrench } from "lucide-react";

import { ListPager } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountListChrome";
import { DESK_POLL_MS } from "@/lib/warrantyChat";
import {
  WARRANTY_ISSUE,
  WARRANTY_STATUS,
  type WarrantyIssue,
  type WarrantyStatus,
} from "@/lib/warrantyRequests";

/** One ticket as the queue lists it; everything else is on its own page. */
export interface WarrantyListRow {
  id: string;
  status: WarrantyStatus;
  issue: WarrantyIssue;
  productName: string;
  packageLabel: string | null;
  username: string;
  orderCode: string;
  /** Open, and the buyer had the last word: the shop owes a reply. */
  awaitingShop: boolean;
  /** A bank refund whose account has arrived: the transfer is the shop's. */
  transferDue: boolean;
  /** A bank refund still waiting on the buyer's account. */
  bankAwaited: boolean;
  /** "07:10 01/10/2026" — the last word on the ticket, or its report. */
  lastAt: string;
  lastTs: number;
  /** Who had that last word; null while nothing follows the report. */
  lastFromShop: boolean | null;
  preview: string;
}

type Filter = "ALL" | "TODO" | WarrantyStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "TODO", label: "Cần xử lý" },
  { key: "OPEN", label: "Mới gửi" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "REFUNDING", label: "Đang hoàn tiền" },
  { key: "RESOLVED", label: "Đã xử lý" },
  { key: "REFUNDED", label: "Đã hoàn tiền" },
];

/** Open first, then the bank refunds waiting on somebody, then the closed. */
const RANK: Record<WarrantyStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  REFUNDING: 2,
  RESOLVED: 3,
  REFUNDED: 4,
};

const PER_PAGE = 20;

/** Something on this ticket is the shop's move now. */
function needsShop(row: WarrantyListRow): boolean {
  return row.awaitingShop || row.status === "OPEN" || row.transferDue;
}

/**
 * The warranty queue (the owner, 01/10/2026: "sửa lại … sao cho đỡ rối dễ
 * thao tác với khách hàng"): one line per ticket — its state, what was
 * bought, who and which order, and the last word said — and the ticket's own
 * page for everything else (/admin/warranty/[id]). What needs the shop sits
 * on top and has its own filter; a search finds an order, a buyer or a tool.
 */
export function AdminWarranty({ rows, loadedAt }: { rows: WarrantyListRow[]; loadedAt: string }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  const count = (key: Filter) =>
    key === "ALL"
      ? rows.length
      : key === "TODO"
        ? rows.filter(needsShop).length
        : rows.filter((r) => r.status === key).length;

  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) => (filter === "ALL" ? true : filter === "TODO" ? needsShop(r) : r.status === filter))
    .filter(
      (r) =>
        q === "" ||
        r.orderCode.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q),
    )
    .sort(
      (a, b) =>
        Number(needsShop(b)) - Number(needsShop(a)) ||
        RANK[a.status] - RANK[b.status] ||
        b.lastTs - a.lastTs,
    );

  // A new filter or search starts at the first page, without an effect.
  const listKey = `${filter}:${q}`;
  const [paging, setPaging] = useState({ key: listKey, page: 0 });
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = paging.key === listKey ? Math.min(paging.page, pageCount - 1) : 0;
  const pageRows = shown.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="flex flex-col gap-4">
      {/* Keyed by the read time: a reload starts the count again from zero. */}
      <DeskPulse key={loadedAt} since={loadedAt} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  on
                    ? "border-[var(--brand)]/50 bg-[var(--brand)]/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    f.key === "TODO" && count("TODO") > 0 ? "bg-[var(--brand)] text-white" : "bg-white/10 text-neutral-300"
                  }`}
                >
                  {count(f.key)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative block w-full lg:w-72">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, khách, tool…"
            aria-label="Tìm yêu cầu bảo hành"
            className="h-10 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-[var(--brand)]/60"
          />
        </label>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <Wrench className="mx-auto h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-3 text-sm font-bold text-white">
            {rows.length === 0 ? "Chưa có yêu cầu bảo hành nào" : "Không có yêu cầu nào khớp"}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            {rows.length === 0
              ? "Khách báo lỗi từ nút “Yêu cầu bảo hành” trong hóa đơn đơn hàng."
              : "Đổi bộ lọc hoặc từ khóa tìm."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e0e11]">
          {pageRows.map((row) => (
            <TicketRow key={row.id} row={row} />
          ))}
        </div>
      )}

      <ListPager page={page} pageCount={pageCount} onSelect={(next) => setPaging({ key: listKey, page: next })} />
    </div>
  );
}

/** One line of the queue; the whole line opens the ticket. */
function TicketRow({ row }: { row: WarrantyListRow }) {
  const state = WARRANTY_STATUS[row.status];
  return (
    <Link
      href={`/admin/warranty/${row.id}`}
      className="group flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.025] sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
          {row.awaitingShop ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--brand)]/50 bg-[var(--brand)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              <MessageCircle className="h-3 w-3 text-[var(--brand)]" aria-hidden />
              Khách nhắn mới
            </span>
          ) : null}
          {row.transferDue ? (
            <span className="inline-flex shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
              Chờ chuyển khoản
            </span>
          ) : row.bankAwaited ? (
            <span className="inline-flex shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Chờ khách nhập STK
            </span>
          ) : null}
          <span className="min-w-0 truncate text-[13px] font-bold text-white">{row.productName}</span>
          {row.packageLabel ? (
            <span className="shrink-0 rounded-md border border-white/15 bg-white/10 px-1.5 py-px text-[9px] font-black uppercase tracking-widest text-neutral-300">
              {row.packageLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[12px] text-neutral-500">
          <span className="font-semibold text-neutral-300">{row.username}</span> · {row.orderCode} ·{" "}
          {WARRANTY_ISSUE[row.issue].label}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-neutral-400">
          {row.lastFromShop === true ? <span className="text-neutral-500">Shop: </span> : null}
          {row.lastFromShop === false ? <span className="text-neutral-500">Khách: </span> : null}
          {row.preview}
        </p>
      </div>
      <span className="hidden shrink-0 text-[11px] tabular-nums text-neutral-500 sm:block">{row.lastAt}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
        aria-hidden
      />
    </Link>
  );
}

/**
 * "Có cập nhật mới": asks every few seconds whether reports, messages or
 * bank accounts have come in since the page was read, and offers a reload
 * rather than doing one.
 */
function DeskPulse({ since }: { since: string }) {
  const router = useRouter();
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/admin/warranty-requests/pulse?since=${encodeURIComponent(since)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { fresh?: number };
        setFresh(data.fresh ?? 0);
      } catch {
        // The next tick tries again.
      }
    }, DESK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [since]);

  if (fresh === 0) return null;
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="sticky top-3 z-10 inline-flex items-center gap-2 self-center rounded-full border border-[var(--brand)]/50 bg-[#1a0d10]/95 px-4 py-2 text-[12px] font-bold text-white shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-[#2a1116]"
    >
      <MessageCircle className="h-4 w-4 text-[var(--brand)]" aria-hidden />
      Có {fresh} cập nhật mới từ khách, bấm để tải lại
    </button>
  );
}
