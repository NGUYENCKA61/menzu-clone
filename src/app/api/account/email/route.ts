import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Change the account's email address. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim() ?? "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  const taken = await db.user.findFirst({
    where: { email, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "Email đã được sử dụng" },
      { status: 409 },
    );
  }

  await db.user.update({ where: { id: user.id }, data: { email } });
  return NextResponse.json({ ok: true, email });
}
