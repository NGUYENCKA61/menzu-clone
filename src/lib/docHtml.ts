import sanitizeHtml from "sanitize-html";

import { youtubeEmbedUrl, youtubeVideoId } from "@/lib/youtube";

/**
 * The wiki's HTML era, kept on a leash.
 *
 * TipTap saves article bodies as HTML. Everything that touches that HTML goes
 * through here: the API sanitizes on the way into the database, the public
 * renderer sanitizes again on the way out (defense in depth — a row edited by
 * hand in the database still cannot ship a script to visitors).
 *
 * Legacy bodies predate the editor and are plain text; `isHtmlBody` is the
 * fork every reader uses, and `plainToDocHtml` lifts one into HTML the first
 * time an admin opens it in the editor.
 */

/** The colors the palette buttons write — anything else is stripped. */
const COLOR_VALUE = [/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i, /^rgba?\([\d\s.,%]+\)$/i];

/** A width the editor's size box can write: a whole or decimal percent. */
const WIDTH_PERCENT = [/^(?:100|[1-9]?\d)(?:\.\d+)?%$/];
/** The margins the editor's left / right alignment writes. */
const SIDE_MARGIN = [/^(?:0(?:px)?|auto)$/];

/**
 * Whether an inline colour would vanish on the shop's near-black page.
 *
 * The old site was white, and 15 of its 40 product write-ups carry
 * <span style="color:#000000"> runs — black ink that here prints at 1.03:1,
 * invisible but for the link underline. A colour that dark is dropped and
 * the span falls back to the page's own; the palette colours the editor
 * writes are all far brighter than the line.
 */
function tooDarkToRead(value: string): boolean {
  const v = value.trim().toLowerCase();
  let r: number, g: number, b: number;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.split("").map((c) => c + c).join("") : hex[1]!;
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  } else if (rgb) {
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else {
    return false;
  }
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.1;
}

/** Strips a too-dark colour out of a style attribute, keeping the rest. */
function dropDarkInk(style: string | undefined): string | undefined {
  if (!style) return style;
  const kept = style
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const [prop, ...rest] = decl.split(":");
      return !(prop?.trim().toLowerCase() === "color" && tooDarkToRead(rest.join(":")));
    });
  return kept.length ? kept.join("; ") : undefined;
}

export function isHtmlBody(body: string | null | undefined): body is string {
  return typeof body === "string" && body.trimStart().startsWith("<");
}

/**
 * Newline sequences from the old site arrived with their backslashes
 * stripped: "\r\n" became the two letters "rn", and "rnrn" sat between
 * paragraphs as visible text on 22 of 33 products. A run of "rn" that is
 * not part of a word is a lost line break, and is put back as one — the
 * sanitizer then treats it as whitespace, the plain-text voice as a space.
 */
export function stripNewlineArtifacts(text: string): string {
  return text.replace(/(?<![\p{L}\p{N}])(?:rn)+(?![\p{L}\p{N}])/gu, "\n");
}

export function sanitizeDocHtml(html: string): string {
  return sanitizeHtml(stripNewlineArtifacts(html), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "span",
      "blockquote",
      "pre",
      "code",
      "figure",
      "figcaption",
      // The editor's video block: an empty div naming a YouTube id, which
      // embedVideos turns into the player. The iframe itself is never kept.
      "div",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt", "style"],
      span: ["style"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      figcaption: ["style"],
      div: ["data-youtube", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      // Up to 20px, on a 14px page. The old site's write-ups carry 24px
      // and 28px spans that on a phone read as a shout; past the cap the
      // size is dropped and the span falls back to the page's own.
      span: { color: COLOR_VALUE, "font-size": [/^(?:1[2-9]|20)px$/] },
      // The editor's size and alignment controls, nothing else.
      img: {
        width: WIDTH_PERCENT,
        height: [/^\d{2,4}px$/],
        "margin-left": SIDE_MARGIN,
        "margin-right": SIDE_MARGIN,
      },
      // A video block sizes and leans exactly as a picture does.
      div: {
        width: WIDTH_PERCENT,
        "margin-left": SIDE_MARGIN,
        "margin-right": SIDE_MARGIN,
      },
      p: { "text-align": [/^(?:left|center|right|justify)$/] },
      h2: { "text-align": [/^(?:left|center|right|justify)$/] },
      h3: { "text-align": [/^(?:left|center|right|justify)$/] },
      figcaption: { "font-style": [/^(?:italic|normal)$/] },
    },
    // Illustrations come from this shop's own uploader; an <img> aimed at
    // another host is dropped whole rather than fetched by every reader. A
    // video block whose id is not a YouTube id goes the same way, rather than
    // reaching the page as an empty frame.
    exclusiveFilter: (frame) =>
      (frame.tag === "img" && !String(frame.attribs?.src ?? "").startsWith("/")) ||
      (frame.tag === "div" &&
        frame.attribs?.["data-youtube"] !== undefined &&
        youtubeVideoId(frame.attribs["data-youtube"]) !== frame.attribs["data-youtube"]),
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      // Runs before the style filter, so it sees the raw attribute and can
      // take the black ink out while leaving a font-size beside it alone.
      span: (tagName, attribs) => {
        const style = dropDarkInk(attribs.style);
        const { style: _dropped, ...rest } = attribs;
        void _dropped;
        return { tagName, attribs: style ? { ...rest, style } : rest };
      },
    },
  });
}

