"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cpu,
  Crosshair,
  Eye,
  Link2,
  MonitorCog,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  DOCS_RAIL_BAR,
  DOCS_RAIL_BOX,
  DOCS_RAIL_LABEL,
  DOCS_RAIL_ROW,
  DOCS_RAIL_ROW_OFF,
  DOCS_RAIL_ROW_ON,
  docsRailIcon,
} from "@/components/sites/menzu-lol-f7ae197a/shared/docsRail";
import { SectionHeading } from "@/components/sites/menzu-lol-f7ae197a/shared/SectionHeading";
import { copyText } from "@/lib/clipboard";
import { buildGlossaryIndex, foldText, searchGlossary } from "@/lib/glossary/search";
import {
  aliasAnchors,
  GLOSSARY_GROUPS,
  termHref,
  type GlossaryExposure,
  type GlossaryGroupIcon,
  type GlossaryGroupId,
  type GlossaryTerm,
} from "@/lib/glossary/terms";
import { SOFTWARE_STATUS } from "@/lib/softwareStatus";

/** The data names each group's glyph; the page owns the components. */
const GROUP_ICON: Record<GlossaryGroupIcon, LucideIcon> = {
  Crosshair,
  Eye,
  Zap,
  SlidersHorizontal,
  Cpu,
  MonitorCog,
  ShoppingBag,
};

const GROUP_BY_ID = new Map(GLOSSARY_GROUPS.map((group) => [group.id, group]));
const groupLabel = (id: GlossaryGroupId) => GROUP_BY_ID.get(id)?.label ?? "";

/** "Độ lộ" in the tool status colours: emerald hides, amber shows a little,
 *  red is plain to anyone watching. */
const EXPOSURE: Record<GlossaryExposure, { label: string; tile: string }> = {
  thap: { label: "Ít lộ", tile: SOFTWARE_STATUS.UNDETECTED.tile },
  vua: { label: "Lộ vừa", tile: SOFTWARE_STATUS.UPDATING.tile },
  cao: { label: "Rất lộ", tile: SOFTWARE_STATUS.DETECTED.tile },
};

const groupAnchor = (id: GlossaryGroupId) => `nhom-${id}`;

/** unnamedtech's detail chip, in the site's greys. */
const CHIP = "rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-neutral-400";

/** The same chip as a link to another word: a shade brighter and lightly
 *  filled, so a note ("Nên bật") and a word to jump to do not read alike. */
const RELATED_CHIP =
  "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-neutral-300 transition-colors hover:border-[var(--menzu-accent)]/40 hover:text-[var(--menzu-accent)]";

/** How long a card keeps its red ring after a link or a search lands on it. */
const FLASH_MS = 2000;

