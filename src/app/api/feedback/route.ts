import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** Backs the homepage reviews carousel. */
export async function GET() {
  const items = await db.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    items: items.map((f) => ({
      name: f.name,
      body: f.body,
      avatarUrl: f.avatarUrl,
      amount: Number(f.amount),
      verified: f.verified,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}
