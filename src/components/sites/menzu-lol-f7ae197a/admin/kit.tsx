import Link from "next/link";
import type { ReactNode } from "react";

import { GAP, pageStrip } from "@/lib/paging";

/**
 * The white admin's shared look (30/10/2026, the owner: "đập đi xây lại…
 * màu trắng… chuyên nghiệp không AI"). One small file of class constants and
 * three dumb components; every rebuilt screen composes from here so the
 * fourteen screens read as one app. Server-safe: no hooks, no handlers.
 *
 * Colour rules, same as the CRM: white panels on #f6f6f7, zinc ink, red only
 * as a signal (errors, destructive actions, a count that needs the owner),
 * amber for waiting, emerald for money in / done.
 */

/** Text inputs and selects. */
export const INPUT =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[13px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400";

export const TEXTAREA =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 disabled:bg-zinc-50";

/** Buttons: one dark primary, quiet neighbours, red kept for destruction. */
export const BTN_PRIMARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-default disabled:opacity-50";
export const BTN_SUBTLE =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-default disabled:opacity-50";
/** A small inline text action at the end of a row. */
export const BTN_LINK =
  "text-[13px] font-semibold text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline";

/** Table bones: a wide screen gets rows, a phone gets the cards variant. */
export const TH =
  "whitespace-nowrap py-2.5 pr-4 text-left text-[12.5px] font-semibold text-zinc-500";
export const TD = "py-3 pr-4 align-middle text-[13.5px] text-zinc-700";
export const TR = "border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70";

/** One white panel. */
export function Card({
  children,
  pad = true,
  className = "",
}: {
  children: ReactNode;
  pad?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white ${pad ? "p-4 sm:p-5" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/** A panel's first line: what it is, a quiet hint, actions on the right. */
export function CardHead({
  title,
  hint,
  aside,
  className = "",
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-zinc-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[12.5px] text-zinc-500">{hint}</p> : null}
      </div>
      {aside}
    </div>
  );
}

const CHIP_TONES = {
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-600",
  dark: "border-zinc-900 bg-zinc-900 text-white",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
} as const;

export type ChipTone = keyof typeof CHIP_TONES;

/** A short status word. Colour says the state; the word still says it alone. */
export function Chip({ tone = "zinc", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CHIP_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function PageLink({
  href,
  children,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  children: ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const shape =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";

  // A span rather than a disabled link, so the arrow at either end is not
  // something a keyboard can tab onto and press to no effect.
  if (disabled) {
    return (
      <span aria-hidden className={`${shape} cursor-default border-zinc-200 text-zinc-300`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${shape} ${
        current
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </Link>
  );
}

/** The page strip under a long list; `hrefOf` carries the active filters. */
export function Pager({
  page,
  totalPages,
  hrefOf,
  label,
}: {
  page: number;
  totalPages: number;
  hrefOf: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center gap-1.5">
      <PageLink href={hrefOf(page - 1)} disabled={page === 1} label="Trang trước">
        ‹
      </PageLink>
      {pageStrip(page, totalPages).map((n, index) =>
        n === GAP ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-[12px] text-zinc-400">
            {GAP}
          </span>
        ) : (
          <PageLink key={n} href={hrefOf(n)} current={n === page} label={`Trang ${n}`}>
            {n}
          </PageLink>
        ),
      )}
      <PageLink href={hrefOf(page + 1)} disabled={page === totalPages} label="Trang sau">
        ›
      </PageLink>
    </nav>
  );
}
