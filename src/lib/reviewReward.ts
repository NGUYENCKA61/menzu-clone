import { db } from "@/lib/db";
import { REVIEW_POINTS } from "@/lib/spin";

/**
 * Pays an approved review its points, once.
 *
 * Only a review written from an order earns them: the order is the proof the
 * reviewer bought what they are reviewing, which a free-form review on
 * /feedback cannot show. The claim is the `rewardedAt` stamp, taken in the
 * same transaction as the credit and only while it is still empty, so a
 * second approval, a double click or two admins at once still pay a single
 * time.
 *
 * Returns who was paid and for which order, or null when nothing was owed
 * (not approved, not order-backed, no account, or already paid).
 */
export async function rewardApprovedReview(
  feedbackId: string,
): Promise<{ userId: string; orderCode: string } | null> {
  return db.$transaction(async (tx) => {
    const claimed = await tx.feedback.updateMany({
      where: {
        id: feedbackId,
        approved: true,
        rewardedAt: null,
        orderId: { not: null },
        userId: { not: null },
      },
      data: { rewardedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    const row = await tx.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
      select: { userId: true, order: { select: { code: true } } },
    });
    // Checked non-null by the claim above.
    const userId = row.userId!;
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: REVIEW_POINTS } },
    });
    return { userId, orderCode: row.order?.code ?? "" };
  });
}
