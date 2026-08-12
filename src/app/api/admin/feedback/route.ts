import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Moderates a customer review: mark it verified, or remove it.
 *
 * "Verified" is a claim the shop makes to shoppers about a review being from a
 * real purchase, so only an admin can set it — there is deliberately no path
 * for a reviewer to mark their own.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    verified?: boolean;
    remove?: boolean;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu id đánh giá" }, { status: 400 });

  const existing = await db.feedback.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đánh giá" }, { status: 404 });

  if (body?.remove) {
    await db.feedback.delete({ where: { id } });
    return NextResponse.json({ removed: true });
  }

  const updated = await db.feedback.update({
    where: { id },
    data: { verified: Boolean(body?.verified) },
  });
  return NextResponse.json({ id: updated.id, verified: updated.verified });
}