/**
 * A paragraph holding nothing but one address: typed as text, or wrapped in
 * the link the editor makes of a pasted URL. Group 1 is the link's words,
 * group 2 the bare text.
 */
const LONE_ADDRESS = /<p(?:\s[^>]*)?>\s*(?:<a\s[^>]*>([^<]*)<\/a>|([^<\s]+))\s*<\/p>/g;

/** Reads as a YouTube address, as opposed to merely parsing as a video id. */
const YOUTUBE_ADDRESS = /youtu\.be\/|youtube(?:-nocookie)?\.com\//i;

/**
 * The editor's video block as the sanitizer leaves it: an empty div, its
 * attributes in group 1. Whether it is a video is read off `data-youtube`.
 */
const EMPTY_DIV = /<div\b([^>]*)>\s*<\/div>/g;

/**
 * The player, built here around an id rather than kept from the database.
 * `style` is the block's own width and margins, already cut down by the
 * sanitizer to what the editor's size and alignment controls write.
 */
function player(src: string, style?: string): string {
  return (
    `<div class="doc-video"${style ? ` style="${style}"` : ""}>` +
    `<iframe src="${src}" title="Video YouTube" loading="lazy"` +
    ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"` +
    ` referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
  );
}

/**
 * YouTube videos, played in place. Two ways in, both run after sanitizing:
 *
 * - The editor's video block (the "Video" button): an empty div naming the
 *   video's id, sized and aligned the way pictures are. It becomes the
 *   player at the width and on the side the shop chose.
 * - A YouTube link alone on its line, the older way, which still works: the
 *   paragraph becomes the player at the default width. A link inside a
 *   sentence, or under words of its own, stays a link.
 *
 * The sanitizer takes every iframe out, so no embed code from the database
 * ever reaches a page: an iframe kept from there would be a door any page on
 * the internet could come through. The player is built here around the id —
 * the one thing taken from the stored HTML, and only as the eleven safe
 * characters youtubeVideoId lets through.
 *
 * A pasted address has to read as YouTube's: youtubeEmbedUrl also accepts a
 * bare id, and "Configuring" alone on a line is eleven letters, not a video.
 */
export function embedVideos(html: string): string {
  return html
    .replace(EMPTY_DIV, (whole, attrs: string) => {
      const id = /data-youtube="([^"]*)"/.exec(attrs)?.[1];
      if (id === undefined) return whole;
      // A block the sanitizer somehow let through with a bad id plays
      // nothing rather than an empty frame.
      if (youtubeVideoId(id) !== id) return "";
      return player(youtubeEmbedUrl(id)!, /style="([^"]*)"/.exec(attrs)?.[1]);
    })
    .replace(LONE_ADDRESS, (whole, linkWords?: string, bare?: string) => {
      const text = (linkWords ?? bare ?? "").replace(/&amp;/g, "&").trim();
      if (!YOUTUBE_ADDRESS.test(text)) return whole;
      const src = youtubeEmbedUrl(text);
      return src ? player(src) : whole;
    });
}

/** True when the HTML says nothing — no text, no picture. TipTap's idea of an
 *  empty document is "<p></p>", which must store as null, not as a blank page
 *  Google would index. */
export function docHtmlIsEmpty(html: string): boolean {
  // A picture or a video block is content though it holds no words.
  if (/<img[\s>]|data-youtube=/i.test(html)) return false;
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/&nbsp;|\s/g, "").length === 0;
}

/** A legacy plain-text body, lifted into the editor's dialect: blank lines
 *  become paragraph breaks, everything else is escaped verbatim. */
export function plainToDocHtml(plain: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return plain
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** The HTML body reduced to running text — for the places that print a
 *  sentence, not a page: meta descriptions, the buy panel's blurb, list
 *  cards. Tags go, entities come back as characters, whitespace collapses;
 *  `maxLength` trims with an ellipsis when the prose runs long. */
export function docHtmlToPlainText(html: string, maxLength?: number): string {
  // A block boundary is a word boundary. Dropping the tags without leaving a
  // space behind runs a heading straight into the paragraph under it —
  // "Tính năng nổi bậtAimbot mượt" — and that string is what a search result,
  // an OG card and a product tile all print.
  const spaced = stripNewlineArtifacts(html).replace(
    /<br\s*\/?>|<\/(?:p|h[1-6]|li|ul|ol|blockquote|div|figure|figcaption|pre|tr|td|th)>/gi,
    " ",
  );
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength && text.length > maxLength) {
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return text;
}
