import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * "Đăng xuất các thiết bị khác": drops every session but the one making the
 * request. The surviving token comes from the request's own cookie, so the
 * body carries nothing to forge — there is no way to aim this at another
 * account or at somebody else's session list.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";
  const dropped = await db.session.deleteMany({
    where: { userId: user.id, id: { not: token } },
  });

  return NextResponse.json({ dropped: dropped.count });
}
