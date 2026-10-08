import { NextResponse } from "next/server";

import { takeLogin } from "@/lib/loginReveal";
import { getCurrentUser } from "@/lib/session";

/**
 * The receipt's "Lấy thông tin": a buyer who has confirmed they are recording
 * the screen takes their account's sign-in (the owner, 08/10/2026, after
 * menzu's "Nhận thông tin đăng nhập"). The take itself, and the rule for
 * which orders have one, live in lib/loginReveal, shared with the Telegram
 * bot. The receipt then refreshes and draws the sign-in the page now carries.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    /** The switch in the popup: "I am recording the screen". */
    recording?: boolean;
  } | null;
  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });
  if (body?.recording !== true) {
    return NextResponse.json({ error: "Hãy xác nhận đang quay màn hình" }, { status: 400 });
  }

  const taken = await takeLogin(user.id, code);
  if (!taken.ok) return NextResponse.json({ error: taken.error }, { status: taken.status });
  return NextResponse.json({ ok: true, revealedAt: taken.revealedAt.toISOString() });
}
