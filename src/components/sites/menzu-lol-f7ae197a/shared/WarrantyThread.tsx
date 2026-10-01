import Image from "next/image";

import type { ChatMessage } from "@/lib/warrantyChat";
import { WARRANTY_STATUS } from "@/lib/warrantyRequests";

/** The report itself, drawn as the first line of the buyer's side. */
export interface ThreadOpening {
  body: string;
  imageUrl: string | null;
  at: string;
  /** ISO — where the status page's poll starts when nothing follows yet. */
  sentAt: string;
}

/**
 * A warranty ticket's conversation, the same on both screens: the viewer's
 * own lines on the right in the accent, the other side's on the left. A desk
 * action's note carries the status it moved the ticket to, under the bubble.
 */
export function WarrantyThread({
  viewer,
  buyerName,
  opening,
  messages,
}: {
  viewer: "buyer" | "shop";
  /** The buyer as the desk knows them; on their own page they are "Bạn". */
  buyerName: string;
  opening: ThreadOpening | null;
  messages: ChatMessage[];
}) {
  const lines = [
    ...(opening
      ? [{ id: "opening", fromShop: false, body: opening.body, imageUrl: opening.imageUrl, at: opening.at, status: null }]
      : []),
    ...messages,
  ];
  if (lines.length === 0) return null;

  // The buyer's pages and the desk each keep their own red.
  const mineTone =
    viewer === "buyer"
      ? "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10"
      : "border-[var(--brand)]/25 bg-[var(--brand)]/10";

  return (
    <ol className="flex flex-col gap-3">
      {lines.map((line) => {
        const mine = (viewer === "shop") === line.fromShop;
        const who = line.fromShop ? "Shop" : viewer === "buyer" ? "Bạn" : buyerName;
        const moved = line.status ? WARRANTY_STATUS[line.status] : null;
        return (
          <li key={line.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            <span className="mb-1 px-1 text-[10.5px] font-semibold text-neutral-500">
              <span className="text-neutral-300">{who}</span> · {line.at}
            </span>
            <div
              className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed text-neutral-100 sm:max-w-[75%] ${
                mine ? `rounded-tr-md ${mineTone}` : "rounded-tl-md border-white/10 bg-white/[0.04]"
              }`}
            >
              {line.body ? <p className="whitespace-pre-line break-words">{line.body}</p> : null}
              {line.imageUrl ? (
                <a
                  href={line.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`block overflow-hidden rounded-lg border border-white/10 ${line.body ? "mt-2" : ""}`}
                >
                  <Image
                    src={line.imageUrl}
                    alt="Ảnh đính kèm"
                    width={480}
                    height={270}
                    unoptimized
                    className="max-h-[220px] w-full max-w-[280px] object-cover"
                  />
                </a>
              ) : null}
            </div>
            {moved ? (
              <span className="mt-1 inline-flex items-center gap-1.5 px-1 text-[10.5px] text-neutral-500">
                Chuyển sang
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-px text-[9.5px] font-black uppercase tracking-wider ${moved.tile}`}
                >
                  {moved.label}
                </span>
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
