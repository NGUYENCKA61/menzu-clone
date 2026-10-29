"use client";

import { WarrantyIssueGlyph } from "./warrantyIssueIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, Search, Wrench } from "lucide-react";

import { INPUT } from "../admin/kit";
import { Pager } from "./Pager";
import { DESK_POLL_MS, needsShop } from "@/lib/warrantyChat";
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
  { key: "OPEN", label: "Chờ xử lý" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "REFUNDING", label: "Đang hoàn tiền" },
  { key: "RESOLVED", label: "Đã xử lý" },
  { key: "REFUNDED", label: "Đã hoàn tiền" },
];

/** The white desk's status tones; the shared lib keeps the labels. */
const STATE_CHIP: Record<WarrantyStatus, string> = {
  OPEN: "border-amber-200 bg-amber-50 text-amber-700",
  IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700",
  REFUNDING: "border-violet-200 bg-violet-50 text-violet-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REFUNDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

/** Open first, then the bank refunds waiting on somebody, then the closed. */
const RANK: Record<WarrantyStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  REFUNDING: 2,
  RESOLVED: 3,
  REFUNDED: 4,
};

const PER_PAGE = 20;

/**
 * The warranty queue (the owner, 01/10/2026: "sửa lại … sao cho đỡ rối dễ
 * thao tác với khách hàng"): one line per ticket — its state, what was
 * bought, who and which order, and the last word said — and the ticket's own
 * page for everything else (/admin/warranty/[id]). What needs the shop sits
 * on top and has its own filter; a search finds an order, a buyer or a tool.
 * The overview's to-do cards open it on that filter (?filter=todo).
 */
export function AdminWarranty({
  rows,
  loadedAt,
  initialFilter = "ALL",
}: {
  rows: WarrantyListRow[];
  loadedAt: string;
  initialFilter?: "ALL" | "TODO";
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState("");

  const count = (key: Filter) =>
    key === "ALL"
      ? rows.length
      : key === "TODO"
        ? rows.filter(needsShop).length
        : rows.filter((r) => r.status === key).length;

  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) =>
      filter === "ALL"
        ? true
        : filter === "TODO"
          ? needsShop(r)
          : r.status === filter,
    )
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
  const page =
    paging.key === listKey ? Math.min(paging.page, pageCount - 1) : 0;
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
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    on
                      ? "bg-white/20 text-white"
                      : f.key === "TODO" && count("TODO") > 0
                        ? "bg-rose-600 text-white"
                        : "bg-zinc-100 text-zinc-500"
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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, khách, tool…"
            aria-label="Tìm yêu cầu bảo hành"
            className={`${INPUT} pl-9`}
          />
        </label>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Wrench className="mx-auto h-8 w-8 text-zinc-300" aria-hidden />
          <p className="mt-3 text-sm font-bold text-zinc-900">
            {rows.length === 0
              ? "Chưa có yêu cầu bảo hành nào"
              : "Không có yêu cầu nào khớp"}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {rows.length === 0
              ? "Khách báo lỗi từ nút “Yêu cầu bảo hành” trong hóa đơn đơn hàng."
              : "Đổi bộ lọc hoặc từ khóa tìm."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {pageRows.map((row) => (
            <TicketRow key={row.id} row={row} />
          ))}
        </div>
      )}

      <Pager
        page={page}
        pageCount={pageCount}
        onSelect={(next) => setPaging({ key: listKey, page: next })}
        total={shown.length}
        pageSize={PER_PAGE}
        unit="yêu cầu"
      />
    </div>
  );
}

/** One line of the queue; the whole line opens the ticket. */
function TicketRow({ row }: { row: WarrantyListRow }) {
  const state = WARRANTY_STATUS[row.status];
  return (
    <Link
      href={`/admin/warranty/${row.id}`}
      className="group flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-zinc-50/70 sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATE_CHIP[row.status]}`}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {state.label}
          </span>
          {row.awaitingShop ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              <MessageCircle className="h-3 w-3" aria-hidden />
              Khách nhắn mới
            </span>
          ) : null}
          {row.transferDue ? (
            <span className="inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Chờ chuyển khoản
            </span>
          ) : row.bankAwaited ? (
            <span className="inline-flex shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
              Chờ khách nhập STK
            </span>
          ) : null}
          <span className="min-w-0 truncate text-[13px] font-bold text-zinc-900">
            {row.productName}
          </span>
          {row.packageLabel ? (
            <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-px text-[11px] font-semibold text-zinc-600">
              {row.packageLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[12px] text-zinc-500">
          <span className="font-semibold text-zinc-700">{row.username}</span>{" "}
          · {row.orderCode} ·{" "}
          <WarrantyIssueGlyph
            issue={row.issue}
            className="-mt-0.5 mr-1 inline-block h-3.5 w-3.5 align-middle text-zinc-400"
          />
          {WARRANTY_ISSUE[row.issue].label}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-zinc-500">
          {row.lastFromShop === true ? (
            <span className="text-zinc-400">Shop: </span>
          ) : null}
          {row.lastFromShop === false ? (
            <span className="text-zinc-400">Khách: </span>
          ) : null}
          {row.preview}
        </p>
      </div>
      <span className="hidden shrink-0 text-[11px] tabular-nums text-zinc-400 sm:block">
        {row.lastAt}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600"
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
        const res = await fetch(
          `/api/admin/warranty-requests/pulse?since=${encodeURIComponent(since)}`,
          {
            cache: "no-store",
          },
        );
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
      className="sticky top-3 z-10 inline-flex items-center gap-2 self-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-[12px] font-bold text-zinc-900 shadow-lg shadow-zinc-900/10 transition-colors hover:bg-zinc-50"
    >
      <MessageCircle className="h-4 w-4 text-rose-600" aria-hidden />
      Có {fresh} cập nhật mới từ khách, bấm để tải lại
    </button>
  );
}
