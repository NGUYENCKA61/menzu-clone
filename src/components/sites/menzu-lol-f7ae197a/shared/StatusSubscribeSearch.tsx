"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";

import { categoryHref } from "@/lib/routes";
import { matchesSearch } from "@/lib/searchText";
import { SOFTWARE_STATUS, type SoftwareStatusValue } from "@/lib/softwareStatus";

import { StatusSubscribeButton } from "./StatusSubscribeButton";

export interface StatusToolView {
  code: string;
  name: string;
  href: string;
  categoryName: string;
  categorySlug: string;
  /** The tool's cover, as the shop set it. Null draws the fallback tile. */
  imageUrl: string | null;
  status: SoftwareStatusValue | null;
  /** Following it now; null for a guest, who is offered a sign-in instead. */
  subscribed: boolean | null;
}

interface Shelf {
  slug: string;
  name: string;
  tools: StatusToolView[];
  following: number;
}

/**
 * The tools under their categories, in the order the shop shelves them.
 *
 * Insertion order is kept rather than sorted here: the query hands these back
 * by the category's own sortOrder, which is the order the shop chose for its
 * menu, and re-sorting alphabetically would put the shelves in one order here
 * and another everywhere else on the site.
 */
function shelve(tools: StatusToolView[]): Shelf[] {
  const shelves = new Map<string, Shelf>();
  for (const tool of tools) {
    let shelf = shelves.get(tool.categorySlug);
    if (!shelf) {
      shelf = {
        slug: tool.categorySlug,
        name: tool.categoryName,
        tools: [],
        following: 0,
      };
      shelves.set(tool.categorySlug, shelf);
    }
    shelf.tools.push(tool);
    if (tool.subscribed === true) shelf.following += 1;
  }
  return [...shelves.values()];
}

/**
 * "Đăng ký nhận thông báo" — pick tools out of their categories and follow
 * them, or search across every category at once.
 *
 * Following used to be reachable only from a tool's own page, which meant a
 * reader who wanted to follow four tools had to visit four pages and know
 * their names well enough to navigate to them. This is the same chip, on the
 * page that already exists to be about status.
 *
 * Grouped by category rather than one flat list, because that is how the
 * reader already knows the shop — someone who plays Valorant wants the
 * Valorant shelf and nothing else, and asking them to recognise which of
 * fifteen names belong to their game is work the menu already did.
 *
 * Cards with the tool's own cover for the same reason: this is a shelf of
 * things recognised by sight from the shop front. A followed card carries the
 * accent on its border, so which ones are already on is answerable at a
 * glance.
 *
 * The filter runs in the browser over the whole shelf rather than round-
 * tripping per keystroke: this list is one card per tool the shop sells, which
 * is a page of text, not a catalogue.
 */
export function StatusSubscribeSearch({
  tools,
  loginNext,
}: {
  tools: StatusToolView[];
  loginNext: string;
}) {
  const [query, setQuery] = useState("");

  const shelves = useMemo(
    () =>
      shelve(
        tools.filter((tool) =>
          matchesSearch(query, [tool.name, tool.categoryName, tool.code]),
        ),
      ),
    [tools, query],
  );

  // Null on every card means nobody is signed in, and a "0 / 7" for a reader
  // who cannot follow anything yet is a scold rather than a summary.
  const signedIn = tools.some((tool) => tool.subscribed !== null);
  const following = tools.filter((tool) => tool.subscribed === true).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* w-full and no flex-1 on purpose: flex-1 would set the basis to zero
            and let the field squeeze down to share a phone's line with the
            count beside it, instead of taking the line and pushing it under. */}
        <label className="flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-white/10 bg-[#101114] px-4 transition-colors focus-within:border-[var(--menzu-accent)]/60">
          <Search size={15} aria-hidden className="shrink-0 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tool trong mọi danh mục…"
            aria-label="Tìm tool để nhận thông báo"
            className="h-full w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-neutral-500"
          />
        </label>
        {signedIn ? (
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
            Đang theo dõi{" "}
            <span className="text-[var(--menzu-accent)]">{following}</span> /{" "}
            {tools.length} tool
          </p>
        ) : null}
      </div>

      {tools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-sm font-bold text-white">Chưa có tool nào đang bán</p>
        </div>
      ) : shelves.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-sm font-bold text-white">Không tìm thấy tool nào</p>
          <p className="mt-1.5 text-[13px] text-neutral-400">
            Thử gõ tên ngắn hơn, tên game, hoặc tên danh mục.
          </p>
        </div>
      ) : (
        shelves.map((shelf) => (
          <section key={shelf.slug}>
            {/* The category's own name, and how much of it is already on. The
                rule fills the rest of the line so the shelves read as bands
                rather than as headings floating over a grid. */}
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Link
                href={categoryHref(shelf.slug)}
                className="group inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:text-[var(--menzu-accent)]"
              >
                {shelf.name}
                <ArrowRight
                  size={12}
                  aria-hidden
                  className="text-neutral-600 transition-colors group-hover:text-[var(--menzu-accent)]"
                />
              </Link>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {shelf.tools.length} tool
                {signedIn && shelf.following > 0 ? (
                  <>
                    {" · "}
                    <span className="text-[var(--menzu-accent)]">
                      đã bật {shelf.following}
                    </span>
                  </>
                ) : null}
              </span>
              <span aria-hidden className="h-px min-w-6 flex-1 bg-white/[0.08]" />
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {shelf.tools.map((tool) => {
                const state = tool.status ? SOFTWARE_STATUS[tool.status] : null;
                const on = tool.subscribed === true;
                return (
                  <li
                    key={tool.code}
                    className={`flex items-center gap-3.5 rounded-2xl border p-3 transition-colors ${
                      on
                        ? "border-[var(--menzu-accent)]/35 bg-[var(--menzu-accent)]/[0.06]"
                        : "border-white/10 bg-neutral-900/50 hover:border-white/20"
                    }`}
                  >
                    <Link
                      href={tool.href}
                      aria-label={tool.name}
                      className="relative grid aspect-[16/9] w-[92px] shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#171922,#36151e,#0d0e12)]"
                    >
                      {tool.imageUrl ? (
                        <Image
                          src={tool.imageUrl}
                          alt=""
                          fill
                          sizes="92px"
                          className="object-cover"
                        />
                      ) : (
                        // The card's own name is right beside it, so the empty
                        // tile only has to not look broken.
                        <ShieldQuestion
                          size={18}
                          aria-hidden
                          className="text-white/25"
                        />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={tool.href}
                        // Two lines rather than an ellipsis: on a phone the
                        // text column is narrow enough that half these names
                        // would end in "…" and stop telling the reader which
                        // tool it is.
                        className="line-clamp-2 text-[13.5px] font-bold leading-snug text-white transition-colors hover:text-[var(--menzu-accent)]"
                      >
                        {tool.name}
                      </Link>
                      {state ? (
                        <span
                          className={`mt-1.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${state.tile}`}
                        >
                          {state.label}
                        </span>
                      ) : null}
                    </div>

                    <StatusSubscribeButton
                      productCode={tool.code}
                      initial={tool.subscribed}
                      loginNext={loginNext}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
