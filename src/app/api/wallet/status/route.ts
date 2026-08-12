import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Where the transfer screen asks "has it landed yet".
 *
 * Scoped to the caller's own requests, so a code guessed off somebody else's
 * screen tells you nothing.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });

  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã lệnh nạp" }, { status: 400 });

  const topUp = await db.topUp.findFirst({
    where: { code, userId: user.id },
    select: { code: true, status: true, amount: true },
  });
  if (!topUp) {
    return NextResponse.json({ error: "Không tìm thấy lệnh nạp" }, { status: 404 });
  }

  return NextResponse.json({
    code: topUp.code,
    status: topUp.status,
    amount: Number(topUp.amount),
  });
}
