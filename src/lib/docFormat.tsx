import type { ReactNode } from "react";

import { sanitizeDocHtml } from "@/lib/docHtml";

/**
 * The wiki's tiny formatting language, rendered the same way everywhere.
 *
 * Bodies stay plain text in the database — these marks are parsed into React
 * elements, never into HTML strings, so nothing typed into the editor can
 * inject markup into a page every visitor loads.
 *
 * The whole grammar:
 *   **đậm**            → <strong>
 *   *nghiêng*          → <em>
 *   [đỏ]chữ[/đỏ]       → colored span (đỏ / vàng / xanh / tím — fixed palette)
 *   ## Tiêu đề         → <h2>   (alone on its own block)
 *   ### Tiêu đề nhỏ    → <h3>
 *   - mục              → <ul>   (every line of the block starts with "- ")
 *   1. mục             → <ol>   (every line numbered "1." / "2)" …)
 *   ![mô tả](/url)     → <img>  (alone on its own block, local paths only)
 * Blocks are separated by blank lines, exactly as before the marks existed —
 * an article written without any of this renders precisely as it always did.
 */

/** The only colors the marks can name — a palette, not a stylesheet. */
export const DOC_COLORS: Record<string, string> = {
  "đỏ": "text-rose-400",
  "vàng": "text-amber-400",
  "xanh": "text-emerald-400",
  "tím": "text-violet-400",
};

function renderEmphasis(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // ** before *: alternation tries the double first at each position.
  const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      out.push(
        <strong key={`${keyBase}-b${i}`} className="font-bold text-white">
          {match[1]}
        </strong>,
      );
    } else {
      out.push(<em key={`${keyBase}-i${i}`}>{match[2]}</em>);
    }
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Color spans first; bold and italic still work inside them.
  const re = /\[(đỏ|vàng|xanh|tím)\]([\s\S]*?)\[\/\1\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      out.push(...renderEmphasis(text.slice(last, match.index), `${keyBase}-p${i}`));
    }
    out.push(
      <span key={`${keyBase}-c${i}`} className={`font-semibold ${DOC_COLORS[match[1]!]}`}>
        {renderEmphasis(match[2]!, `${keyBase}-ci${i}`)}
      </span>,
    );
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) {
    out.push(...renderEmphasis(text.slice(last), `${keyBase}-t`));
  }
  return out;
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // An illustration on its own block. Local paths only: the editor's uploader
  // mints those, and a mark cannot point readers' browsers at another host.
  const image = lines.length === 1 ? lines[0]!.match(/^!\[([^\]]*)\]\((\/[^)\s]*)\)$/) : null;
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key}
        src={image[2]}
        alt={image[1]}
        loading="lazy"
        className="w-full h-auto rounded-xl border border-white/10"
      />
    );
  }

  if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
    return (
      <ul
        key={key}
        className="list-disc pl-5 space-y-1.5 text-sm text-neutral-300 leading-relaxed marker:text-neutral-500"
      >
        {lines.map((line, index) => (
          <li key={index}>{renderInline(line.slice(2), `${key}-${index}`)}</li>
        ))}
      </ul>
    );
  }

  if (lines.length > 0 && lines.every((line) => /^\d+[.)]\s/.test(line))) {
    return (
      <ol
        key={key}
        className="list-decimal pl-5 space-y-1.5 text-sm text-neutral-300 leading-relaxed marker:text-neutral-500"
      >
        {lines.map((line, index) => (
          <li key={index}>
            {renderInline(line.replace(/^\d+[.)]\s/, ""), `${key}-${index}`)}
          </li>
        ))}
      </ol>
    );
  }

  if (lines.length === 1 && lines[0]!.startsWith("### ")) {
    return (
      <h3 key={key} className="pt-2 text-base font-black text-white">
        {renderInline(lines[0]!.slice(4), String(key))}
      </h3>
    );
  }

  if (lines.length === 1 && lines[0]!.startsWith("## ")) {
    return (
      <h2 key={key} className="pt-2 text-lg font-black text-white">
        {renderInline(lines[0]!.slice(3), String(key))}
      </h2>
    );
  }

  return (
    <p key={key} className="text-sm text-neutral-300 leading-relaxed">
      {renderInline(block, String(key))}
    </p>
  );
}

/**
 * A TipTap-era body: stored as HTML, sanitized again right here before it
 * reaches a reader — the database is not trusted to only hold what the API
 * let through.
 */
export function DocHtml({ body }: { body: string }) {
  return (
    <div className="doc-prose" dangerouslySetInnerHTML={{ __html: sanitizeDocHtml(body) }} />
  );
}

/** A legacy plain-text body (with the light marks), rendered as ever. */
export function DocBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return <div className="space-y-4">{blocks.map((block, index) => renderBlock(block, index))}</div>;
}
