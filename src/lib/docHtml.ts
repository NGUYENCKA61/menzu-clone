import sanitizeHtml from "sanitize-html";

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

export function isHtmlBody(body: string | null | undefined): body is string {
  return typeof body === "string" && body.trimStart().startsWith("<");
}

export function sanitizeDocHtml(html: string): string {
  return sanitizeHtml(html, {
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
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt", "style"],
      span: ["style"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      figcaption: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      span: { color: COLOR_VALUE, "font-size": [/^(?:1[2-9]|2[0-8])px$/] },
      // The editor's size and alignment controls, nothing else.
      img: {
        width: [/^(?:100|[1-9]?\d)(?:\.\d+)?%$/],
        height: [/^\d{2,4}px$/],
        "margin-left": [/^(?:0(?:px)?|auto)$/],
        "margin-right": [/^(?:0(?:px)?|auto)$/],
      },
      p: { "text-align": [/^(?:left|center|right|justify)$/] },
      h2: { "text-align": [/^(?:left|center|right|justify)$/] },
      h3: { "text-align": [/^(?:left|center|right|justify)$/] },
      figcaption: { "font-style": [/^(?:italic|normal)$/] },
    },
    // Illustrations come from this shop's own uploader; an <img> aimed at
    // another host is dropped whole rather than fetched by every reader.
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !String(frame.attribs?.src ?? "").startsWith("/"),
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

/** True when the HTML says nothing — no text, no picture. TipTap's idea of an
 *  empty document is "<p></p>", which must store as null, not as a blank page
 *  Google would index. */
export function docHtmlIsEmpty(html: string): boolean {
  if (/<img[\s>]/i.test(html)) return false;
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
  const spaced = html.replace(
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
