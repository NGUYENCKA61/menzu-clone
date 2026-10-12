"use client";

import { ChevronRight, Lock, Search, Unlock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  tools: DocsHomeTool[];
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--menzu-accent)]/60";

/** The small word beside a tool: whether this reader may open its docs. */
function AccessChip({ access }: { access: DocsAccess }) {
  if (access.state === "open") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
        <Unlock size={11} aria-hidden />
        {access.until ? "Đang mở" : "Mở"}
      </span>
    );
  }
  if (access.state === "expired") {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
        Hết hạn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-neutral-600">
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
        <p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-neutral-400">
          Không có tool nào khớp &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((category) => (
            <section
              key={category.slug}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <h3 className="flex items-center gap-3 text-[13px] font-black uppercase tracking-wider text-white">
                {category.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.logoUrl}
                    alt=""
                    className="h-7 w-7 rounded-md object-contain"
                  />
                ) : null}
                {category.name}
                <span className="ml-auto text-[10px] font-black text-neutral-500">
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
                      <span className="line-clamp-1 min-w-0 flex-1">
                        {tool.name}
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
