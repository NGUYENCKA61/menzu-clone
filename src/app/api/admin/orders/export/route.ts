import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  exportFilename,
  ORDER_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  parseOrderFilters,
  toCsv,
  type OrderMethod,
  type OrderStatus,
} from "@/lib/orders";
import { orderWhere } from "@/lib/orderStore";

/** Ceiling on one export, so a click cannot try to stream the whole table. */
const EXPORT_MAX = 5000;

/**
 * The order list as a spreadsheet, under whatever filters are on screen.
 *
 * Reuses the same `where` the table does. An export that quietly covers a
 * different set than the rows the admin was looking at is worse than none,
 * because nobody checks a spreadsheet against the page it came from.
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const url = new URL(request.url);
  const filters = parseOrderFilters({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    method: url.searchParams.get("method") ?? undefined,
    day: url.searchParams.get("day") ?? undefined,
  });

  const orders = await db.order.findMany({
    where: orderWhere(filters),
    orderBy: { createdAt: "desc" },
    take: EXPORT_MAX,
    include: {
      user: { select: { username: true, uid: true } },
      product: { select: { code: true } },
      voucher: { select: { code: true } },
    },
  });

  const csv = toCsv(
    [
      "Mã đơn",
      "Thời gian",
      "Khách hàng",
      "UID",
      "Sản phẩm",
      "Phương thức",
      "Giá gốc",
      "Giảm (%)",
      "Voucher",
      "Thành tiền",
      "Trạng thái",
    ],
    orders.map((order) => [
      order.code,
      order.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      order.user.username,
      order.user.uid,
      order.product.code,
      ORDER_METHOD_LABELS[order.method as OrderMethod] ?? order.method,
      // Numbers unformatted: a spreadsheet should receive figures it can add
      // up, not "1.250.000đ" as text.
      Number(order.listPrice),
      order.discountPct,
      order.voucher?.code ?? "",
      Number(order.total),
      ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status,
    ]),
  );

  return new NextResponse(
    // Excel reads a CSV in the system codepage unless the file says otherwise,
    // and without this byte order mark every Vietnamese name in the export
    // opens as mojibake.
    "﻿" + csv,
    {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${exportFilename()}"`,
        // Filtered exports differ by query string; no proxy should serve one
        // admin's filtered file to another's request.
        "cache-control": "no-store",
      },
    },
  );
}
