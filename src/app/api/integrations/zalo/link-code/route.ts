import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { issueLinkCode } from "@/lib/zaloLink";
import { linkMessage } from "@/lib/zaloShared";

/**
 * The Bảo mật page's "Liên kết Zalo": a short code the customer sends to the
 * bot's account, which then ties their Zalo to this web account. Only while
 * the shop has named the bot's number in Cấu hình, and only for an account
 * not already linked.
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

  const settings = await getShopSettings();
  const phone = settings.zaloBotPhone.trim();
  if (!phone)
    return NextResponse.json(
      { error: "Shop chưa mở kênh Zalo" },
      { status: 400 },
    );

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { zaloId: true },
  });
  if (row?.zaloId) {
    return NextResponse.json(
      { error: "Tài khoản này đã liên kết Zalo rồi" },
      { status: 400 },
    );
  }

  const { code, expiresAt } = await issueLinkCode(user.id);
  return NextResponse.json({
    code,
    message: linkMessage(code),
    phone,
    name: settings.zaloBotName.trim(),
    expiresAt: expiresAt.toISOString(),
  });
}
