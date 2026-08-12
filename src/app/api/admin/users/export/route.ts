import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/orders";
import {
  parseUserFilters,
  USER_ROLE_LABELS,
  USER_TIER_LABELS,
  type UserRole,
  type UserTier,
} from "@/lib/users";
import { userWhere } from "@/lib/userStore";

/** Ceiling on one export, so a click cannot try to stream the whole table. */
const EXPORT_MAX = 5000;

function filename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `nguoi-dung-${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(
    local.getUTCDate(),
  )}-${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}.csv`;
}

/**
 * The customer list as a spreadsheet, under whatever filters are on screen.
 *
 * Reuses the same `where` the table does, so the file and the page cannot
 * disagree about who is in the list.
 *
 * What it deliberately leaves out is the last-seen IP. It is on the screen for
 * a support lookup, but a file of every customer's address travels — into
 * email, into somebody's Downloads folder — and there is no reason a
 * spreadsheet of spend and tiers needs to carry it.
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const url = new URL(request.url);
  const filters = parseUserFilters({
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    tier: url.searchParams.get("tier") ?? undefined,
  });

  const where = userWhere(filters);

  const [users, topped, spend] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: EXPORT_MAX,
      include: { _count: { select: { orders: true } } },
    }),
    db.topUp.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    db.order.groupBy({
      by: ["userId"],
      _sum: { total: true },
      where: { status: "PAID" },
    }),
  ]);

  const toppedByUser = new Map(topped.map((r) => [r.userId, Number(r._sum.amount ?? 0)]));
  const spentByUser = new Map(spend.map((r) => [r.userId, Number(r._sum.total ?? 0)]));

  const csv = toCsv(
    [
      "UID",
      "Tên đăng nhập",
      "Email",
      "Quyền",
      "Hạng",
      "Số dư",
      "Điểm",
      "Số đơn",
      "Tổng chi",
      "Tổng nạp",
      "Ngày tham gia",
      "Trạng thái",
      "Lý do khóa",
    ],
    users.map((user) => [
      user.uid,
      user.username,
      user.email ?? "",
      USER_ROLE_LABELS[user.role as UserRole] ?? user.role,
      USER_TIER_LABELS[user.tier as UserTier] ?? user.tier,
      // Unformatted: a spreadsheet should receive figures it can add up.
      Number(user.balance),
      user.points,
      user._count.orders,
      spentByUser.get(user.id) ?? 0,
      toppedByUser.get(user.id) ?? 0,
      user.createdAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      user.blockedAt ? "Đã khóa" : "Đang hoạt động",
      user.blockedReason ?? "",
    ]),
  );

  return new NextResponse("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename()}"`,
      "cache-control": "no-store",
    },
  });
}
