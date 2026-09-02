import { db } from "./db";
import { giftParcelProblem, giftPrizeId } from "./giftParcels";

/**
 * Opens one parcel per reader named on a published gift notice.
 *
 * Called on publish rather than on save: a draft is the shop thinking about
 * it, and a parcel that exists before anyone has been told is a parcel sitting
 * in the queue with nobody coming to address it.
 *
 * Safe to call repeatedly — republishing, or editing and publishing again,
 * finds the rows already there and adds only what is missing, which is exactly
 * what happens when recipients are added to a notice that already went out.
 *
 * @returns how many parcels this call actually opened.
 */
export async function openGiftParcels(announcementId: string): Promise<number> {
  const notice = await db.announcement.findUnique({
    where: { id: announcementId },
    select: {
      id: true,
      type: true,
      audience: true,
      status: true,
      giftLabel: true,
      recipients: { select: { userId: true } },
    },
  });

  if (!notice?.giftLabel) return 0;
  if (notice.status !== "PUBLISHED") return 0;
  if (giftParcelProblem(notice)) return 0;

  const prizeId = giftPrizeId(notice.id);
  const already = await db.spinWin.findMany({
    where: { prizeId },
    select: { userId: true },
  });
  const have = new Set(already.map((row) => row.userId));
  const missing = notice.recipients
    .map((row) => row.userId)
    .filter((userId) => !have.has(userId));

  if (missing.length === 0) return 0;

  await db.spinWin.createMany({
    data: missing.map((userId) => ({
      userId,
      prizeId,
      label: notice.giftLabel!,
      kind: "ITEM",
      status: "PENDING" as const,
    })),
  });

  return missing.length;
}
