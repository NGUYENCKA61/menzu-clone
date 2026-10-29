"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

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
 * Grows with the thread, then scrolls: up to 440px on a phone, where that is
 * already more than half the screen, and 600px from tablet width up, where
 * the page has the room and scrolling twice is the annoyance (the owner,
 * 12/10/2026: "cho thoải mái", "máy tính kìa").
 */
const PAGE_PANE = "max-h-[440px] min-h-[160px] sm:max-h-[600px]";

/** The white desk's status tones; the dark pages keep the lib's own. */
const LIGHT_TILE: Record<string, string> = {
  OPEN: "border-amber-200 bg-amber-50 text-amber-700",
  IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700",
  REFUNDING: "border-violet-200 bg-violet-50 text-violet-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REFUNDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

/**
 * A warranty ticket's conversation, the same on both screens: the viewer's
 * own lines on the right in the accent, the other side's on the left. A desk
 * action's note carries the status it moved the ticket to, under the bubble.
 *
 * The lines sit in a pane of fixed height that scrolls, newest at the
 * bottom, so a long thread never pushes the composer down the page (the
 * owner, 12/10/2026, from a support widget he liked the frame of).
 */
export function WarrantyThread({
  viewer,
  buyerName,
  opening,
  messages,
  footer,
  buyerAvatar = null,
  buyerInitial,
  size = PAGE_PANE,
  light = false,
}: {
  viewer: "buyer" | "shop";
  /** The buyer as the desk knows them; on their own page they are "Bạn". */
  buyerName: string;
  opening: ThreadOpening | null;
  messages: ChatMessage[];
  /** The buyer's picture beside their lines, or the initial drawn instead. */
  buyerAvatar?: string | null;
  buyerInitial?: string;
  /** A faint last line, for what the thread is waiting on. */
  footer?: ReactNode;
  /**
   * The pane's height rule. The pages let it grow to a fixed ceiling; the
   * admin's floating inbox has a panel of its own height to fill instead.
   */
  size?: string;
  /**
   * The white admin ticket page (30/10/2026 rebuild) reads this thread on
   * paper instead of glass; the buyer's page and the floating inbox stay
   * dark, so the default stays dark.
   */
  light?: boolean;
}) {
  const lines = [
    ...(opening
      ? [
          {
            id: "opening",
            fromShop: false,
            body: opening.body,
            imageUrl: opening.imageUrl,
            at: opening.at,
            sentAt: opening.sentAt,
            status: null,
            author: null,
            authorAvatar: null,
          },
        ]
      : []),
    ...messages,
  ];
  const pane = useRef<HTMLDivElement | null>(null);

  // The newest line is the one wanted: on first paint and on every arrival.
  useEffect(() => {
    const el = pane.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  if (lines.length === 0) return null;

  // The buyer's pages and the desk each keep their own red; the white desk
  // answers in ink on zinc instead.
  const mineTone = light
    ? "border-zinc-300 bg-zinc-100"
    : viewer === "buyer"
      ? "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10"
      : "border-[var(--brand)]/25 bg-[var(--brand)]/10";

  return (
    <div
      ref={pane}
      data-pane
      className={`${size} flex flex-col overflow-y-auto rounded-xl border p-4 ${
        light ? "border-zinc-200 bg-zinc-50" : "border-line bg-black/30"
      }`}
    >
      <ol className="flex shrink-0 flex-col gap-3">
        {lines.map((line, index) => {
          const mine = (viewer === "shop") === line.fromShop;
          // Lines from the same writer within five minutes run on under
          // one name and one picture, as any chat does (the owner,
          // 12/10/2026: the same avatar three times in a row read as
          // clutter).
          const prev = index > 0 ? lines[index - 1] : null;
          const grouped =
            prev !== null &&
            prev.fromShop === line.fromShop &&
            (prev.author ?? null) === (line.author ?? null) &&
            Date.parse(line.sentAt) - Date.parse(prev.sentAt) < 5 * 60 * 1000;
          // The shop's lines are signed by the admin who wrote them.
          const who = line.fromShop
            ? (line.author ?? "Shop")
            : viewer === "buyer"
              ? "Bạn"
              : buyerName;
          const moved = line.status ? WARRANTY_STATUS[line.status] : null;
          // Each line wears its writer's picture, the admin's on the shop's
          // lines and the buyer's on theirs, or an initial where there is
          // none (the owner, 12/10/2026: "logo icon admin và logo khách
          // hàng luôn đi").
          const avatar = line.fromShop
            ? (line.authorAvatar ?? null)
            : buyerAvatar;
          const initial = (
            line.fromShop ? (line.author ?? "S") : (buyerInitial ?? buyerName)
          ).slice(0, 1);
          return (
            <li
              key={line.id}
              className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "-mt-1.5" : ""}`}
            >
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[14px] font-semibold ${
                  light
                    ? "border-zinc-200 bg-white text-zinc-500"
                    : "border-white/10 bg-black/40 text-neutral-300"
                } ${grouped ? "invisible" : "mt-[18px]"}`}
              >
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>
              {/* flex-1: the column spans the row, so the bubble's 75% is of
                  the pane and not of its own text, which wrapped every two
                  words ("dsa / ĐÁ") before (19/10/2026). */}
              <div
                className={`flex min-w-0 flex-1 flex-col ${mine ? "items-end" : "items-start"}`}
              >
                {grouped ? null : (
                  <span
                    className={`mb-1 px-1 text-[13px] font-semibold ${
                      light ? "text-zinc-400" : "text-neutral-500"
                    }`}
                  >
                    <span className={light ? "text-zinc-700" : "text-neutral-300"}>{who}</span>,{" "}
                    {line.at}
                  </span>
                )}
                <div
                  className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-[14px] leading-relaxed sm:max-w-[75%] ${
                    light ? "text-zinc-800" : "text-neutral-100"
                  } ${
                    mine
                      ? `rounded-tr-md ${mineTone}`
                      : light
                        ? "rounded-tl-md border-zinc-200 bg-white"
                        : "rounded-tl-md border-white/10 bg-white/[0.04]"
                  }`}
                >
                  {line.body ? (
                    <p className="whitespace-pre-line break-words">
                      {line.body}
                    </p>
                  ) : null}
                  {line.imageUrl ? (
                    <a
                      href={line.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`block overflow-hidden rounded-lg border ${
                        light ? "border-zinc-200" : "border-white/10"
                      } ${line.body ? "mt-2" : ""}`}
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
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 px-1 text-[13px] ${
                      light ? "text-zinc-500" : "text-neutral-500"
                    }`}
                  >
                    Chuyển sang
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[12px] font-semibold ${
                        light && line.status
                          ? LIGHT_TILE[line.status]
                          : moved.tile
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-1 w-1 rounded-full ${light ? "bg-current" : moved.dot}`}
                      />
                      {moved.label}
                    </span>
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {/* At the pane's foot whatever its height, next to the composer it is
          about, not floating under the last bubble of a short thread in a
          tall pane (the owner, 19/10/2026: "chữ này bị lỗi nè"). */}
      {footer ? (
        <div
          className={`mt-auto shrink-0 pt-4 text-center text-[13px] ${
            light ? "text-zinc-500" : "text-neutral-500"
          }`}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
