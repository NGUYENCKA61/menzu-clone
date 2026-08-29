import { getShopSettings } from "@/lib/settingsStore";

import { ConnectRail } from "./ConnectRail";

/**
 * The "KẾT NỐI" rail, fed from Cấu hình.
 *
 * The rail itself is a client component — it remembers whether it is collapsed
 * — so it cannot read the database. This wrapper does that on the server and
 * hands it five strings, which is the whole reason it exists: ten pages draw
 * this rail, and threading five props through ten call sites (several of which
 * do not otherwise load settings at all) would put the mapping from settings
 * to rows in ten places instead of one.
 *
 * One extra read of the settings table per page. It is a single unfiltered
 * select over a few dozen rows, and the alternative was ten call sites that
 * each had to know which contact fields the rail wanted.
 */
export async function ConnectRailSection() {
  const settings = await getShopSettings();

  return (
    <ConnectRail
      links={{
        facebookSupport: settings.contactFacebook,
        discord: settings.contactDiscord,
        facebookGroup: settings.contactFacebookGroup,
        zaloGroup: settings.contactZaloGroup,
        telegram: settings.contactTelegram,
      }}
    />
  );
}
