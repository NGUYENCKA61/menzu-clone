/**
 * Turning whatever a shop pasted into a YouTube embed URL.
 *
 * The admin field takes a link, not an id: nobody copying a video reaches for
 * the eleven characters in the middle of it, and asking them to would put a
 * parsing job on the one person who cannot debug it.
 *
 * Anything that is not YouTube returns null, and the caller falls back to the
 * product picture. That is the security property as much as the tidiness one —
 * the value ends up inside an `src`, so a field that accepted any URL would let
 * whoever edits a product frame an arbitrary page inside the shop.
 */

/** YouTube ids are always these eleven characters. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
]);

/** Paths that carry the id as their next segment. */
const PATH_FORMS = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/;

function embed(id: string): string {
  // The nocookie host, because this frame sits on a shop page and the ordinary
  // one writes tracking cookies before anybody presses play. `rel=0` keeps the
  // end screen to this channel rather than offering competitors' videos.
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function youtubeEmbedUrl(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  // A bare id — what somebody pastes having copied only part of the URL.
  if (VIDEO_ID.test(raw)) return embed(raw);

  let url: URL;
  try {
    // Tolerating a missing scheme: "youtu.be/xxxx" is what a share sheet gives
    // on some phones, and it is unambiguous enough to accept.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? embed(id) : null;
  }

  if (!HOSTS.has(host)) return null;

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return embed(v);

  const matched = PATH_FORMS.exec(url.pathname);
  return matched ? embed(matched[1]!) : null;
}