function scrollMotion(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** The red ring a :target card wears, for the landings that are not a
 *  navigation to the hash (a ?q= link, a #word that a ?q= came along with). */
function flash(element: HTMLElement) {
  const card = element.closest<HTMLElement>("[data-term]") ?? element;
  card.setAttribute("data-flash", "");
  window.setTimeout(() => card.removeAttribute("data-flash"), FLASH_MS);
}

/**
 * The address an in-page link would have made, once a search is dropped:
 * ?q= leaves through the history API Next knows about, then the hash is set
 * the way the link would have set it. A real fragment navigation moves
 * :target, so a word the page was opened at (#fov) gives up its ring; a
 * pushed hash would leave that one ringed for good. Next's popstate handler
 * skips the null-state entry this adds.
 */
function goToAnchor(id: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.has("q")) {
    url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  window.location.hash = id;
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

/** Typing in a field: "/" is a character there, not the search shortcut. */
function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * The glossary at /docs/thuat-ngu, after unnamedtech's wiki (the owner,
 * 13/10/2026): a full-width search box, then every word as a card under its
 * group. Ours adds the /docs rail of groups on the left, a link of its own to
 * every word and every alias, and a search that hides the library while it
 * shows its results (theirs left both on screen).
 *
 * The server renders the whole library, so every word is in the HTML for
 * search engines; this only filters it.
 */
export function GlossaryBrowser({
  terms,
  initialQuery = "",
  footer,
}: {
  terms: readonly GlossaryTerm[];
  /** ?q= from the address, so a shared search opens already run. */
  initialQuery?: string;
  /** Under the list: the page's "Vẫn chưa rõ?" card. */
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState<GlossaryGroupId>(GLOSSARY_GROUPS[0].id);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildGlossaryIndex(terms, groupLabel), [terms]);
  const nameOf = useMemo(() => new Map(terms.map((term) => [term.id, term.term])), [terms]);
  const groups = useMemo(
    () =>
      GLOSSARY_GROUPS.map((group) => ({
        group,
        terms: terms.filter((term) => term.group === group.id),
      })).filter((entry) => entry.terms.length > 0),
    [terms],
  );

  const searching = foldText(query) !== "";
  const results = useMemo(() => searchGlossary(index, query), [index, query]);

  // "/" puts the cursor in the box from anywhere on the page, as on GitHub
  // and unnamedtech; Esc in the box clears it (onKeyDown below).
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (typingIn(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The search into the address, as ?q=, so it can be shared. Replaced
  // rather than pushed, and only once the typing pauses: one Back press
  // should leave the page, not undo it a letter at a time. A word's #anchor
  // goes while a search is up, since that card may not be on screen.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const typed = query.trim();
      if (typed) {
        url.searchParams.set("q", typed);
        url.hash = "";
      } else {
        url.searchParams.delete("q");
      }
      const next = `${url.pathname}${url.search}${url.hash}`;
      const now = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next !== now) window.history.replaceState(null, "", next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Arriving: with ?q= the first hit is scrolled to the middle and ringed
  // for two seconds, which is unnamedtech's deep link. With a #word the
  // browser has already scrolled there itself; if a ?q= came along with it,
  // the anchor wins and the search is dropped.
  useEffect(() => {
    if (!foldText(initialQuery)) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) {
      const frame = window.requestAnimationFrame(() => {
        flushSync(() => setQuery(""));
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ block: "start" });
          flash(target);
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const first = listRef.current?.querySelector<HTMLElement>("[data-term]");
    if (first) {
      first.scrollIntoView({ block: "center", behavior: scrollMotion() });
      flash(first);
    }
  }, [initialQuery]);

  // A #word reached some other way while a search hides the library (Back,
  // a link elsewhere on the page): drop the search and go to the word.
  useEffect(() => {
    if (!searching) return;
    function onHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      flushSync(() => setQuery(""));
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ block: "start" });
        flash(target);
      }
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [searching]);

  // Which group the reader is in, for the rail: the first one whose section
  // crosses a band just under the fixed header.
  useEffect(() => {
    if (searching) return;
    const sections = GLOSSARY_GROUPS.map((group) => document.getElementById(groupAnchor(group.id))).filter(
      (section): section is HTMLElement => section !== null,
    );
    if (sections.length === 0) return;
    const inView = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView.set(entry.target.id, entry.isIntersecting);
        const first = GLOSSARY_GROUPS.find((group) => inView.get(groupAnchor(group.id)));
        if (first) setActive(first.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [searching]);

  /**
   * An in-page link (a rail row, a related word) pressed while a search is
   * up: its target is not on screen, so the library comes back first and the
   * browser then jumps as it would have. Otherwise the link does its own job.
   */
  function jumpOutOfSearch(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (!searching) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    flushSync(() => setQuery(""));
    goToAnchor(id);
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
    }
  }

  return (
    <div>
      {/* Full width under the title, as unnamedtech sets theirs; it stays
          where it is rather than following the page down. */}
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Tìm thuật ngữ (ví dụ: silent aim, ESP, HWID, spoofer)..."
          aria-label="Tìm thuật ngữ"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-neutral-500 hover:bg-white/[0.08] focus:border-[var(--menzu-accent)]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--menzu-accent)]/25 lg:pr-12"
        />
        {query ? null : (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[12px] font-semibold leading-none text-neutral-500 lg:block"
          >
            /
          </kbd>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* The groups, in the /docs rail's dress (docsRail). A row of chips
            below lg, a column above; no counts, as on /docs. min-w-0 keeps
            the chip row from pushing a phone's page past its edge. */}
        <aside className="min-w-0 lg:sticky lg:top-[120px]">
          <nav aria-label="Nhóm thuật ngữ" className={DOCS_RAIL_BOX}>
            <p className={DOCS_RAIL_LABEL}>Nhóm</p>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
              {groups.map(({ group }) => {
                const on = !searching && group.id === active;
                const Icon = GROUP_ICON[group.icon];
                const anchor = groupAnchor(group.id);
                return (
                  <a
                    key={group.id}
                    href={`#${anchor}`}
                    onClick={(event) => jumpOutOfSearch(event, anchor)}
                    aria-current={on ? "location" : undefined}
                    className={`${DOCS_RAIL_ROW} shrink-0 whitespace-nowrap lg:shrink lg:whitespace-normal ${
                      on ? DOCS_RAIL_ROW_ON : DOCS_RAIL_ROW_OFF
                    }`}
                  >
                    {on ? <span aria-hidden className={DOCS_RAIL_BAR} /> : null}
                    <Icon size={16} aria-hidden className={docsRailIcon(on)} />
                    {group.label}
                  </a>
                );
              })}
            </div>
            <div className="mt-2 hidden border-t border-white/10 pt-2 lg:block">
              <Link href="/docs" className={`${DOCS_RAIL_ROW} ${DOCS_RAIL_ROW_OFF}`}>
                <ArrowLeft size={16} aria-hidden className={docsRailIcon(false)} />
                Wiki & Hướng dẫn
              </Link>
            </div>
          </nav>
        </aside>

        <section aria-labelledby="glossary-heading" className="min-w-0">
          <SectionHeading id="glossary-heading">Thư viện thuật ngữ</SectionHeading>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            Độ lộ là mức người chơi khác hoặc replay dễ nhận ra, không phải khả năng bị anti-cheat
            phát hiện.
          </p>

          <div ref={listRef} className="mt-6">
            {searching ? (
              <div>
                <p
                  aria-live="polite"
                  className="mb-3 text-[13px] font-bold text-neutral-500"
                >
                  {results.length} thuật ngữ
                </p>
                {results.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {results.map((term) => (
                      <TermCard
                        key={term.id}
                        term={term}
                        heading="h3"
                        showGroup
                        nameOf={nameOf}
                        onJump={jumpOutOfSearch}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-500 bg-white/[0.02]">
                    Không có thuật ngữ nào khớp &ldquo;
                    <span className="font-bold text-white">{query.trim()}</span>&rdquo;. Nhắn shop từ
                    này, shop sẽ bổ sung.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                {groups.map(({ group, terms: groupTerms }) => {
                  const Icon = GROUP_ICON[group.icon];
                  const anchor = groupAnchor(group.id);
                  return (
                    <section
                      key={group.id}
                      id={anchor}
                      aria-labelledby={`${anchor}-title`}
                      className="scroll-mt-[140px]"
                    >
                      <div className="mb-3">
                        <h3
                          id={`${anchor}-title`}
                          className="flex items-center gap-2 text-[14px] font-semibold text-[var(--menzu-accent)]"
                        >
                          <Icon size={14} aria-hidden className="shrink-0" />
                          {group.label}
                        </h3>
                        <p className="mt-1 text-[13px] text-neutral-500">{group.blurb}</p>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {groupTerms.map((term) => (
                          <TermCard
                            key={term.id}
                            term={term}
                            heading="h4"
                            nameOf={nameOf}
                            onJump={jumpOutOfSearch}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {footer}
        </section>
      </div>
    </div>
  );
}

/**
 * One word, as unnamedtech draws a feature: its name, one line of meaning, a
 * few sentences more and a row of chips. Ours carries its other names after
 * the title, how exposed it is, a button that copies its link, and real
 * links to the related words and the wiki article.
 */
function TermCard({
  term,
  heading: Heading,
  showGroup = false,
  nameOf,
  onJump,
}: {
  term: GlossaryTerm;
  /** h4 under a group's heading, h3 in a search's flat list. */
  heading: "h3" | "h4";
  /** In a search's results, which group the word comes from. */
  showGroup?: boolean;
  nameOf: Map<string, string>;
  onJump: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const exposure = term.exposure ? EXPOSURE[term.exposure] : null;
  const group = GROUP_BY_ID.get(term.group);
  const GroupIcon = group ? GROUP_ICON[group.icon] : null;
  const related = (term.related ?? []).filter((id) => nameOf.has(id));
  const hasChips =
    showGroup || (term.tags?.length ?? 0) > 0 || related.length > 0 || term.doc !== undefined;

  return (
    <article
      id={term.id}
      data-term=""
      className="group relative scroll-mt-[140px] rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/10 target:border-[var(--menzu-accent)]/50 target:bg-[var(--menzu-accent)]/[0.04] has-[:target]:border-[var(--menzu-accent)]/50 has-[:target]:bg-[var(--menzu-accent)]/[0.04] data-[flash]:border-[var(--menzu-accent)]/50 data-[flash]:bg-[var(--menzu-accent)]/[0.04] sm:p-5"
    >
      {/* One empty mark per other name, sitting above the card by the
          header's height, so #smoothness or #rcs lands on this card with
          no script at all. */}
      {aliasAnchors(term).map((anchor) => (
        <span key={anchor} id={anchor} aria-hidden className="absolute -top-[140px] left-0" />
      ))}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-0.5">
          <Heading className="inline text-[15px] font-black leading-snug text-white">{term.term}</Heading>
          {term.aliases?.length ? (
            <span className="ml-2 text-[12px] font-medium text-neutral-500">{term.aliases.join(", ")}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {exposure ? (
            <span
              title="Độ lộ: mức người chơi khác hoặc replay dễ nhận ra"
              className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${exposure.tile}`}
            >
              <span className="sr-only">Độ lộ: </span>
              {exposure.label}
            </span>
          ) : null}
          <CopyLinkButton id={term.id} />
        </div>
      </div>

      <p className="mt-1.5 text-sm font-medium text-neutral-200">{term.short}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">{term.detail}</p>

      {hasChips ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {showGroup && group && GroupIcon ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-neutral-300">
              <GroupIcon size={12} aria-hidden className="shrink-0 text-[var(--menzu-accent)]" />
              {group.label}
            </span>
          ) : null}
          {term.tags?.map((tag) => (
            <span key={tag} className={CHIP}>
              {tag}
            </span>
          ))}
          {related.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => onJump(event, id)}
              className={RELATED_CHIP}
            >
              {nameOf.get(id)}
            </a>
          ))}
          {term.doc ? (
            <Link
              href={term.doc.href}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--menzu-accent)]/30 px-2.5 py-0.5 text-[11px] font-bold text-[var(--menzu-accent)] transition-colors hover:border-[var(--menzu-accent)]/60 hover:bg-[var(--menzu-accent)]/10"
            >
              <BookOpen size={12} aria-hidden className="shrink-0" />
              Đọc bài: {term.doc.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Copies the word's full address; says "Đã chép" for a moment when it did. */
function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const done = await copyText(`${window.location.origin}${termHref(id)}`);
    if (!done) return;
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Đã chép link" : "Chép link tới từ này"}
      title="Chép link tới từ này"
      className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg transition-[color,background-color,opacity] hover:bg-white/10 hover:text-white focus-visible:outline-none lg:focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 ${
        copied
          ? "px-2 text-[11px] font-bold text-white"
          : "w-7 text-neutral-500 lg:opacity-0 lg:group-hover:opacity-100"
      }`}
    >
      {copied ? (
        <>
          <Check size={14} aria-hidden />
          Đã chép
        </>
      ) : (
        <Link2 size={14} aria-hidden />
      )}
    </button>
  );
}
