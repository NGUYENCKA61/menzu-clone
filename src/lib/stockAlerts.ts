import "server-only";

import { db } from "@/lib/db";
import { emailBrand } from "@/lib/emailBrand";
import { adminAlertMail, escapeHtml, type EmailBrand } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mailer";
import { absoluteUrl } from "@/lib/seo";
import { lowStockRecipients, mailEnabled, type ShopSettings } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";

/**
 * Telling the desk a shelf is running out, before a buyer finds out instead.
 *
 * A tier's shelf is its AVAILABLE licence keys — the same rows whether the
 * product is a tool selling keys or an "acc random" listing selling sign-ins,
 * so one warning covers both. The count that matters is per tier, not per
 * product: a tool with a full month shelf and an empty one-day shelf is out
 * of stock for everyone who wanted a day.
 *
 * Two messages per shelf, not a running commentary: one when the count first
 * falls to the threshold, one when it reaches zero. `lowStockNotifiedCount`
 * on the tier records which of the two has gone out; adding keys clears it,
 * so the next slide down is announced again.
 *
 * Two routes out, Telegram and email, because they fail for different reasons
 * — a bot removed from the channel, an SMTP password changed — and a warning
 * nobody receives is worse than no warning at all, since the shop believes it
 * is being watched. If every route fails the mark is put back, so the next
 * sale tries again rather than the shelf going quiet for good.
 *
 * Nothing here throws to its caller. This runs after the sale has been
 * committed and the buyer has their key: a warning that cannot be delivered
 * must not turn a finished purchase into an error.
 */

/** One shelf that has just run low, in the words both messages are built from. */
interface Warning {
  /** The product as the shop knows it. */
  name: string;
  /** The tier, left out for a pooled listing which has only the one. */
  tier: string | null;
  /** How many are left; 0 is the shelf-is-empty warning. */
  left: number;
  /** "key" or "tài khoản". */
  word: string;
  /** Where the desk goes to paste more in. */
  href: string;
}

function describe(warning: Warning): string {
  const what = warning.tier ? `${warning.name} · gói ${warning.tier}` : warning.name;
  return warning.left === 0
    ? `${what}, đã hết ${warning.word}`
    : `${what}, còn ${warning.left} ${warning.word}`;
}

/** The Telegram message: the desk reads this on a phone, so it stays short. */
function telegramText(warnings: Warning[], threshold: number): string {
  const lines = [`<b>KHO SẮP HẾT HÀNG</b> · ngưỡng ${threshold}`, ""];
  for (const warning of warnings) {
    lines.push(
      `${warning.left === 0 ? "🛑" : "⚠️"} ${escapeTelegramHtml(describe(warning))}`,
      `🔗 ${warning.href}`,
    );
  }
  return lines.join("\n");
}

