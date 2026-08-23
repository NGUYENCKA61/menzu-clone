import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CircleDollarSign,
  CreditCard,
  Landmark,
  TrendingUp,
  UserRoundPlus,
  Users,
} from "lucide-react";

import { AdminDashboard } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminDashboard";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAdmin } from "@/lib/admin";
import { relativeTime } from "@/lib/announcements";
import { lastDays, percentChange, formatPercent, txState } from "@/lib/dashboard";
import { db } from "@/lib/db";
import { startOfDayVn } from "@/lib/time";

export const metadata: Metadata = { title: "Tổng quan | Quản trị" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "14:42" in the shop's timezone, decided here so both renders agree. */
function clockVn(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function AdminHome() {
  const admin = await getAdmin();
  // 404 rather than 403: a non-admin should not learn this area exists.
  if (!admin) notFound();

  const since = startOfDayVn();
  const today = { createdAt: { gte: since } };
  const days = lastDays(since, 7);
  const weekStart = days[0]!.start;
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);

  const [
    users,
    newUsersToday,
    cardToday,
    bankToday,
    incomeToday,
    revenueAllTime,
    cardAllTime,
    bankAllTime,
    thisWeek,
    lastWeek,
    dailyRevenue,
    recentTopUps,
    recentOrders,
    recentSignUps,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: today }),
    db.topUp.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { ...today, method: "CARD", status: "COMPLETED" },
    }),
    db.topUp.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { ...today, method: "BANK", status: "COMPLETED" },
    }),
    // Income is what customers actually paid for accounts today. Top-ups are
    // not income — money moving into a wallet is still the customer's until
    // they spend it.
    db.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...today, status: "PAID" },
    }),
    db.order.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
    db.topUp.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { method: "CARD", status: "COMPLETED" },
    }),
    db.topUp.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { method: "BANK", status: "COMPLETED" },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: "PAID", createdAt: { gte: weekStart } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: "PAID", createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    // One aggregate per day rather than a groupBy: the buckets are Vietnam
    // days, and grouping in SQL would group by UTC ones and file every sale
    // between midnight and 7am under the day before.
    Promise.all(
      days.map((day) =>
        db.order.aggregate({
          _sum: { total: true },
          where: { status: "PAID", createdAt: { gte: day.start, lt: day.end } },
        }),
      ),
    ),
    db.topUp.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, username: true, avatarUrl: true, createdAt: true },
    }),
  ]);

  const weekChange = percentChange(
    Number(thisWeek._sum.total ?? 0),
    Number(lastWeek._sum.total ?? 0),
  );

  // Both ledgers on one timeline. Merged here rather than in the browser so
  // the list is already the shop's, not something assembled from two lists a
  // reader could see out of order.
  const transactions = [
    ...recentTopUps.map((row) => ({
      code: row.code,
      username: row.user.username,
      avatarUrl: row.user.avatarUrl,
      kind: row.method === "CARD" ? "Nạp thẻ" : "Nạp bank",
      amount: `+${formatVnd(Number(row.amount))}đ`,
      credit: true,
      at: row.createdAt,
      state: txState("topup", row.status),
    })),
    ...recentOrders.map((row) => ({
      code: row.code,
      username: row.user.username,
      avatarUrl: row.user.avatarUrl,
      kind: "Đơn hàng",
      amount: `${formatVnd(Number(row.total))}đ`,
      credit: false,
      at: row.createdAt,
      state: txState("order", row.status),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  // The activity feed is the same events plus registrations, which have no
  // amount — a new account is something that happened, not money that moved.
  const now = new Date();
  const activity = [
    ...transactions.slice(0, 6).map((row) => ({
      id: `tx-${row.code}`,
      username: row.username,
      avatarUrl: row.avatarUrl,
      what: row.kind,
      amount: row.amount as string | null,
      credit: row.credit,
      state: row.state,
      at: row.at,
    })),
    ...recentSignUps.map((row) => ({
      id: `user-${row.id}`,
      username: row.username,
      avatarUrl: row.avatarUrl,
      what: "Đăng ký tài khoản",
      amount: null,
      credit: false,
      state: "SUCCESS" as const,
      at: row.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5)
    // "2 phút" is measured here, against the server's clock. The page is
    // force-dynamic and never hydrates this, so there is no second render to
    // disagree with.
    .map(({ at, ...rest }) => ({ ...rest, ago: relativeTime(at, now) }));

  return (
    <AdminShell
      title="Tổng quan"
      subtitle="Số liệu hệ thống, đọc trực tiếp từ cơ sở dữ liệu"
      username={admin.username}
    >
      <AdminDashboard
        todayStats={[
          {
            label: "Doanh thu hôm nay",
            value: `${formatVnd(Number(incomeToday._sum.total ?? 0))}đ`,
            sub: `${incomeToday._count} đơn đã thanh toán`,
            icon: CircleDollarSign,
            tint: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
          },
          {
            label: "Nạp bank hôm nay",
            value: `${formatVnd(Number(bankToday._sum.amount ?? 0))}đ`,
            sub: `${bankToday._count} lượt chuyển khoản`,
            icon: Landmark,
            tint: "border-sky-500/25 bg-sky-500/10 text-sky-400",
          },
          {
            label: "Nạp thẻ hôm nay",
            value: `${formatVnd(Number(cardToday._sum.amount ?? 0))}đ`,
            sub: `${cardToday._count} lượt nạp thẻ cào`,
            icon: CreditCard,
            tint: "border-violet-500/25 bg-violet-500/10 text-violet-400",
          },
          {
            label: "Người dùng mới",
            value: String(newUsersToday),
            sub: "tài khoản đăng ký hôm nay",
            icon: UserRoundPlus,
            tint: "border-amber-500/25 bg-amber-500/10 text-amber-400",
          },
        ]}
        totals={[
          {
            label: "Tổng thành viên",
            value: String(users),
            sub: "tài khoản đã đăng ký",
            icon: Users,
            tint: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400",
          },
          {
            label: "Tổng doanh thu",
            value: `${formatVnd(Number(revenueAllTime._sum.total ?? 0))}đ`,
            // Only shown when last week had something to compare against.
            sub:
              weekChange === null
                ? "toàn bộ đơn đã thanh toán"
                : `${formatPercent(weekChange)} so với tuần trước`,
            tone: weekChange === null ? undefined : weekChange >= 0 ? "up" : "down",
            icon: TrendingUp,
            tint: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
          },
          {
            label: "Tổng nạp thẻ",
            value: `${formatVnd(Number(cardAllTime._sum.amount ?? 0))}đ`,
            sub: `${cardAllTime._count} lượt nạp thẻ`,
            icon: CreditCard,
            tint: "border-violet-500/25 bg-violet-500/10 text-violet-400",
          },
          {
            label: "Tổng nạp bank",
            value: `${formatVnd(Number(bankAllTime._sum.amount ?? 0))}đ`,
            sub: `${bankAllTime._count} lượt chuyển khoản`,
            icon: Landmark,
            tint: "border-sky-500/25 bg-sky-500/10 text-sky-400",
          },
        ]}
        chart={days.map((day, index) => ({
          label: day.label,
          value: Number(dailyRevenue[index]?._sum.total ?? 0),
        }))}
        activity={activity}
        transactions={transactions.map(({ at, ...row }) => ({
          ...row,
          time: clockVn(at),
        }))}
      />
    </AdminShell>
  );
}
