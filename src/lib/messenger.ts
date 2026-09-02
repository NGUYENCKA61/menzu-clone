/**
 * Reading the shop's /bio rows as places to send a message, not places to look.
 *
 * The shop keeps one address per channel, in the /bio rows, and a Facebook one
 * points at the page — which is where you go to read it, not where you go to
 * talk to it. Chat lives on m.me, and the handle is the same handle, so the
 * shop should not have to store the address twice and keep the two in step by
 * hand. A Zalo row needs no translation, only recognising.
 *
 * Anything that is not a person or a page to message returns null: a group, a
 * post, a share link. The caller then simply has no button for that channel,
 * which is the honest outcome — better than one that opens a chat with nobody.
 */

/** Hosts that carry Facebook handles. */
const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "web.facebook.com",
  "m.facebook.com",
  "fb.com",
  "www.fb.com",
]);

/** Paths that are Facebook but never a conversation. */
const NOT_A_CHAT = new Set([
  "groups",
  "share",
  "sharer.php",
  "events",
  "watch",
  "marketplace",
  "photo.php",
  "permalink.php",
  "story.php",
]);

/**
 * The m.me address for a Facebook link, or null when there is none.
 *
 * Numeric ids are handles too — `profile.php?id=…` and the trailing id in
 * `/people/Name/…` both address the same inbox as a vanity name would.
 */
export function messengerUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  // Already a chat link: normalised rather than rejected, so a shop that
  // pasted m.me into the bio row gets the tab too.
  if (host === "m.me" || host === "www.m.me") {
    return segments.length === 1 ? `https://m.me/${segments[0]}` : null;
  }

  if (!FACEBOOK_HOSTS.has(host)) return null;
  if (segments.length === 0) return null;
  if (NOT_A_CHAT.has(segments[0])) return null;

  if (segments[0] === "profile.php") {
    const id = parsed.searchParams.get("id") ?? "";
    return /^\d+$/.test(id) ? `https://m.me/${id}` : null;
  }

  // /people/Ten-Shop/61550000000000 and /pages/Ten/1000000 — the id is last.
  if (segments[0] === "people" || segments[0] === "pages") {
    const id = segments[segments.length - 1];
    return /^\d+$/.test(id) ? `https://m.me/${id}` : null;
  }

  // One segment and nothing after it is a handle. Two means a page *and* a
  // section of it (/menzu/reviews), which is a page to read, not an inbox.
  if (segments.length !== 1) return null;

  const handle = segments[0];
  return /^[A-Za-z0-9.-]{2,}$/.test(handle) ? `https://m.me/${handle}` : null;
}

/** Hosts that carry a Zalo conversation. */
const ZALO_HOSTS = new Set(["zalo.me", "www.zalo.me", "chat.zalo.me"]);

/**
 * The Zalo conversation for a link, or null when there is none.
 *
 * Nothing is translated here, unlike Facebook: the address the shop puts on
 * /bio already opens the chat. The work is deciding whether a row *is* one —
 * the shop keeps its community rooms on the same host, and `/g/<id>` is a box
 * full of other customers rather than the shop's own inbox.
 */
export function zaloChat(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!ZALO_HOSTS.has(host)) return null;

  // chat.zalo.me/?phone=… is already pointed at one conversation, but only
  // once it actually names the number.
  if (host === "chat.zalo.me") {
    const phone = parsed.searchParams.get("phone") ?? "";
    return /^\d{6,15}$/.test(phone) ? `https://chat.zalo.me/?phone=${phone}` : null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  // /g/<id> is a group invite; the support row is a person to talk to.
  if (segments[0] === "g") return null;
  if (segments.length !== 1) return null;

  const handle = segments[0];
  return /^[A-Za-z0-9._-]{4,}$/.test(handle) ? `https://zalo.me/${handle}` : null;
}

/**
 * The first channel in the list a given reader can turn into a conversation.
 *
 * First rather than best on purpose: the shop orders these rows itself on the
 * /bio editor, and the one it put at the top is the one it wants answered.
 */
function pickBy<T extends { url: string }>(
  channels: readonly T[],
  read: (url: string) => string | null,
): (T & { chatUrl: string }) | null {
  for (const channel of channels) {
    const chatUrl = read(channel.url);
    if (chatUrl) return { ...channel, chatUrl };
  }
  return null;
}

/** The shop's Facebook row, as an inbox. */
export function pickMessenger<T extends { url: string }>(
  channels: readonly T[],
): (T & { chatUrl: string }) | null {
  return pickBy(channels, messengerUrl);
}

/** The shop's Zalo row, as an inbox. */
export function pickZalo<T extends { url: string }>(
  channels: readonly T[],
): (T & { chatUrl: string }) | null {
  return pickBy(channels, zaloChat);
}
