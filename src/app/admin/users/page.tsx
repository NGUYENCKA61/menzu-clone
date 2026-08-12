import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminUserFilters } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUserFilters";
import { AdminUsers } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUsers";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { GAP, pageCount, pageRange, pageStrip, parsePage } from "@/lib/paging";
import { listUsers } from "@/lib/queries";
import { hasUserFilters, parseUserFilters, USERS_PER_PAGE } from "@/lib/users";
import { userWhere } from "@/lib/userStore";

export const metadata: Metadata = { title: "Người dùng | Quản trị" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** The last sign-in needs the hour too — "hôm nay" is not an answer to when. */
function formatDateTime(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const raw = await searchParams;
  const pick = (key: string) => (typeof raw[key] === "string" ? raw[key] : undefined);
  const filters = parseUserFilters({
    q: pick("q"),
    role: pick("role"),
    state: pick("state"),
    tier: pick("tier"),
  });
  const where = userWhere(filters);
  const filtered = hasUserFilters(filters);

  // Counted first, because the page number has to be clamped against something
  // that exists: ?page=99 on a two-page list should land on the last page, not
  // on an empty table that reads as "no customers".
  // The four figures across the top always describe the whole shop, never the
  // filtered view: a card reading "178 đã khóa" that changes when you search
  // is not a total, and the filtered count already has its own line.
  const [matching, allUsers, blockedUsers, adminUsers] = await Promise.all([
    db.user.count({ where }),
    db.user.count(),
    db.user.count({ where: { blockedAt: { not: null } } }),
    db.user.count({ where: { role: "ADMIN" } }),
  ]);
  const activeUsers = allUsers - blockedUsers;
  const totalPages = pageCount(matching, USERS_PER_PAGE);
  const page = parsePage(pick("page"), totalPages);
  const range = pageRange(page, USERS_PER_PAGE, matching);

  const users = await listUsers({
    where,
    skip: (page - 1) * USERS_PER_PAGE,
    take: USERS_PER_PAGE,
  });

  /** A link to another page, carrying whatever filters are on. */
  function pageHref(target: number): string {
    const next = new URLSearchParams();
    if (filters.q) next.set("q", filters.q);
    if (filters.role) next.set("role", filters.role);
    if (filters.state) next.set("state", filters.state);
    if (filters.tier) next.set("tier", filters.tier);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  }

  return (
    <AdminShell
      title="Người dùng"
      subtitle="Quản lý khách hàng và tài khoản trên hệ thống"
      username={admin.username}
      aside={
        <span className="text-[13px] text-neutral-500 tabular-nums">
          {matching.toLocaleString("vi-VN")} người dùng
          {filtered ? " khớp bộ lọc" : ""}
        </span>
      }
    >
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng người dùng"
          value={allUsers.toLocaleString("vi-VN")}
          sub="tài khoản đã đăng ký"
        />
        <StatCard
          label="Đang hoạt động"
          value={activeUsers.toLocaleString("vi-VN")}
          sub={
            allUsers === 0
              ? "chưa có tài khoản nào"
              : `${((activeUsers / allUsers) * 100).toFixed(1).replace(".", ",")}% tổng tài khoản`
          }
        />
        <StatCard
          label="Đã khóa"
          value={blockedUsers.toLocaleString("vi-VN")}
          sub="tài khoản bị khóa"
        />
        <StatCard
          label="Quản trị viên"
          value={adminUsers.toLocaleString("vi-VN")}
          sub="tài khoản có quyền admin"
        />
      </div>

      <div className="mb-5">
        <AdminUserFilters filters={filters} />
      </div>

      <AdminUsers
        selfUsername={admin.username}
        emptyNote={
          filtered ? "Không có người dùng nào khớp bộ lọc" : "Chưa có người dùng nào"
        }
        // Dates formatted here, where the timezone is fixed — doing it in the
        // client component would render differently on each side and React
        // would report the mismatch as a hydration error.
        users={users.map((user) => ({
          uid: user.uid,
          username: user.username,
          email: user.email,
          role: user.role,
          tier: user.tier,
          balance: user.balance,
          points: user.points,
          orderCount: user.orderCount,
          totalSpent: user.totalSpent,
          totalToppedUp: user.totalToppedUp,
          lastOrderAt: formatDate(user.lastOrderAt),
          lastLoginAt: formatDateTime(user.lastLoginAt),
          lastIp: user.lastIp,
          blockedAt: formatDate(user.blockedAt),
          blockedReason: user.blockedReason,
          createdAt: formatDate(user.createdAt) ?? "",
        }))}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12px] text-neutral-500 tabular-nums">
          {matching === 0
            ? "Không có người dùng nào"
            : `Hiển thị ${range.from}–${range.to} / ${matching.toLocaleString("vi-VN")} người dùng`}
        </p>

        {totalPages > 1 ? (
          <nav aria-label="Phân trang người dùng" className="flex items-center gap-1.5">
            <PageLink href={pageHref(page - 1)} disabled={page === 1} label="Trang trước">
              ‹
            </PageLink>
            {pageStrip(page, totalPages).map((n, index) =>
              n === GAP ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden
                  className="px-1 text-[12px] text-neutral-700"
                >
                  {GAP}
                </span>
              ) : (
                <PageLink key={n} href={pageHref(n)} current={n === page} label={`Trang ${n}`}>
                  {n}
                </PageLink>
              ),
            )}
            <PageLink
              href={pageHref(page + 1)}
              disabled={page === totalPages}
              label="Trang sau"
            >
              ›
            </PageLink>
          </nav>
        ) : null}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className="text-[26px] font-black leading-none text-white tabular-nums">
        {value}
      </span>
      <span className="text-[11px] text-neutral-500">{sub}</span>
    </div>
  );
}

function PageLink({
  href,
  children,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const shape =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";

  // Rendered as a span rather than a disabled link, so the arrow at either end
  // is not something a keyboard can tab onto and press to no effect.
  if (disabled) {
    return (
      <span
        aria-hidden
        className={`${shape} border-white/[0.06] text-neutral-700 cursor-default`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${shape} ${
        current
          ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
          : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
