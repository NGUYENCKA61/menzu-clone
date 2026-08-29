import { assistantConfigured } from "@/lib/assistant";
import { getBioProfile } from "@/lib/queries";

import { SupportWidget } from "./SupportWidget";

/**
 * Server wrapper that feeds the support widget.
 *
 * Only the first /bio panel's links are used — those are the direct-contact
 * rows. The second panel holds community group invites, which are not
 * one-to-one support and would make the widget a list of chatrooms.
 *
 * Whether the assistant answers is decided here rather than in the browser:
 * it turns on the moment the shop puts a key in the environment, and the key
 * itself never leaves the server.
 */
export async function SupportWidgetHost() {
  const profile = await getBioProfile();
  const channels =
    profile?.links
      .filter((link) => link.page === 1)
      .map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        iconUrl: link.iconUrl,
      })) ?? [];

  const assistant = assistantConfigured();

  // Nothing to offer: no assistant to ask and nobody to message. A tab that
  // opens an empty panel is worse than no tab.
  if (!assistant && channels.length === 0) return null;

  return <SupportWidget channels={channels} assistant={assistant} />;
}
