/**
 * The light formatting a status note may carry, the way the shop writes its
 * Telegram posts (the owner, 01/10/2026: "định dạng làm mọi thứ đẹp hơn"):
 *
 * - `**words**` is bold;
 * - a line starting with "- " or "• " is a bullet;
 * - a blank line starts a new paragraph;
 * - a web address becomes a link where the note is shown (the page does
 *   that, not this file).
 *
 * Notes are written only by the shop — in the desk, under a hint that names
 * these rules, or in a Telegram command — so a dash turning into a bullet is
 * a rule the writer can see. (Announcements keep their bullets in a field of
 * their own for the opposite reason.) Anything that does not match a rule is
 * text, exactly as typed: an unclosed "**" is two asterisks.
 */

export interface NoteSpan {
  text: string;
  bold: boolean;
}

export type NoteBlock =
  | { kind: "lines"; lines: NoteSpan[][] }
  | { kind: "list"; items: NoteSpan[][] };

const BULLET = /^\s*[-•]\s+/;
const BOLD = /\*\*([^*\n]+?)\*\*/g;

/** One line's bold and plain runs, in order. */
export function noteSpans(line: string): NoteSpan[] {
  const spans: NoteSpan[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD)) {
    const start = match.index ?? 0;
    if (start > last) spans.push({ text: line.slice(last, start), bold: false });
    spans.push({ text: match[1]!, bold: true });
    last = start + match[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last), bold: false });
  return spans;
}

/** The note as paragraphs (runs of lines) and bullet lists. */
export function parseStatusNote(note: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let lines: NoteSpan[][] = [];
  let items: NoteSpan[][] = [];
  const closeLines = () => {
    if (lines.length > 0) blocks.push({ kind: "lines", lines });
    lines = [];
  };
  const closeItems = () => {
    if (items.length > 0) blocks.push({ kind: "list", items });
    items = [];
  };
  for (const raw of note.replace(/\r\n?/g, "\n").split("\n")) {
    if (BULLET.test(raw)) {
      closeLines();
      items.push(noteSpans(raw.replace(BULLET, "").trimEnd()));
    } else if (raw.trim() === "") {
      closeLines();
      closeItems();
    } else {
      closeItems();
      lines.push(noteSpans(raw.trimEnd()));
    }
  }
  closeLines();
  closeItems();
  return blocks;
}

/**
 * The same note as plain text, for a notice body (announcements are plain
 * text by design): the bold markers dropped, bullets drawn as "• ", line
 * breaks kept.
 */
export function statusNoteToPlainText(note: string): string {
  return note
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((raw) => {
      const bullet = BULLET.test(raw);
      const line = (bullet ? raw.replace(BULLET, "") : raw).trimEnd();
      const text = noteSpans(line)
        .map((span) => span.text)
        .join("");
      return bullet ? `• ${text}` : text;
    })
    .join("\n");
}

/** A state's clause ("đang được cập nhật, …"), written to follow a tool's
 *  name, as a sentence of its own. */
export function clauseAsSentence(clause: string): string {
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

/**
 * The same note for a Telegram post in HTML parse mode: escaped by the
 * caller's escaper, bold as <b>, bullets as "• ", blank lines kept.
 * Telegram makes the web addresses into links by itself.
 */
export function statusNoteToTelegramHtml(note: string, escape: (text: string) => string): string {
  return note
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((raw) => {
      const bullet = BULLET.test(raw);
      const line = bullet ? raw.replace(BULLET, "") : raw;
      const html = noteSpans(line.trimEnd())
        .map((span) => (span.bold ? `<b>${escape(span.text)}</b>` : escape(span.text)))
        .join("");
      return bullet ? `• ${html}` : html;
    })
    .join("\n");
}
