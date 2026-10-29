"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { INPUT } from "../admin/kit";

import {
  ORDER_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  QUERY_MAX,
  type OrderFilters,
} from "@/lib/orders";
import { searchNeedsSync } from "@/lib/paging";

/**
 * The order screen's toolbar, white since the 30/10/2026 rebuild.
 *
 * Filtering happens in the database, not here: the table shows the most recent
 * hundred orders, so narrowing the rows already on screen would search a
 * hundred out of hundreds and confidently report nothing found. Every control
 * writes to the URL and the server answers — which also makes a filtered view
 * something an admin can bookmark or send to somebody.
 */
export function AdminOrderFilters({ filters }: { filters: OrderFilters }) {
  const router = useRouter();
  // The list is the server page's, out of this bar's reach; it reads the
  // attribute off <html> and steps back while a filter is on its way -
  // the same move the storefront's filter panels make. A plain
  // router.replace gave the bar nothing to show for the wait.
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    document.documentElement.toggleAttribute("data-admin-filtering", isPending);
    return () => document.documentElement.removeAttribute("data-admin-filtering");
  }, [isPending]);
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(filters.q);

  // Typing should not be a request per keystroke, and the URL should not fill
  // the back button with every prefix of the word.
  useEffect(() => {
    // Nothing typed since the URL was last written — which is the case on
    // every page click. Without this guard the timer below fires anyway and
    // strips the page the admin just asked for.
    if (!searchNeedsSync(q, params.get("q"))) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      // A new search invalidates where you were in the list: staying on page 5
      // of a result that now has one page shows a table the admin has to page
      // back out of to see what they searched for.
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, params, pathname, router, startTransition]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={q}
          maxLength={QUERY_MAX}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm mã đơn, khách hàng hoặc sản phẩm…"
          aria-label="Tìm đơn hàng"
          className={`${INPUT} pl-9`}
        />
      </div>

      <select
        value={filters.status ?? ""}
        onChange={(event) => set("status", event.target.value)}
        aria-label="Lọc theo trạng thái"
        className={`${INPUT} lg:w-auto`}
      >
        <option value="">Tất cả trạng thái</option>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={filters.method ?? ""}
        onChange={(event) => set("method", event.target.value)}
        aria-label="Lọc theo phương thức"
        className={`${INPUT} lg:w-auto`}
      >
        <option value="">Tất cả phương thức</option>
        {Object.entries(ORDER_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.day}
        onChange={(event) => set("day", event.target.value)}
        aria-label="Lọc theo ngày"
        className={`${INPUT} lg:w-auto`}
      />

      {/* A plain link, not a fetch: the browser's own download handling gives
          the file its name and puts it where the admin expects. */}
      <a
        href={`/api/admin/orders/export?${params.toString()}`}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        <Download size={15} />
        Xuất dữ liệu
      </a>
    </div>
  );
}
