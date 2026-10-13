import "server-only";

import type { EmailBrand } from "@/lib/emailTemplates";
import { SITE_URL } from "@/lib/seo";
import type { ShopSettings } from "@/lib/settings";
import { SUPPORT_WINDOW } from "@/lib/supportHours";

/**
 * What every email's band and footer say about the shop, read from Cấu hình.
 * `siteUrl` defaults to the configured address; the reset route passes the
 * request's own origin when that address is a developer's localhost.
 */
export function emailBrand(
  settings: ShopSettings,
  siteUrl: string = SITE_URL,
): EmailBrand {
  return {
    name: settings.brandName,
    siteUrl: siteUrl.replace(/\/+$/, ""),
    supportHours: SUPPORT_WINDOW,
    telegramUrl: settings.contactTelegram.trim() || null,
  };
}
