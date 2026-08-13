"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { searchNeedsSync } from "@/lib/paging";
import {
  USER_QUERY_MAX,
  USER_TIER_LABELS,
  type UserFilters,
} from "@/lib/users";

const FIELD =
  "h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors";

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
      router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, params, pathname, router]);

  function go(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  const active =
    VIEWS.find(
      (view) => view.role === (filters.role ?? "") && view.state === (filters.state ?? ""),
    ) ?? VIEWS[0];

  return (
    <div className="flex flex-col xl:flex-row gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
        />
        <input
          value={q}
          maxLength={USER_QUERY_MAX}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm tên đăng nhập, email hoặc UID…"
          aria-label="Tìm người dùng"
          className={`${FIELD} w-full pl-9`}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {VIEWS.map((view) => {
          const on = view.label === active.label;
          return (
            <button
              key={view.label}
              type="button"
              aria-pressed={on}
              onClick={() => go({ role: view.role, state: view.state })}
              className={`h-10 shrink-0 rounded-lg border px-4 text-[11px] font-black uppercase tracking-widest transition-colors ${
                on
                  ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
                  : "border-white/[0.08] bg-[#0e0e11] text-neutral-400 hover:text-white hover:bg-white/[0.05]"
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
        className={`${FIELD} shrink-0`}
      >
        <option value="" className="bg-neutral-900">
          Mọi hạng
        </option>
        {Object.entries(USER_TIER_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      <a
        href={`/api/admin/users/export?${params.toString()}`}
        title="Tải danh sách đang xem về dạng CSV"
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#0e0e11] px-4 text-[13px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.05] hover:text-white"
      >
        <Download size={15} />
        Xuất
      </a>
    </div>
  );
}
