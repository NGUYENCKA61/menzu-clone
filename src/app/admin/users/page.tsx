import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminChrome } from "@/components/sites/menzu-lol-f7ae197a/admin/AdminChrome";
import { Pager } from "@/components/sites/menzu-lol-f7ae197a/admin/kit";
import { AdminUserFilters } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUserFilters";
import { AdminUsers } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUsers";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { pageCount, pageRange, parsePage } from "@/lib/paging";
import { listUsers } from "@/lib/queries";
import { hasUserFilters, parseUserFilters, USERS_PER_PAGE } from "@/lib/users";
import { userWhere } from "@/lib/userStore";
import { dayKey, dayStamp } from "@/lib/dayGroups";

export const metadata: Metadata = { title: "Người dùng | Quản trị" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string | null {
  return date ? dayKey(date) : null;
}

/** The last sign-in needs the hour too — "hôm nay" is not an answer to when. */
function formatDateTime(date: Date | null): string | null {
  return date ? dayStamp(date) : null;
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
    <AdminChrome
      title="Người dùng"
      subtitle="Quản lý khách hàng và tài khoản trên hệ thống"
      username={admin.username}
      aside={
        <span className="text-[13px] tabular-nums text-zinc-500">
          {matching.toLocaleString("vi-VN")} người dùng
          {filtered ? " khớp bộ lọc" : ""}
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Tổng người dùng" value={allUsers.toLocaleString("vi-VN")} sub="tài khoản đã đăng ký" />
        <StatCard
          label="Đang hoạt động"
          value={activeUsers.toLocaleString("vi-VN")}
          sub={
            allUsers === 0
              ? "chưa có tài khoản nào"
              : `${((activeUsers / allUsers) * 100).toFixed(1).replace(".", ",")}% tổng tài khoản`
          }
        />
        <StatCard label="Đã khóa" value={blockedUsers.toLocaleString("vi-VN")} sub="tài khoản bị khóa" />
        <StatCard label="Quản trị viên" value={adminUsers.toLocaleString("vi-VN")} sub="tài khoản có quyền admin" />
      </div>

      <div className="mb-4">
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
          avatarUrl: user.avatarUrl,
          role: user.role,
          agencyPercent: user.agencyPercent,
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
        <p className="text-[12px] tabular-nums text-zinc-500">
          {matching === 0
            ? "Không có người dùng nào"
            : `Hiển thị ${range.from}–${range.to} / ${matching.toLocaleString("vi-VN")} người dùng`}
        </p>
        <Pager page={page} totalPages={totalPages} hrefOf={pageHref} label="Phân trang người dùng" />
      </div>
    </AdminChrome>
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
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <span className="text-[12.5px] text-zinc-500">{label}</span>
      <span className="min-w-0 break-all text-[20px] font-bold leading-none tabular-nums text-zinc-900 sm:text-[24px]">
        {value}
      </span>
      <span className="text-[11.5px] text-zinc-400">{sub}</span>
    </div>
  );
}
