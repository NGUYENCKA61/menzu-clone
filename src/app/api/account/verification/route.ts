import { NextResponse } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { submitVerification, verificationFailure } from "@/lib/verification";

/** "Gửi hồ sơ" on Bảo mật › Xác thực cấp 2: a bid for the shop to read. */
export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ" },
      { status: 403 },
    );
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Parameters<
    typeof submitVerification
  >[1];
  try {
    const view = await submitVerification(user.id, body);
    return NextResponse.json({ view });
  } catch (error) {
    const failure = verificationFailure(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
