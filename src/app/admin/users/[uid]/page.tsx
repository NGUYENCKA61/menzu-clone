import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminUserDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminUserDetail";
import { getAdmin } from "@/lib/admin";
import { listUsers } from "@/lib/queries";

export const metadata: Metadata = { title: "Hồ sơ người dùng | Quản trị" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

/**
 * One customer's full record and every admin control on them — the list row's
 * cramped inline panel, given a page of its own.
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const uid = Number((await params).uid);
  if (!Number.isInteger(uid) || uid < 1) notFound();

  const rows = await listUsers({ where: { uid }, take: 1 });
  const user = rows[0];
  if (!user) notFound();

  return (
    <AdminShell
      title={user.username}
      subtitle="Hồ sơ khách hàng và thao tác quản trị"
      username={admin.username}
      aside={
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Danh sách người dùng
        </Link>
      }
    >
      <AdminUserDetail
        selfUsername={admin.username}
        user={{
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
        }}
      />
    </AdminShell>
  );
}
