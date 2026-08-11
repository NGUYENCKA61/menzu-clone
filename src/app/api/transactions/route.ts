import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Ledger for /transactions. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [], total: 0 }, { status: 401 });

  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? 1) || 1);
  const pageSize = 20;

  const [total, rows] = await Promise.all([
    db.transaction.count({ where: { userId: user.id } }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((t) => ({
      code: t.code,
      kind: t.kind,
      status: t.status,
      delta: Number(t.delta),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      method: t.method,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
