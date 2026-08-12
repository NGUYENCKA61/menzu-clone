import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Matches the live form's stated cap. */
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const MODES = new Set(["SELL", "EXCHANGE"]);
const MAIL_TYPES = new Set(["DROP", "DEAD"]);

/**
 * Where welcome-mail screenshots land.
 *
 * Written to the local disk, which works for a self-hosted deployment but not
 * on a read-only serverless filesystem. Moving to object storage means
 * changing only this function.
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "trade");

async function storeScreenshot(file: File): Promise<string> {
  if (file.size > MAX_SCREENSHOT_BYTES) throw new Error("TOO_LARGE");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("BAD_TYPE");

  // The client-supplied filename is never used — it can contain path
  // separators, and a name like "../../x" would escape the upload directory.
  const extension = ALLOWED_TYPES.has(file.type) ? (extname(file.name) || ".png") : ".png";
  const safeExtension = /^\.(png|jpe?g|webp)$/i.test(extension) ? extension.toLowerCase() : ".png";
  const name = `${randomBytes(12).toString("hex")}${safeExtension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/trade/${name}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const mode = String(form.get("mode") ?? "");
  const mailType = String(form.get("mailType") ?? "");
  const zalo = String(form.get("zalo") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const hasWelcomeMail = form.get("hasWelcomeMail") === "true";

  if (!MODES.has(mode) || !MAIL_TYPES.has(mailType)) {
    return NextResponse.json({ error: "Vui lòng chọn hình thức và dạng tài khoản" }, { status: 400 });
  }
  // Vietnamese mobile numbers are 10 digits; spaces and dots are common when
  // pasted, so they are stripped before checking rather than rejected.
  const digits = zalo.replace(/[\s.\-()]/g, "");
  if (!/^0\d{9}$/.test(digits)) {
    return NextResponse.json({ error: "Số Zalo phải gồm 10 chữ số, bắt đầu bằng 0" }, { status: 400 });
  }

  let screenshotUrl: string | null = null;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    try {
      screenshotUrl = await storeScreenshot(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return NextResponse.json(
        {
          error:
            message === "TOO_LARGE"
              ? "Ảnh vượt quá 5MB"
              : "Chỉ chấp nhận ảnh PNG, JPG hoặc WebP",
        },
        { status: 400 },
      );
    }
  }

  const created = await db.tradeRequest.create({
    data: {
      code: `TR${randomBytes(3).toString("hex").toUpperCase()}`,
      userId: user.id,
      mode: mode as "SELL" | "EXCHANGE",
      mailType: mailType as "DROP" | "DEAD",
      hasWelcomeMail,
      screenshotUrl,
      zalo: digits,
      note: note || null,
    },
  });

  return NextResponse.json({ code: created.code, status: created.status });
}
