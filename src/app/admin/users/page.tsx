import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminUsers } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUsers";
import { getAdmin } from "@/lib/admin";
import { listUsers } from "@/lib/queries";

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

export default async function AdminUsersPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const users = await listUsers();

  return (
    <AdminShell
      title="Người dùng"
      subtitle="Tra cứu khách hàng, lịch sử mua và khóa tài khoản"
      username={admin.username}
    >
      <AdminUsers
        selfUsername={admin.username}
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
    </AdminShell>
  );
}
