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
          lastOrderAt: formatDate(user.lastOrderAt),
          blockedAt: formatDate(user.blockedAt),
          createdAt: formatDate(user.createdAt) ?? "",
        }))}
      />
    </AdminShell>
  );
}
