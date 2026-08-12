import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

import { SiteHeaderClient } from "./SiteHeaderClient";

/**
 * Server wrapper so the header renders the signed-in state on the first paint.
 * Fetching the session client-side would flash the "Đăng nhập" button on every
 * page load for users who are already signed in.
 *
 * Pages import this; the interactive parts live in SiteHeaderClient.
 */
export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);

  return (
    <SiteHeaderClient
      brand={{ name: settings.brandName, logo: settings.brandLogo }}
      user={
        user
          ? {
              username: user.username,
              balance: user.balance,
              avatarUrl: user.avatarUrl,
              uid: user.uid,
              role: user.role,
            }
          : null
      }
    />
  );
}
