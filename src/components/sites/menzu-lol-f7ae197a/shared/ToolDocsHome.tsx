"use client";

import { ChevronRight, Gamepad2, Lock, Search, Unlock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { sentenceCase } from "@/lib/displayCase";
import type { DocsAccess } from "@/lib/docsAccess";
import { toolDocsHref } from "@/lib/routes";

export interface DocsHomeTool {
  slug: string;
  name: string;
  access: DocsAccess;
}

export interface DocsHomeCategory {
  slug: string;
  name: string;
  logoUrl: string | null;
  /** The category's tile picture, standing in while it has no logo. */
  imageUrl: string | null;
  tools: DocsHomeTool[];
}

/**
 * The game's mark beside its name on its card. Only some games have a logo
 * uploaded, and the cards of the others stood bare beside them (the owner,
 * 13/10/2026, UI consistency review). Until a logo is uploaded the
 * category's own picture stands in, cropped to a rounded square at the
 * logo's size, as on /thong-bao's shelves; a game with neither gets a quiet
 * gamepad in the same square, so every name starts at the same place.
 */
function GameMark({
  logoUrl,
  imageUrl,
}: {
  logoUrl: string | null;
  imageUrl: string | null;
}) {
  const src = logoUrl || imageUrl;
  if (src) {
    return (
      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
        {/* The admin's "Logo game" is a free URL. Pictures from the shop's own
            /uploads go through the optimiser; one pasted from another site is
            drawn as is, since next.config lists no remote hosts and the
            optimiser would refuse it and break the page. */}
        <Image
          src={src}
          alt=""
          fill
          sizes="28px"
          unoptimized={!src.startsWith("/")}
          className={logoUrl ? "object-contain" : "object-cover"}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-neutral-500"
    >
      <Gamepad2 size={15} />
    </span>
  );
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition-[border-color,box-shadow] placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60 focus:ring-2 focus:ring-[var(--menzu-accent)]/25";

/** The small word beside a tool: whether this reader may open its docs. */
function AccessChip({ access }: { access: DocsAccess }) {
  if (access.state === "open") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-400">
        <Unlock size={11} aria-hidden />
        {access.until ? "Đang mở" : "Mở"}
      </span>
    );
  }
  if (access.state === "expired") {
    return (
      <span className="text-[12px] font-semibold text-amber-300">
        Hết hạn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-600">
      <Lock size={11} aria-hidden />
    </span>
  );
}

/**
 * "Chọn game", with a search over games and tools (docs.lmarket.net puts a
 * search box above its list). Each tool carries the reader's own standing,
 * decided on the server: a buyer sees at a glance which docs are open.
 */
export function ToolDocsHome({
  categories,
}: {
  categories: DocsHomeCategory[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = categories
    .map((category) => ({
      ...category,
      tools:
        q === "" || category.name.toLowerCase().includes(q)
          ? category.tools
          : category.tools.filter((tool) =>
              tool.name.toLowerCase().includes(q),
            ),
    }))
    .filter((category) => category.tools.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <label className="relative block">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm game hoặc tool…"
          aria-label="Tìm tài liệu"
          className={FIELD}
        />
      </label>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-neutral-400 bg-white/[0.02]">
          Không có tool nào khớp &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((category) => (
            <section
              key={category.slug}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              {/* The game's name as the menu beside it prints it, first letter
                  capital only (sentenceCase), so one game never reads two ways
                  on one screen. */}
              <h3 className="flex items-center gap-3 text-[14px] font-black tracking-wide text-white">
                <GameMark
                  logoUrl={category.logoUrl}
                  imageUrl={category.imageUrl}
                />
                {sentenceCase(category.name)}
                <span className="ml-auto text-[11px] font-black text-neutral-500 sm:text-[10px]">
                  {category.tools.length} tool
                </span>
              </h3>
              <ul className="mt-3 flex flex-col gap-1">
                {category.tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={toolDocsHref(tool.slug)}
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-neutral-600 group-hover:text-[var(--menzu-accent)]"
                        aria-hidden
                      />
                      <span className="line-clamp-1 min-w-0 flex-1" title={tool.name}>
                        {sentenceCase(tool.name)}
                      </span>
                      <AccessChip access={tool.access} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
