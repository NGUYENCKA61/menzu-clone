import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { rewardApprovedReview } from "@/lib/reviewReward";
import { REVIEW_POINTS } from "@/lib/spin";
import { notifyReviewRewardOnTelegram } from "@/lib/telegramShop";

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
    approved?: boolean;
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

  // Approval publishes a visitor submission to /feedback and the homepage;
  // rejecting is the delete above, so there is no "unapprove" limbo state.
  if (typeof body?.approved === "boolean") {
    const updated = await db.feedback.update({
      where: { id },
      data: { approved: body.approved },
    });
    // An approved review written from an order earns its points, once (the
    // owner, 07/10/2026: "chỉ đánh giá khi mua xong mới được cộng điểm").
    // The buyer hears it quietly: a notice in their list, and Telegram if
    // linked. Neither can fail the approval, which has already happened.
    const reward = updated.approved ? await rewardApprovedReview(id) : null;
    if (reward) {
      await announceToUser(reward.userId, {
        title: "Đánh giá của bạn đã được duyệt",
        body: `Cảm ơn bạn đã đánh giá đơn ${reward.orderCode}. Bạn được cộng ${REVIEW_POINTS} điểm thưởng.`,
        type: "GIFT",
      });
      await notifyReviewRewardOnTelegram(reward.userId, REVIEW_POINTS, reward.orderCode);
    }
    return NextResponse.json({
      id: updated.id,
      approved: updated.approved,
      rewarded: reward ? REVIEW_POINTS : 0,
    });
  }

  const updated = await db.feedback.update({
    where: { id },
    data: { verified: Boolean(body?.verified) },
  });
  return NextResponse.json({ id: updated.id, verified: updated.verified });
}
