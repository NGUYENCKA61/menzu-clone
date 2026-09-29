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

/**
 * "Đăng xuất" on one row of Quản lý thiết bị, as menzu has it.
 *
 * The page never holds a session id — that IS the login — only its last six
 * characters, so that is what arrives here, and it is only ever matched
 * against the caller's own sessions. The caller's own session is excluded
 * (leaving is the header's Đăng xuất), and two of their sessions sharing a
 * tail is refused rather than guessed at.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!/^[A-Za-z0-9]{6}$/.test(key)) {
    return NextResponse.json({ error: "Thiết bị không hợp lệ" }, { status: 400 });
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";
  const matches = await db.session.findMany({
    where: { userId: user.id, id: { endsWith: key, not: token } },
    select: { id: true },
  });
  if (matches.length === 0) {
    return NextResponse.json({ error: "Thiết bị này đã đăng xuất rồi." }, { status: 404 });
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: "Không xác định được thiết bị. Dùng Đăng xuất phiên khác." },
      { status: 409 },
    );
  }

  const dropped = await db.session.deleteMany({
    where: { id: matches[0]!.id, userId: user.id },
  });
  return NextResponse.json({ dropped: dropped.count });
}
