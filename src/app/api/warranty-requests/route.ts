import { NextResponse } from "next/server";

import { announceToAdmins } from "@/lib/announcementStore";
import { mailWarrantyAlert } from "@/lib/warrantyAlerts";
import { db } from "@/lib/db";
import { LOGIN_ORDER_SELECT, signInHold } from "@/lib/loginReveal";
import { absoluteUrl } from "@/lib/seo";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import { hasSecondRound } from "@/lib/warrantyDetails";
import { storeWarrantyImage } from "@/lib/warrantyImage";
import { notifyWarranty } from "@/lib/warrantyNotify";
import { getCurrentUser } from "@/lib/session";
import {
  readDescription,
  readIssue,
  readVideoUrl,
  WARRANTY_ISSUE,
  warrantyBlockedReason,
  warrantyKind,
} from "@/lib/warrantyRequests";

/**
 * A signed-in buyer reports that one of their own orders is not working.
 *
 * Multipart, like the refund request, because the screenshot of the error is
 * most of what makes the report answerable and should travel with the words.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const code = String(form.get("code") ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });
  }

  const said = readDescription(form.get("description"));
  if (!said.ok) {
    return NextResponse.json({ error: said.error }, { status: 400 });
  }

  // Scoped to this buyer, so a guessed order code belonging to somebody else
  // answers 404 rather than confirming it exists. With what an account's
  // sign-in state needs: no report before the sign-in has been taken.
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      ...LOGIN_ORDER_SELECT,
      warrantyRequests: {
        where: { status: { not: "RESOLVED" } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!order) {
    return NextResponse.json(
      { error: "Không tìm thấy đơn hàng" },
      { status: 404 },
    );
  }

  // A tool's report and an account's offer different faults, and an
  // account's must carry the screen recording.
  const kind = warrantyKind(order.product.productType);
  const picked = readIssue(form.get("issue"), kind);
  if (!picked.ok) {
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }
  let videoUrl: string | null = null;
  if (kind === "account") {
    const video = readVideoUrl(form.get("videoUrl"));
    if (!video.ok) {
      return NextResponse.json({ error: video.error }, { status: 400 });
    }
    videoUrl = video.url;
  }

  // Checked here and not only in the form: a rule enforced by a disabled
  // button is not enforced.
  const blocked = warrantyBlockedReason({
    orderStatus: order.status,
    openRequest: order.warrantyRequests.length > 0,
    signIn: kind === "account" ? signInHold(order) : null,
  });
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  const image = await storeWarrantyImage(form.get("image"), user.uid);
  if (!image.ok) {
    return NextResponse.json({ error: image.error }, { status: 400 });
  }
  // The picture is required (the owner, 10/10/2026): the form asks for one,
  // and a report sent any other way must carry one too.
  if (!image.url) {
    return NextResponse.json(
      { error: "Vui lòng đính kèm ảnh chụp màn hình lỗi" },
      { status: 400 },
    );
  }

  // Whether a second round follows. A tool's report waits on the desk's
  // questions; an account's has none and is the desk's from this moment
  // (hasSecondRound).
  const secondRound = hasSecondRound(kind);
  const ticket = await db.warrantyRequest.create({
    data: {
      orderId: order.id,
      userId: user.id,
      issue: picked.issue,
      description: said.description,
      imageUrl: image.url,
      videoUrl,
      detailsDoneAt: secondRound ? null : new Date(),
    },
    select: { id: true },
  });

  // The desk hears about it on the bell. Awaited so a failure to write the
  // notice cannot land after the response — but it swallows its own errors,
  // so the buyer's report never fails over a notification.
  await announceToAdmins({
    title: "Yêu cầu bảo hành mới",
    body:
      `${user.username} vừa báo lỗi đơn ${code} - ` +
      `${order.product.name ?? order.product.code}: ${WARRANTY_ISSUE[picked.issue].label}.\n` +
      `Bấm "Xem ngay" để đọc mô tả và xử lý.`,
    // Somebody paid and cannot use what they bought; this belongs above the
    // week's maintenance notice on the bell.
    priority: "HIGH",
    cta: { label: "Xem ngay", href: "/admin/warranty" },
  });
  await notifyTelegramAdmins(
    [
      "🛠 <b>Yêu cầu bảo hành mới</b>",
      `${escapeTelegramHtml(user.username)} · đơn ${escapeTelegramHtml(code)}`,
      escapeTelegramHtml(
        `${order.product.name ?? order.product.code} - ${WARRANTY_ISSUE[picked.issue].label}`,
      ),
      `🔗 ${absoluteUrl("/admin/warranty")}`,
    ].join("\n"),
  );
  // And the shop's mailbox (VĐ 31): the same facts, with the ticket's link.
  await mailWarrantyAlert({
    subject: `Yêu cầu bảo hành mới: đơn ${code} (${user.username})`,
    lines: [
      `Khách ${user.username} vừa báo lỗi đơn ${code}.`,
      `Sản phẩm: ${order.product.name ?? order.product.code}`,
      `Lỗi: ${WARRANTY_ISSUE[picked.issue].label}`,
      `Mô tả: ${said.description}`,
      secondRound
        ? "Khách còn phải trả lời đợt 2 (bổ sung thông tin) trước khi shop kiểm tra."
        : "Đơn tài khoản không có đợt 2: kiểm tra được ngay.",
    ],
    href: absoluteUrl(`/admin/warranty/${ticket.id}`),
  });
  // And the buyer, on the bell and by email: the first step of the ticket
  // they will follow from here.
  await notifyWarranty(
    user.id,
    code,
    {
      title: "Shop đã nhận yêu cầu bảo hành",
      body: `Đơn ${code}: shop đã nhận báo lỗi "${WARRANTY_ISSUE[picked.issue].label}" và sẽ xử lý sớm.`,
    },
    { ticketId: ticket.id },
  );

  return NextResponse.json({ ok: true });
}
