import { db } from "@/lib/db";
import { TOPUP_EXPIRY_MINUTES } from "@/lib/topup";

/**
 * The bank request this account still has open, if any: waiting, and inside
 * its hold window.
 *
 * One at a time, on the website and on the Telegram bot alike (the owner,
 * 29/09/2026: "nếu họ còn đơn nạp tiền chưa xử lý thì không được phép tạo
 * thêm"). A second invoice while one is unpaid only leaves the customer
 * unsure which one to pay, and the desk with two notes for one transfer.
 *
 * The window, not the status alone: a request is only marked EXPIRED when a
 * reconciliation pass sweeps it, and one waiting for that sweep must not lock
 * the customer out. Past the window it no longer blocks — it is overdue, and
 * still credits if the money turns up.
 *
 * Cards are not limited here: several cards are often sent one after another,
 * and each is its own request the desk checks on its own.
 *
 * In its own module because both the top-up route and telegramShop need it,
 * and topupStore already imports telegramShop.
 */
export async function openBankTopUp(
  userId: string,
): Promise<{ code: string; amount: bigint; createdAt: Date } | null> {
  const since = new Date(Date.now() - TOPUP_EXPIRY_MINUTES * 60 * 1000);
  return db.topUp.findFirst({
    where: { userId, method: "BANK", status: "PENDING", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { code: true, amount: true, createdAt: true },
  });
}
