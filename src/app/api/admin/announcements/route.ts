import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import {
  BODY_MAX,
  BULLET_MAX,
  BULLETS_MAX,
  readAudience,
  readDate,
  readPriority,
  readStatus,
  readType,
  RECIPIENTS_MAX,
  TITLE_MAX,
} from "@/lib/announcements";
import { db } from "@/lib/db";

/**
 * Managing the notices shown to visitors.
 *
 * Every handler resolves the caller through `getAdmin`, which re-reads the
 * role from the database rather than believing anything the browser sent — the
 * client hides these controls from non-admins, but hiding a button is not a
 * permission check.
 *
 * Titles and bodies are stored and rendered as plain text. React escapes them
 * on the way out and nothing here calls dangerouslySetInnerHTML, so a `<script>`
 * typed into the form is shown to visitors as those exact characters. That is
 * the whole XSS story for this feature, and it stays true only while nobody
 * introduces a rich-text renderer downstream.
 */

interface Payload {
  id?: string;
  title?: string;
  body?: string;
  type?: string;
  priority?: string;
  status?: string;
  audience?: string;
  usernames?: unknown;
  bullets?: unknown;
  noticeTitle?: string | null;
  noticeBody?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  action?: string;
}

/** Trims a list of bullet lines down to what the model will hold. */
function readBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, BULLETS_MAX)
    .map((line) => line.slice(0, BULLET_MAX));
}

/**
 * Turns the names an admin typed into user ids.
 *
 * Names that match nothing are reported rather than dropped: silently
 * addressing a notice to four of the five people the shop meant is the kind of
 * mistake nobody finds out about until somebody asks why they were not told.
 */
