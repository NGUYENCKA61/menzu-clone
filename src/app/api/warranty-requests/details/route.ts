import { NextResponse } from "next/server";

import { announceToAdmins } from "@/lib/announcementStore";
import { absoluteUrl } from "@/lib/seo";
import { mailWarrantyAlert } from "@/lib/warrantyAlerts";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { getCurrentUser } from "@/lib/session";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import {
  ANSWER_MAX,
  detailsComplete,
  IMAGES_PER_ANSWER,
  missingDetails,
  resolveQuestions,
  type DetailAnswer,
} from "@/lib/warrantyDetails";
import { storeWarrantyImage } from "@/lib/warrantyImage";
import { warrantyKind, warrantyOpen } from "@/lib/warrantyRequests";

/**
 * The second round of a warranty report (the owner, 10/10/2026: "đợt 2 bắt
 * buộc vì cần phải kỹ hơn").
 *
 * One post carries every answer at once: a value per question and, where the
 * question asks for one, a screenshot beside it. Nothing is written unless
 * the whole round is there, so a half-filled form cannot leave a ticket the
 * desk thinks is ready.
 *
 * Only on the buyer's own ticket, and only while it is open: a finished one
 * is read-only, as its conversation is.
 */
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

  const form = await request.formData().catch(() => null);
  if (!form)
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ" },
      { status: 400 },
    );

  const id = String(form.get("ticket") ?? "").trim();
  if (!id)
    return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const ticket = await db.warrantyRequest.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
      detailsDoneAt: true,
      order: {
        select: {
          code: true,
          product: {
            select: {
              name: true,
              code: true,
              productType: true,
              warrantyQuestions: true,
              category: { select: { warrantyQuestions: true } },
            },
          },
        },
      },
    },
  });
  if (!ticket)
    return NextResponse.json(
      { error: "Không tìm thấy yêu cầu" },
      { status: 404 },
    );
  if (!warrantyOpen(ticket.status)) {
    return NextResponse.json(
      { error: "Yêu cầu này đã xử lý xong, không bổ sung được nữa." },
      { status: 400 },
    );
  }
  if (ticket.detailsDoneAt) {
    return NextResponse.json(
      { error: "Bạn đã bổ sung thông tin cho yêu cầu này rồi." },
      { status: 400 },
    );
  }

  const kind = warrantyKind(ticket.order.product.productType);
  // The product's own questions, its game's, or the default set.
  const questions = resolveQuestions(
    kind,
    ticket.order.product.warrantyQuestions,
    ticket.order.product.category.warrantyQuestions,
  );
  const answers: DetailAnswer[] = [];
  for (const question of questions) {
    const raw = form.get(`value-${question.key}`);
    const value =
      typeof raw === "string" ? raw.trim().slice(0, ANSWER_MAX) : "";
    // The pictures are stored before the round is judged complete, so a
    // refusal names the question rather than a file the buyer cannot see.
    // A question takes several at once; anything past the limit is dropped
    // rather than refused, since the buyer has already sent enough.
    const imageUrls: string[] = [];
    for (const entry of form
      .getAll(`image-${question.key}`)
      .slice(0, IMAGES_PER_ANSWER)) {
      const picture = await storeWarrantyImage(entry, user.uid);
      if (!picture.ok) {
        return NextResponse.json(
          { error: `${question.label}: ${picture.error}` },
          { status: 400 },
        );
      }
      if (picture.url) imageUrls.push(picture.url);
    }
    if (!value && imageUrls.length === 0) continue;
    // The question's words travel with the answer, so a set the shop
    // rewrites later does not change what this ticket says.
    answers.push({
      key: question.key,
      value,
      imageUrls,
      label: question.label,
      short: question.short,
    });
  }

  const missing = missingDetails(questions, answers);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Còn thiếu: ${missing.map((q) => q.label).join(", ")}` },
      { status: 400 },
    );
  }
  if (!detailsComplete(questions, answers)) {
    return NextResponse.json(
      { error: "Thông tin bổ sung chưa hợp lệ" },
      { status: 400 },
    );
  }

  await db.warrantyRequest.update({
    where: { id },
    data: { details: JSON.stringify(answers), detailsDoneAt: new Date() },
  });

  const code = ticket.order.code;
  const product = ticket.order.product.name ?? ticket.order.product.code;
  await announceToAdmins({
    title: "Khách đã bổ sung thông tin bảo hành",
    body: `${user.username} · đơn ${code}: đủ ${answers.length} mục, kiểm tra được rồi.`,
    priority: "HIGH",
    days: 3,
    cta: { label: "Xem ngay", href: "/admin/warranty" },
  });
  await notifyTelegramAdmins(
    [
      "🧾 <b>Khách đã bổ sung thông tin bảo hành</b>",
      `${escapeTelegramHtml(user.username)} · đơn ${escapeTelegramHtml(code)} · ${escapeTelegramHtml(product)}`,
      `Đủ ${answers.length} mục, kiểm tra được rồi.`,
    ].join("\n"),
  );

  // And the shop's mailbox (VĐ 31), now that the ticket can be worked on.
  await mailWarrantyAlert({
    subject: `Khách đã bổ sung thông tin bảo hành: đơn ${code} (${user.username})`,
    lines: [
      `${user.username} đã trả lời đủ ${answers.length} mục cho đơn ${code} (${product}).`,
      ...answers.map(
        (a) =>
          `- ${a.short ?? a.key}: ${a.value}${a.imageUrls.length ? ` (${a.imageUrls.length} ảnh)` : ""}`,
      ),
    ],
    href: absoluteUrl(`/admin/warranty/${id}`),
  });

  return NextResponse.json({ ok: true });
}
