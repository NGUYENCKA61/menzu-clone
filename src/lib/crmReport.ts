import "server-only";

import { db } from "@/lib/db";

/**
 * The numbers behind CRM > Báo cáo. Everything is bucketed on the shop's
 * own day (Asia/Ho_Chi_Minh) in JS after a narrow select — fourteen days of
 * paid orders and sign-ups is a few hundred rows, not a job for raw SQL
 * timezone acrobatics.
 */

const SHOP_TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;

/** "2026-10-29" in the shop's zone, a stable bucket key. */
function dayKeyOf(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: SHOP_TZ });
}

/** "29/10" for the axis. */
function dayLabelOf(key: string): string {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

export interface ReportDay {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  newUsers: number;
}

export interface CrmReport {
  days: ReportDay[];
  week: {
    revenue: number;
    orders: number;
    newUsers: number;
    prevRevenue: number;
    prevOrders: number;
    prevNewUsers: number;
  };
  chat: {
    needAdmin: number;
    bot: number;
    done: number;
    doneByBotAlone: number;
  };
  topCustomers: {
    uid: number;
    username: string;
    total: number;
    orders: number;
  }[];
}

export async function crmReport(): Promise<CrmReport> {
  const now = new Date();
  const since14 = new Date(now.getTime() - 13 * DAY_MS);
  since14.setHours(0, 0, 0, 0);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  const [orders, users, threadsByStatus, doneByBotAlone, topRows] = await Promise.all([
    db.order.findMany({
      where: { status: "PAID", createdAt: { gte: since14 } },
      select: { createdAt: true, total: true },
    }),
    db.user.findMany({
      where: { createdAt: { gte: since14 } },
      select: { createdAt: true },
    }),
    db.chatThread.groupBy({ by: ["status"], _count: { _all: true } }),
    db.chatThread.count({
      where: { status: "DONE", messages: { none: { role: "ADMIN" } } },
    }),
    db.order.groupBy({
      by: ["userId"],
      where: { status: "PAID", createdAt: { gte: since30 } },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  // The fourteen buckets, oldest first, every day present even when empty.
  const days: ReportDay[] = [];
  const byKey = new Map<string, ReportDay>();
  for (let i = 13; i >= 0; i--) {
    const key = dayKeyOf(new Date(now.getTime() - i * DAY_MS));
    const day = { key, label: dayLabelOf(key), revenue: 0, orders: 0, newUsers: 0 };
    days.push(day);
    byKey.set(key, day);
  }
  for (const order of orders) {
    const day = byKey.get(dayKeyOf(order.createdAt));
    if (!day) continue;
    day.revenue += Number(order.total);
    day.orders += 1;
  }
  for (const user of users) {
    const day = byKey.get(dayKeyOf(user.createdAt));
    if (day) day.newUsers += 1;
  }

  const sum = (slice: ReportDay[], pick: (d: ReportDay) => number) =>
    slice.reduce((acc, day) => acc + pick(day), 0);
  const thisWeek = days.slice(7);
  const lastWeek = days.slice(0, 7);

  const statusCount = (status: "BOT" | "NEED_ADMIN" | "DONE") =>
    threadsByStatus.find((row) => row.status === status)?._count._all ?? 0;

  const topUsers = topRows.length
    ? await db.user.findMany({
        where: { id: { in: topRows.map((row) => row.userId) } },
        select: { id: true, uid: true, username: true },
      })
    : [];
  const userById = new Map(topUsers.map((user) => [user.id, user]));

  return {
    days,
    week: {
      revenue: sum(thisWeek, (d) => d.revenue),
      orders: sum(thisWeek, (d) => d.orders),
      newUsers: sum(thisWeek, (d) => d.newUsers),
      prevRevenue: sum(lastWeek, (d) => d.revenue),
      prevOrders: sum(lastWeek, (d) => d.orders),
      prevNewUsers: sum(lastWeek, (d) => d.newUsers),
    },
    chat: {
      needAdmin: statusCount("NEED_ADMIN"),
      bot: statusCount("BOT"),
      done: statusCount("DONE"),
      doneByBotAlone,
    },
    topCustomers: topRows.flatMap((row) => {
      const user = userById.get(row.userId);
      if (!user) return [];
      return [
        {
          uid: user.uid,
          username: user.username,
          total: Number(row._sum.total ?? 0n),
          orders: row._count._all,
        },
      ];
    }),
  };
}
