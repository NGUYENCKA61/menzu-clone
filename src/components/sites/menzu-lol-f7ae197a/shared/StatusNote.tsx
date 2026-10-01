import type { ReactNode } from "react";

import { parseStatusNote, type NoteSpan } from "@/lib/statusNote";

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/g;

/**
 * Web addresses made pressable, as a Telegram post shows them. Only http(s)
 * addresses are matched, so nothing but a web page can come of a press; a
 * full stop or bracket closing the sentence stays text. The links wear the
 * wiki's link red.
 */
function withLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const start = match.index ?? 0;
    const href = match[0].replace(/[.,;:!?)\]}»"']+$/, "");
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-[#ff6c88] underline underline-offset-2 transition-colors hover:text-white"
      >
        {href}
      </a>,
    );
    last = start + href.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Spans({ spans }: { spans: NoteSpan[] }) {
  return spans.map((span, index) =>
    span.bold ? (
      <strong key={index} className="font-bold text-neutral-100">
        {withLinks(span.text)}
      </strong>
    ) : (
      <span key={index}>{withLinks(span.text)}</span>
    ),
  );
}

/**
 * A status note as the shop formatted it (lib/statusNote): paragraphs, bold
 * words, dash lists and links, in the card's grey with the bold a step
 * brighter. Rendered as elements — the note never reaches the page as HTML.
 */
export function StatusNote({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {parseStatusNote(text).map((block, index) =>
        block.kind === "list" ? (
          <ul key={index} className="space-y-0.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="relative pl-3.5 before:absolute before:left-0.5 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-neutral-500"
              >
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Spans spans={line} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
