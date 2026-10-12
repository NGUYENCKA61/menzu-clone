import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * The player a product's demo video gets, from whatever link the shop pasted:
 * YouTube as before, and Kinescope since 12/10/2026 (the owner: "chèn thêm
 * video nhúng kinescope vào để thêm sinh động"). Anything else is null and
 * the page falls back to the pictures, for the same reason youtube.ts gives:
 * the value lands in an iframe src, so an open field would let whoever edits
 * a product frame any page inside the shop.
 */
export type VideoEmbed = {
  provider: "youtube" | "kinescope";
  src: string;
  /** The iframe's allow list, as each player's documentation asks. */
  allow: string;
};

const KINESCOPE_HOSTS = new Set(["kinescope.io", "www.kinescope.io"]);
/** Numeric for older videos (202589431), base-62-ish for newer ones. */
const KINESCOPE_ID = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * The id inside a Kinescope share link (kinescope.io/<id>) or embed link
 * (kinescope.io/embed/<id>); null for anything else.
 */
export function kinescopeVideoId(
  input: string | null | undefined,
): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  // A link only, never a bare id: any short word would pass as one and turn
  // a typo into an empty player instead of the pictures.
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!KINESCOPE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[0] === "embed" ? parts[1] : parts[0];
  return id && KINESCOPE_ID.test(id) ? id : null;
}

export function kinescopeEmbedUrl(
  input: string | null | undefined,
): string | null {
  const id = kinescopeVideoId(input);
  return id ? `https://kinescope.io/embed/${id}` : null;
}

export function videoEmbed(
  input: string | null | undefined,
): VideoEmbed | null {
  const youtube = youtubeEmbedUrl(input);
  if (youtube) {
    return {
      provider: "youtube",
      src: youtube,
      allow:
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    };
  }
  const kinescope = kinescopeEmbedUrl(input);
  if (kinescope) {
    return {
      provider: "kinescope",
      src: kinescope,
      // Kinescope's own list; without it fullscreen, picture-in-picture and
      // DRM playback are refused by the browser.
      allow:
        "autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock",
    };
  }
  return null;
}
