import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Blocks or unblocks an account.
 *
 * Blocking drops every live session as well as setting the flag. Without that
 * the person stays signed in until their cookie expires, which on this site
 * means days of continued buying after being blocked.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    blocked?: boolean;
    reason?: string;
  } | null;

  const username = body?.username?.trim();
  if (!username) return NextResponse.json({ error: "Thiếu tên đăng nhập" }, { status: 400 });

  const target = await db.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  // An admin who blocks themselves locks everyone out of this screen, since
  // admin is granted only from the server side.
  if (target.id === admin.id) {
    return NextResponse.json({ error: "Không thể tự khóa tài khoản của mình" }, { status: 400 });
  }
  if (target.role === "ADMIN" && body?.blocked) {
    return NextResponse.json({ error: "Không thể khóa tài khoản quản trị" }, { status: 400 });
  }

  const blocked = Boolean(body?.blocked);

  const updated = await db.user.update({
    where: { id: target.id },
    data: {
      blockedAt: blocked ? new Date() : null,
      blockedReason: blocked ? (body?.reason?.trim() || null) : null,
    },
  });

  if (blocked) {
    await db.session.deleteMany({ where: { userId: target.id } });
  }

  return NextResponse.json({
    username: updated.username,
    blocked: updated.blockedAt !== null,
  });
}