/** The same news as an email, for whoever reads a mailbox rather than a chat. */
function mailBody(
  warnings: Warning[],
  threshold: number,
  brand: EmailBrand,
): { text: string; html: string } {
  // "Hết sạch" when every shelf named is at zero; "dưới ngưỡng" otherwise, so
  // the first line agrees with the title (the owner, 21/10/2026).
  const allOut = warnings.every((warning) => warning.left === 0);
  const what = allOut ? "hết sạch key" : "xuống dưới ngưỡng cảnh báo";
  const intro =
    warnings.length === 1
      ? `Một gói trong kho vừa ${what}.`
      : `${warnings.length} gói trong kho vừa ${what}.`;
  const text = [
    intro,
    `Ngưỡng đang đặt: còn ${threshold} trở xuống thì báo.`,
    "",
    ...warnings.flatMap((warning) => [`- ${describe(warning)}`, `  Nhập thêm: ${warning.href}`]),
    "",
    "Tin này gửi một lần cho mỗi gói, và một lần nữa khi gói hết sạch.",
    "Nhập thêm hàng là cảnh báo tự đặt lại.",
  ].join("\n");

  // One row per shelf: what ran low, and the page that restocks it.
  const rows = warnings
    .map(
      (warning) =>
        `<tr><td style="padding:12px 14px;border:1px solid #ebebef;border-radius:10px;font:400 14px/1.5 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16161b;">` +
        `<strong>${escapeHtml(describe(warning))}</strong><br>` +
        `<a href="${escapeHtml(warning.href)}" style="color:#E13D3F;font-weight:700;text-decoration:none;">Nhập thêm</a></td></tr>` +
        `<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`,
    )
    .join("");
  const html = adminAlertMail({
    brand,
    subject: mailSubject(warnings),
    title: allOut
      ? "Gói đã hết key"
      : warnings.some((warning) => warning.left === 0)
        ? "Kho có gói đã hết"
        : "Kho sắp hết hàng",
    lines: [intro, `Ngưỡng đang đặt: còn ${threshold} trở xuống thì báo.`],
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`,
    cta: { href: absoluteUrl("/admin/products"), label: "Mở kho trong admin" },
    note: "Tin này gửi một lần cho mỗi gói, và một lần nữa khi gói hết sạch. Nhập thêm hàng là cảnh báo tự đặt lại.",
  });
  return { text, html };
}

/** The subject line names the shelf when there is only one to name. */
function mailSubject(warnings: Warning[]): string {
  if (warnings.length === 1) {
    const only = warnings[0]!;
    return only.left === 0
      ? `Hết ${only.word}: ${describe(only).replace(`, đã hết ${only.word}`, "")}`
      : `Sắp hết ${only.word}: ${describe(only)}`;
  }
  return `${warnings.length} gói sắp hết hàng`;
}

/** True when at least one route actually carried the news. */
async function deliver(
  settings: ShopSettings,
  warnings: Warning[],
  threshold: number,
): Promise<boolean> {
  let delivered = false;

  if (settings.telegramBotToken.trim() && settings.telegramChatId.trim()) {
    try {
      await notifyTelegramAdmins(telegramText(warnings, threshold));
      delivered = true;
    } catch (error) {
      console.error("[stock] telegram warning failed:", error);
    }
  }

  const recipients = lowStockRecipients(settings);
  if (recipients.length > 0 && mailEnabled(settings)) {
    const body = mailBody(warnings, threshold, emailBrand(settings));
    try {
      await sendMail(
        settings,
        recipients.join(", "),
        mailSubject(warnings),
        body.text,
        body.html,
      );
      delivered = true;
    } catch (error) {
      console.error("[stock] email warning failed:", error);
    }
  }

  return delivered;
}

/**
 * Warns about any of these tiers that has just run low, and marks it so the
 * same warning does not go out twice. Call it with the tiers a sale drew
 * from, AFTER the transaction has committed.
 */
export async function alertLowStock(packageIds: string[]): Promise<void> {
  const ids = [...new Set(packageIds.filter(Boolean))];
  if (ids.length === 0) return;

  try {
    const settings = await getShopSettings();
    const threshold = Math.floor(settings.lowStockThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return;

    // No route out, nobody to tell. The marks are left alone on purpose: the
    // day the shop connects a bot or an address, the next sale below the line
    // still warns, rather than the shelves being silently pre-marked.
    const hasTelegram = Boolean(
      settings.telegramBotToken.trim() && settings.telegramChatId.trim(),
    );
    const hasMail = lowStockRecipients(settings).length > 0 && mailEnabled(settings);
    if (!hasTelegram && !hasMail) return;

    const rows = await db.productPackage.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        label: true,
        lowStockNotifiedCount: true,
        product: { select: { code: true, name: true, accountPool: true } },
        _count: { select: { licenseKeys: { where: { status: "AVAILABLE" } } } },
      },
    });

    const warnings: Warning[] = [];
    /** What each claimed mark held before, so a failed send can hand it back. */
    const claimed: { id: string; was: number | null }[] = [];

    for (const row of rows) {
      const left = row._count.licenseKeys;
      if (left > threshold) continue;

      // The mark is claimed before the message is written, with the condition
      // in the WHERE: two sales finishing in the same instant both see "2 keys
      // left", and only the one whose update matched a row gets to speak.
      const first = row.lowStockNotifiedCount === null;
      const result = first
        ? await db.productPackage.updateMany({
            where: { id: row.id, lowStockNotifiedCount: null },
            data: { lowStockNotifiedCount: left },
          })
        : left === 0
          ? await db.productPackage.updateMany({
              where: { id: row.id, lowStockNotifiedCount: { gt: 0 } },
              data: { lowStockNotifiedCount: 0 },
            })
          : { count: 0 };
      if (result.count === 0) continue;

      claimed.push({ id: row.id, was: row.lowStockNotifiedCount });
      const isPool = row.product.accountPool;
      warnings.push({
        name: row.product.name ?? row.product.code,
        tier: isPool ? null : row.label,
        left,
        word: isPool ? "tài khoản" : "key",
        href: absoluteUrl(
          isPool
            ? `/admin/products/${row.product.code}`
            : `/admin/products/${row.product.code}/packages`,
        ),
      });
    }

    if (warnings.length === 0) return;

    if (!(await deliver(settings, warnings, threshold))) {
      // Every route refused. Put the marks back so the next sale tries again:
      // a shelf that quietly stops warning is the one failure this feature
      // exists to prevent.
      await Promise.all(
        claimed.map((mark) =>
          db.productPackage.updateMany({
            where: { id: mark.id },
            data: { lowStockNotifiedCount: mark.was },
          }),
        ),
      );
    }
  } catch (error) {
    // The sale already went through; a warning that failed is a log line.
    console.error("[stock] low-stock warning failed:", error);
  }
}

/**
 * Forgets a tier's warning once its shelf is comfortable again, so the next
 * slide down is announced. Called where keys are added, which is the only way
 * a shelf grows.
 */
export async function clearLowStockMark(packageId: string): Promise<void> {
  try {
    const settings = await getShopSettings();
    const threshold = Math.floor(settings.lowStockThreshold);
    const left = await db.licenseKey.count({
      where: { packageId, status: "AVAILABLE" },
    });
    // Still below the line: the desk has been told and is standing in front of
    // the shelf. Clearing here would warn them about what they are looking at.
    if (Number.isFinite(threshold) && threshold > 0 && left <= threshold) return;
    await db.productPackage.updateMany({
      where: { id: packageId, lowStockNotifiedCount: { not: null } },
      data: { lowStockNotifiedCount: null },
    });
  } catch (error) {
    console.error("[stock] clearing the low-stock mark failed:", error);
  }
}
