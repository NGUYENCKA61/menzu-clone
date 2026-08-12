import { getBioProfile } from "@/lib/queries";

import { SupportWidget } from "./SupportWidget";

/**
 * Server wrapper that feeds the support widget its channels.
 *
 * Only the first panel's links are used — those are the direct-contact rows.
 * The second panel on /bio holds community group invites, which are not
 * one-to-one support and would make the widget a list of chatrooms.
 */
export async function SupportWidgetHost() {
  const profile = await getBioProfile();
  if (!profile) return null;

  const channels = profile.links
    .filter((link) => link.page === 1)
    .map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      iconUrl: link.iconUrl,
    }));

  if (channels.length === 0) return null;

  return <SupportWidget channels={channels} />;
}
