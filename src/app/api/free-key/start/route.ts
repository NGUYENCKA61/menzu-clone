import { NextResponse } from "next/server";

import { freeKeyFailure, startFreeClaim } from "@/lib/freeKey";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";

/**
 * "Lấy key miễn phí" on a free tool's page: a ticket and the shortlink to
 * pass, or the key itself when the shop runs no shortlink.
 */
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

  const body = (await request.json().catch(() => null)) as {
    code?: string;
  } | null;
  const code = body?.code?.trim();
  if (!code)
    return NextResponse.json({ error: "Thiếu mã tool" }, { status: 400 });

  try {
    const outcome = await startFreeClaim(user.id, code);
    return NextResponse.json(outcome);
  } catch (error) {
    const failure = freeKeyFailure(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
