import { getAdmin } from "@/lib/admin";
import { assistantConfigured } from "@/lib/assistant";
import { getBioProfile } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";

import { SupportWidget } from "./SupportWidget";

/**
 * Server wrapper that feeds the bottom-right widget.
 *
 * An admin gets no corner widget. Customer care went first (the owner,
 * 13/10/2026: "Với tài khoản admin bỏ qua phần chăm sóc khách hàng chat mà
 * thay vào đó là phần nhắn tin trao đổi khách hàng về bảo hành"), and the
 * warranty inbox that took its place went too (17/10/2026: "ở ba bản xóa
 * cái ô tròn tin nhắn bảo hành số 13 ấy"): the buyers' warranty messages
 * are answered on each ticket in /admin. AdminWarrantyInbox stays in the
 * tree, unmounted, should it come back. Decided with the same check every
 * admin route makes (getAdmin reads the role from the database), and the
 * session read is shared with the header's.
 *
 * Everyone else gets the support widget exactly as before. Only the first
 * /bio panel's links are used — those are the direct-contact rows. The second
 * panel holds community group invites, which are not one-to-one support and
 * would make the widget a list of chatrooms.
 *
 * Whether the assistant answers is decided here rather than in the browser:
 * it turns on the moment the shop puts a Claude key in the environment or a
 * free service's key into Cấu hình, and the key itself never leaves the
 * server.
 */
export async function SupportWidgetHost() {
  if (await getAdmin()) return null;

  const [profile, settings] = await Promise.all([getBioProfile(), getShopSettings()]);
  const channels =
    profile?.links
      .filter((link) => link.page === 1)
      .map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        iconUrl: link.iconUrl,
      })) ?? [];

  const assistant = assistantConfigured(settings);

  // Nothing to offer: no assistant to ask and nobody to message. A tab that
  // opens an empty panel is worse than no tab.
  if (!assistant && channels.length === 0) return null;

  return (
    <SupportWidget
      channels={channels}
      assistant={assistant}
      // The same name and mark the header wears, read from the same settings:
      // a panel with its own copy would keep calling the shop by its old name
      // the day it is renamed.
      brand={{ name: settings.brandName, logo: settings.brandLogo }}
    />
  );
}
