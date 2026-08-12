"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ORDER_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  QUERY_MAX,
  type OrderFilters,
} from "@/lib/orders";

const FIELD =
  "h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors";

/**
 * The order screen's toolbar.
 *
 * Filtering happens in the database, not here: the table shows the most recent
 * hundred orders, so narrowing the rows already on screen would search a
 * hundred out of hundreds and confidently report nothing found. Every control
 * writes to the URL and the server answers — which also makes a filtered view
 * something an admin can bookmark or send to somebody.
 */
export function AdminOrderFilters({ filters }: { filters: OrderFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(filters.q);

  // Typing should not be a request per keystroke, and the URL should not fill
  // the back button with every prefix of the word.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      // Narrowing the list invalidates where you were in it: staying on page 5
      // of a result that now has one page shows a table the admin has to
      // page back out of to see what they searched for.
      next.delete("page");
      if (next.toString() !== params.toString()) {
        router.replace(`${pathname}?${next}`, { scroll: false });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, params, pathname, router]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
        />
        <input
          value={q}
          maxLength={QUERY_MAX}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm mã đơn, khách hàng hoặc sản phẩm…"
          aria-label="Tìm đơn hàng"
          className={`${FIELD} w-full pl-9`}
        />
      </div>

      <select
        value={filters.status ?? ""}
        onChange={(event) => set("status", event.target.value)}
        aria-label="Lọc theo trạng thái"
        className={FIELD}
      >
        <option value="" className="bg-neutral-900">
          Tất cả trạng thái
        </option>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      <select
        value={filters.method ?? ""}
        onChange={(event) => set("method", event.target.value)}
        aria-label="Lọc theo phương thức"
        className={FIELD}
      >
        <option value="" className="bg-neutral-900">
          Tất cả phương thức
        </option>
        {Object.entries(ORDER_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.day}
        onChange={(event) => set("day", event.target.value)}
        aria-label="Lọc theo ngày"
        className={FIELD}
      />

      {/* A plain link, not a fetch: the browser's own download handling gives
          the file its name and puts it where the admin expects. */}
      <a
        href={`/api/admin/orders/export?${params.toString()}`}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600"
      >
        <Download size={15} />
        Xuất dữ liệu
      </a>
    </div>
  );
}