async function resolveRecipients(
  value: unknown,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "Chọn ít nhất một người nhận" };
  }
  const names = value
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Chọn ít nhất một người nhận" };
  if (names.length > RECIPIENTS_MAX) {
    return { ok: false, error: `Tối đa ${RECIPIENTS_MAX} người nhận mỗi thông báo` };
  }

  const users = await db.user.findMany({
    where: { username: { in: names, mode: "insensitive" } },
    select: { id: true, username: true },
  });

  const found = new Set(users.map((u) => u.username.toLowerCase()));
  const missing = names.filter((n) => !found.has(n.toLowerCase()));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Không tìm thấy tài khoản: ${missing.slice(0, 5).join(", ")}${
        missing.length > 5 ? ` và ${missing.length - 5} tài khoản khác` : ""
      }`,
    };
  }

  return { ok: true, ids: users.map((u) => u.id) };
}

/** Trims and length-checks the two free-text fields. */
function readText(
  value: unknown,
  max: number,
  field: string,
): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: `Thiếu ${field}` };
  const text = value.trim();
  if (!text) return { ok: false, error: `${field} không được để trống` };
  if (text.length > max) {
    return { ok: false, error: `${field} tối đa ${max} ký tự` };
  }
  return { ok: true, text };
}

/**
 * The callout box, which is both fields or neither.
 *
 * A heading with nothing under it renders as an empty bordered rectangle, and
 * text with no heading loses the emphasis that was the reason for the box.
 */
function readNoticeBox(
  body: Payload | null,
): { ok: true; title: string | null; body: string | null } | { ok: false; error: string } {
  const title = typeof body?.noticeTitle === "string" ? body.noticeTitle.trim() : "";
  const text = typeof body?.noticeBody === "string" ? body.noticeBody.trim() : "";

  if (!title && !text) return { ok: true, title: null, body: null };
  if (!title || !text) {
    return { ok: false, error: "Ô lưu ý quan trọng cần cả tiêu đề và nội dung" };
  }
  if (title.length > TITLE_MAX || text.length > BODY_MAX) {
    return { ok: false, error: "Ô lưu ý quan trọng quá dài" };
  }
  return { ok: true, title, body: text };
}

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as Payload | null;

  const title = readText(body?.title, TITLE_MAX, "Tiêu đề");
  if (!title.ok) return NextResponse.json({ error: title.error }, { status: 400 });

  const text = readText(body?.body, BODY_MAX, "Nội dung");
  if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 });

  const startAt = readDate(body?.startAt) ?? new Date();
  const endAt = readDate(body?.endAt) ?? null;
  if (endAt && endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json(
      { error: "Thời điểm kết thúc phải sau thời điểm bắt đầu" },
      { status: 400 },
    );
  }

  const audience = readAudience(body?.audience) ?? "ALL";
  let recipientIds: string[] = [];
  if (audience === "USERS") {
    const resolved = await resolveRecipients(body?.usernames);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });
    recipientIds = resolved.ids;
  }

  const notice = readNoticeBox(body);
  if (!notice.ok) return NextResponse.json({ error: notice.error }, { status: 400 });

  const announcement = await db.announcement.create({
    data: {
      title: title.text,
      body: text.text,
      type: readType(body?.type) ?? "INFO",
      priority: readPriority(body?.priority) ?? "NORMAL",
      // Created as a draft unless the shop said otherwise, so a half-written
      // notice cannot reach the whole site the moment it is saved.
      status: readStatus(body?.status) ?? "DRAFT",
      audience,
      bullets: readBullets(body?.bullets),
      noticeTitle: notice.title,
      noticeBody: notice.body,
      startAt,
      endAt,
      recipients: {
        create: recipientIds.map((userId) => ({ userId })),
      },
    },
  });

  return NextResponse.json({ id: announcement.id });
}

/**
 * Edit a notice, or publish and disable one.
 *
 * Publish and disable are `action` rather than a status field, because they
 * are the two things done from the table and spelling them out keeps a stray
 * status in an edit payload from switching a notice on by accident.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as Payload | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu thông báo" }, { status: 400 });

  const current = await db.announcement.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Không tìm thấy thông báo" }, { status: 404 });
  }

  if (body?.action === "publish" || body?.action === "disable") {
    await db.announcement.update({
      where: { id },
      data: { status: body.action === "publish" ? "PUBLISHED" : "DISABLED" },
    });
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};

  if (body?.title !== undefined) {
    const title = readText(body.title, TITLE_MAX, "Tiêu đề");
    if (!title.ok) return NextResponse.json({ error: title.error }, { status: 400 });
    data.title = title.text;
  }

  if (body?.body !== undefined) {
    const text = readText(body.body, BODY_MAX, "Nội dung");
    if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 });
    data.body = text.text;
  }

  if (body?.type !== undefined) {
    const type = readType(body.type);
    if (!type) return NextResponse.json({ error: "Loại không hợp lệ" }, { status: 400 });
    data.type = type;
  }

  if (body?.priority !== undefined) {
    const priority = readPriority(body.priority);
    if (!priority) {
      return NextResponse.json({ error: "Mức ưu tiên không hợp lệ" }, { status: 400 });
    }
    data.priority = priority;
  }

  const startAt = readDate(body?.startAt);
  const endAt = readDate(body?.endAt);
  if (body?.startAt !== undefined && startAt === undefined) {
    return NextResponse.json({ error: "Thời điểm bắt đầu không hợp lệ" }, { status: 400 });
  }
  if (body?.endAt !== undefined && endAt === undefined) {
    return NextResponse.json({ error: "Thời điểm kết thúc không hợp lệ" }, { status: 400 });
  }
  if (startAt) data.startAt = startAt;
  if (endAt !== undefined) data.endAt = endAt;

  const finalStart = (data.startAt as Date | undefined) ?? current.startAt;
  const finalEnd = (data.endAt as Date | null | undefined) ?? current.endAt;
  if (finalEnd && finalEnd.getTime() <= finalStart.getTime()) {
    return NextResponse.json(
      { error: "Thời điểm kết thúc phải sau thời điểm bắt đầu" },
      { status: 400 },
    );
  }

  if (body?.bullets !== undefined) data.bullets = readBullets(body.bullets);

  if (body?.noticeTitle !== undefined || body?.noticeBody !== undefined) {
    const notice = readNoticeBox(body);
    if (!notice.ok) return NextResponse.json({ error: notice.error }, { status: 400 });
    data.noticeTitle = notice.title;
    data.noticeBody = notice.body;
  }

  // Addressing is replaced wholesale rather than merged: the form sends the
  // list the admin is looking at, and merging would make removing somebody
  // impossible.
  let recipients: string[] | null = null;
  const audience = body?.audience === undefined ? null : readAudience(body.audience);
  if (body?.audience !== undefined) {
    if (!audience) {
      return NextResponse.json({ error: "Đối tượng nhận không hợp lệ" }, { status: 400 });
    }
    data.audience = audience;
    if (audience === "USERS") {
      const resolved = await resolveRecipients(body?.usernames);
      if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });
      recipients = resolved.ids;
    } else {
      recipients = [];
    }
  }

  if (Object.keys(data).length === 0 && recipients === null) {
    return NextResponse.json({ error: "Không có gì để sửa" }, { status: 400 });
  }

  // Re-worded notices reach people who already closed the old wording; a
  // rescheduled or re-prioritised one does not, because what they read has not
  // changed and reopening the modal over it would only be noise.
  if (
    data.title !== undefined ||
    data.body !== undefined ||
    data.bullets !== undefined ||
    data.noticeTitle !== undefined
  ) {
    data.revision = current.revision + 1;
  }

  // One transaction: an announcement addressed to nobody because the delete
  // landed and the insert did not is a notice that silently reaches no one.
  await db.$transaction([
    db.announcement.update({ where: { id }, data }),
    ...(recipients === null
      ? []
      : [
          db.announcementRecipient.deleteMany({ where: { announcementId: id } }),
          db.announcementRecipient.createMany({
            data: recipients.map((userId) => ({ announcementId: id, userId })),
          }),
        ]),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu thông báo" }, { status: 400 });

  const current = await db.announcement.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Không tìm thấy thông báo" }, { status: 404 });
  }

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
