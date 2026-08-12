"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  USER_QUERY_MAX,
  USER_ROLE_LABELS,
  USER_STATE_LABELS,
  USER_TIER_LABELS,
  type UserFilters,
} from "@/lib/users";

const FIELD =
  "h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors";

/**
 * The user screen's toolbar.
 *
 * Filtering happens in the database, not here. The table shows one page of
 * customers, so narrowing the rows already on screen would search twenty out
 * of however many the shop has and confidently report nothing found — and a
 * shop looking up one customer by name is exactly the case that has to work.
 */
export function AdminUserFilters({ filters }: { filters: UserFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(filters.q);

  // Typing should not be a request per keystroke, nor fill the back button
  // with every prefix of the word.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      // Narrowing the list invalidates where you were in it.
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
          maxLength={USER_QUERY_MAX}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm tên đăng nhập, email hoặc UID…"
          aria-label="Tìm người dùng"
          className={`${FIELD} w-full pl-9`}
        />
      </div>

      <select
        value={filters.state ?? ""}
        onChange={(event) => set("state", event.target.value)}
        aria-label="Lọc theo trạng thái"
        className={FIELD}
      >
        <option value="" className="bg-neutral-900">
          Tất cả trạng thái
        </option>
        {Object.entries(USER_STATE_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      <select
        value={filters.role ?? ""}
        onChange={(event) => set("role", event.target.value)}
        aria-label="Lọc theo quyền"
        className={FIELD}
      >
        <option value="" className="bg-neutral-900">
          Tất cả quyền
        </option>
        {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      <select
        value={filters.tier ?? ""}
        onChange={(event) => set("tier", event.target.value)}
        aria-label="Lọc theo hạng"
        className={FIELD}
      >
        <option value="" className="bg-neutral-900">
          Tất cả hạng
        </option>
        {Object.entries(USER_TIER_LABELS).map(([value, label]) => (
          <option key={value} value={value} className="bg-neutral-900">
            {label}
          </option>
        ))}
      </select>

      {/* A plain link, not a fetch: the browser's own download handling gives
          the file its name and puts it where the admin expects. */}
      <a
        href={`/api/admin/users/export?${params.toString()}`}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600"
      >
        <Download size={15} />
        Xuất dữ liệu
      </a>
    </div>
  );
}
