import "server-only";

import { db } from "@/lib/db";
import { emailBrand } from "@/lib/emailBrand";
import {
  orderReceiptEmail,
  zaloReceiptMessage,
  type ReceiptData,
  type ReceiptLine,
} from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mailer";
import { toolDocsHref } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/** The wiki's "Setup máy chuẩn", which every tool's receipt points at. */
const SETUP_GUIDE_PATH = "/docs/setup-may-chuan-thich-thi-hack";

/**
 * A paid purchase, told to the buyer's mailbox and Zalo (the owner,
 * 14/10/2026: "khi khách hàng mua key thì cũng gửi về gmail khách hàng và
 * zalo"). One message for one checkout, whether it was one order ("Mua
 * ngay", the Telegram bot) or a basket of several.
 *
 * A tool's keys are printed in full; an account's sign-in never is, because
 * it is handed over behind "Lấy thông tin" with the screen recording the
 * account's warranty rests on, and a copy in a mailbox would skip that.
 *
 * Called after the sale has committed and never awaited by it: nothing here
 * may fail or slow a purchase, so every error is logged and swallowed. The
 * email waits for the shop's SMTP in Cấu hình; the Zalo message waits in the
 * outbox until the bot drains it.
 */
export async function sendOrderReceipt(
  orderIds: readonly string[],
): Promise<void> {
  if (orderIds.length === 0) return;
  try {
    const orders = await db.order.findMany({
      where: { id: { in: [...orderIds] }, status: "PAID" },
      orderBy: { createdAt: "asc" },
      select: {
        code: true,
        total: true,
        createdAt: true,
        user: { select: { username: true, email: true, zaloId: true } },
        product: {
          select: {
            name: true,
            code: true,
            slug: true,
            productType: true,
            downloadUrl: true,
            docsUrl: true,
          },
        },
        package: { select: { label: true } },
        licenseKeys: {
          orderBy: { deliveredAt: "asc" },
          select: { value: true, expiresAt: true },
        },
      },
    });
    const first = orders[0];
    if (!first) return;
    const { user } = first;
    if (!user.email && !user.zaloId) return;

    const settings = await getShopSettings();
    const lines: ReceiptLine[] = orders.map((order) => {
      const software = order.product.productType === "SOFTWARE_GAME";
      return {
        orderCode: order.code,
        productName: order.product.name ?? order.product.code,
        packageLabel: software ? (order.package?.label ?? null) : null,
        kind: software ? "software" : "account",
        keys: software ? order.licenseKeys : [],
        total: Number(order.total),
        links: {
          order: absoluteUrl(`/orders?don=${encodeURIComponent(order.code)}`),
          download:
            software && order.product.downloadUrl
              ? absoluteUrl(order.product.downloadUrl)
              : null,
          docs: software
            ? absoluteUrl(
                order.product.docsUrl ?? toolDocsHref(order.product.slug),
              )
            : null,
          warranty: absoluteUrl(
            `/orders/${encodeURIComponent(order.code)}/bao-hanh`,
          ),
        },
      };
    });
    const data: ReceiptData = {
      brand: emailBrand(settings),
      username: user.username,
      paidAt: first.createdAt,
      lines,
      ordersUrl: absoluteUrl(
        orders.length === 1
          ? `/orders?don=${encodeURIComponent(first.code)}`
          : "/orders",
      ),
      setupGuideUrl: absoluteUrl(SETUP_GUIDE_PATH),
    };

    if (user.email && mailEnabled(settings)) {
      const mail = orderReceiptEmail(data);
      await sendMail(
        settings,
        user.email,
        mail.subject,
        mail.text,
        mail.html,
      ).catch((error: unknown) =>
        console.error("[receipt] email failed:", error),
      );
    }

    if (user.zaloId) {
      const message = zaloReceiptMessage(data);
      await db.zaloOutbox.create({
        data: {
          zaloId: user.zaloId,
          text: message.text,
          styles: message.styles,
        },
      });
    }
  } catch (error) {
    console.error("[receipt] failed:", error);
  }
}
