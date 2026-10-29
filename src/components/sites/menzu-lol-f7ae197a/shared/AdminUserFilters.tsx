"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { INPUT } from "../admin/kit";
import { searchNeedsSync } from "@/lib/paging";
import {
  USER_QUERY_MAX,
  USER_TIER_LABELS,
  type UserFilters,
} from "@/lib/users";

/**
 * The four views, as one control.
 *
 * Role and status are separate columns but they are not separate questions:
 * an admin looking at this screen wants "everyone", "the working accounts",
 * "the locked ones" or "my staff", and two dropdowns to express that turns one
 * decision into two.
 */
const VIEWS = [
  { label: "Tất cả", role: "", state: "" },
  { label: "Đang hoạt động", role: "", state: "ACTIVE" },
  { label: "Đã khóa", role: "", state: "BLOCKED" },
  { label: "Quản trị", role: "ADMIN", state: "" },
] as const;

export function AdminUserFilters({ filters }: { filters: UserFilters }) {
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

  // Typing should not be a request per keystroke, nor fill the back button
  // with every prefix of the word.
  useEffect(() => {
    // Nothing typed since the URL was last written — which is the case on
    // every page click. Without this guard the timer below fires anyway and
    // strips the page the admin just asked for.
    if (!searchNeedsSync(q, params.get("q"))) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      // A new search invalidates where you were in the list.
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, params, pathname, router, startTransition]);

  function go(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  const active =
    VIEWS.find(
      (view) => view.role === (filters.role ?? "") && view.state === (filters.state ?? ""),
    ) ?? VIEWS[0];

  return (
    <div className="flex flex-col gap-2.5 xl:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={q}
          maxLength={USER_QUERY_MAX}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm tên đăng nhập, email hoặc UID…"
          aria-label="Tìm người dùng"
          className={`${INPUT} pl-9`}
        />
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        {VIEWS.map((view) => {
          const on = view.label === active.label;
          return (
            <button
              key={view.label}
              type="button"
              aria-pressed={on}
              onClick={() => go({ role: view.role, state: view.state })}
              className={`h-10 shrink-0 rounded-lg border px-4 text-[13px] font-semibold transition-colors ${
                on
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Not in the layout brief, kept because losing them would cost the shop
          a working feature: tier is the only way to find the platinum
          customers, and the export is where the list leaves for a spreadsheet. */}
      <select
        value={filters.tier ?? ""}
        onChange={(event) => go({ tier: event.target.value })}
        aria-label="Lọc theo hạng"
        className={`${INPUT} shrink-0 xl:w-auto`}
      >
        <option value="">Mọi hạng</option>
        {Object.entries(USER_TIER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Same button as the orders screen's, down to the label: they do the
          same job, and an admin who has found one should recognise the other
          rather than hunt for a quieter version of it. */}
      <a
        href={`/api/admin/users/export?${params.toString()}`}
        title="Tải danh sách đang xem về dạng CSV"
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        <Download size={15} />
        Xuất dữ liệu
      </a>
    </div>
  );
}
