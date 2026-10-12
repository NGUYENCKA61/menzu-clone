import { NextResponse } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { unlinkZalo } from "@/lib/zaloLink";

/** The Bảo mật page's "Huỷ liên kết" for Zalo: notices stop going there. */
export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ" },
      { status: 403 },
    );
  }
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  await unlinkZalo(user.id);
  return NextResponse.json({ ok: true });
}
