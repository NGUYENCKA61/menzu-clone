"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, BellRing, Search, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";

import { categoryHref } from "@/lib/routes";
import { matchesSearch } from "@/lib/searchText";
import { SOFTWARE_STATUS, type SoftwareStatusValue } from "@/lib/softwareStatus";

import { StatusSubscribeButton } from "./StatusSubscribeButton";
import { StatusToast } from "./StatusToast";
import { sentenceCase } from "@/lib/displayCase";

export interface StatusToolView {
  code: string;
  name: string;
  href: string;
  categoryName: string;
  categorySlug: string;
  /** The category's tile picture: the stand-in for a tool with no cover of
   *  its own, and the mark beside the shelf's name. */
  categoryImageUrl: string | null;
  /** The category's square game logo, uploaded in the desk; the shelf's
   *  mark when set, drawn whole rather than cropped. */
  categoryLogoUrl: string | null;
  /** The tool's cover, as the shop set it. Null falls back to the
   *  category's picture, then to the empty tile. */
  imageUrl: string | null;
  status: SoftwareStatusValue | null;
  /** Following it now; null for a guest, who is offered a sign-in instead. */
  subscribed: boolean | null;
}

interface Shelf {
  slug: string;
  name: string;
  /** The game's logo, or null to use the cover below in its place. */
  logoUrl: string | null;
  imageUrl: string | null;
  tools: StatusToolView[];
  following: number;
}

/** The small chips beside the search: the followed-only filter, the count,
 *  and each shelf's "follow it all". One height, the tool bells' radius. */
const CHIP =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors";
const CHIP_OFF = "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white";
const CHIP_ON =
  "border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] hover:bg-[var(--menzu-accent)]/15";

/**
 * "Theo dõi cả danh mục": every tool on the shelf, followed or let go at
 * once (the owner, 01/10/2026: "thử hết đi"). Lit while every tool on it is
 * followed. The press shows its answer straight away and the server catches
 * up, as the tool bells do; the bells below follow once the refresh lands.
 */
function ShelfFollowButton({
  slug,
  name,
  allOn,
  signedIn,
  loginNext,
}: {
  slug: string;
  name: string;
  allOn: boolean;
  signedIn: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  // The answer this press gave, shown until the refreshed list agrees.
  const [pending, setPending] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const on = pending !== null && pending !== allOn ? pending : allOn;

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(loginNext)}`}
        className={`${CHIP} ${CHIP_OFF}`}
        title={`Đăng nhập để theo dõi cả ${name}`}
      >
        <Bell size={13} aria-hidden />
        Cả danh mục
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    const next = !on;
    setBusy(true);
    setFailed(false);
    setPending(next);
    try {
      const res = await fetch("/api/status-subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categorySlug: slug, subscribed: next }),
      });
      if (!res.ok) {
        setPending(null);
        setFailed(true);
        return;
      }
      router.refresh();
    } catch {
      setPending(null);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        title={on ? `Đang theo dõi cả ${name}, bấm để bỏ` : `Theo dõi cả ${name}`}
        className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
      >
        {on ? <BellRing size={13} aria-hidden /> : <Bell size={13} aria-hidden />}
        Cả danh mục
      </button>
      {failed ? (
        <StatusToast
          title="Chưa lưu được"
          message="Không đổi được theo dõi cả danh mục. Thử lại sau một lát."
          onClose={() => setFailed(false)}
        />
      ) : null}
    </>
  );
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
        name: sentenceCase(tool.categoryName),
        logoUrl: tool.categoryLogoUrl,
        imageUrl: tool.categoryImageUrl,
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
  old = false,
}: {
  tools: StatusToolView[];
  loginNext: string;
  /** LAB: /thong-bao?ban=cu, the tab as it was before 18/10/2026. */
  old?: boolean;
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
  // "Lit" for a shelf means every tool it lists, whatever the search shows.
  const allFollowedBySlug = useMemo(() => {
    const all = new Map<string, boolean>();
    for (const tool of tools) {
      all.set(tool.categorySlug, (all.get(tool.categorySlug) ?? true) && tool.subscribed === true);
    }
    return all;
  }, [tools]);

  // Null on every card means nobody is signed in: the shelves' "Cả danh mục"
  // chips then offer a sign-in, and their "đã bật" counts stay unsaid.
  const signedIn = tools.some((tool) => tool.subscribed !== null);

  return (
    <div className="flex flex-col gap-5">
      {/* Stays under the header while the shelves scroll by (58px is the
          header once scrolled), on the page's own ground so the cards pass
          beneath it rather than through it. Its padding is for that stuck
          moment only: -my-2 gives it back to the page, so at rest the box
          sits the column's 20px from the line above and the first shelf
          below (the owner, 02/10/2026: "có bị thưa k vậy"). The ground is
          #111111 now; the band was still the old #0f1015 and showed as a
          bluish strip, and the box is the wiki's search box (18/10/2026,
          "rà soát ... cho đồng bộ"). */}
      <div
        className={`sticky top-[58px] z-20 -mx-4 -my-2 flex flex-wrap items-center gap-3 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6 ${
          old ? "bg-[#0f1015]/95" : "bg-[#111111]/95"
        }`}
      >
        {/* The search alone: the "Tất cả / Đang theo dõi" filter came off
            (the owner, 02/10/2026: "bỏ 2 card tất cả với đang theo dõi đi"). */}
        <label
          className={
            old
              ? "flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-white/10 bg-[#101114] px-4 transition-colors focus-within:border-[var(--menzu-accent)]/60"
              : "flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 transition-[border-color,box-shadow,background-color] hover:bg-white/[0.08] focus-within:border-[var(--menzu-accent)]/60 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-[var(--menzu-accent)]/25"
          }
        >
          <Search size={15} aria-hidden className="shrink-0 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tool trong mọi danh mục…"
            aria-label="Tìm tool để nhận thông báo"
            className={`h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 ${old ? "font-semibold" : ""}`}
          />
        </label>
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
              {/* The game's own logo beside its name: a mark the eye can stop
                  on while the shelves scroll past. Drawn whole on a quiet
                  tile; until the shop uploads one, the cover stands in,
                  cropped square (the owner: "hiện tạm ảnh danh mục"). */}
              {shelf.logoUrl ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
                  <Image src={shelf.logoUrl} alt="" fill sizes="28px" className="object-contain p-0.5" />
                </span>
              ) : shelf.imageUrl ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  <Image src={shelf.imageUrl} alt="" fill sizes="28px" className="object-cover" />
                </span>
              ) : null}
              {/* The name, the count and the rule in the history tab's day
                  heading's sizes and colours, 15px over a 13px count and the
                  site's line, where they were 13px, 12px and a fainter rule
                  (18/10/2026, "xét sự đồng bộ luôn"). */}
              <Link
                href={categoryHref(shelf.slug)}
                className={`group inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[var(--menzu-accent)] ${
                  old ? "text-[13px] text-white" : "text-[15px] text-frost"
                }`}
              >
                {shelf.name}
                <ArrowRight
                  size={12}
                  aria-hidden
                  className="text-neutral-600 transition-colors group-hover:text-[var(--menzu-accent)]"
                />
              </Link>
              <span className={old ? "text-[12px] font-semibold text-neutral-500" : "text-[13px] text-dim"}>
                {shelf.tools.length} tool
                {signedIn && shelf.following > 0 ? (
                  <>
                    {", "}
                    <span className="text-[var(--menzu-accent)]">
                      đã bật {shelf.following}
                    </span>
                  </>
                ) : null}
              </span>
              <span aria-hidden className={`h-px min-w-6 flex-1 ${old ? "bg-white/[0.08]" : "bg-line"}`} />
              <ShelfFollowButton
                slug={shelf.slug}
                name={shelf.name}
                allOn={allFollowedBySlug.get(shelf.slug) === true}
                signedIn={signedIn}
                loginNext={loginNext}
              />
            </div>

            {/* Two to a row from lg only: with the 144px cover, two cards on
                a 640-900px screen left the name 64-128px (19/10/2026); one
                card per row there, as Lịch sử mua lists. */}
            <ul className={`grid gap-3 ${old ? "sm:grid-cols-2" : "lg:grid-cols-2"}`}>
              {shelf.tools.map((tool) => {
                const state = tool.status ? SOFTWARE_STATUS[tool.status] : null;
                const on = tool.subscribed === true;
                // A tool with no cover wears its category's picture rather
                // than an empty tile that reads as a broken image.
                const cover = tool.imageUrl ?? tool.categoryImageUrl;
                return (
                  <li
                    key={tool.code}
                    // The rim the site's other cards wear (10% white, the
                    // orders list's darker edge under the pointer) where it
                    // was a fainter 5%; the cover in the orders list's frame,
                    // 8px corners on the dark rim, where it had 14px and a
                    // white one (18/10/2026, "rà soát ... cho đồng bộ").
                    className={`flex items-center gap-3.5 rounded-2xl border p-3 transition-colors ${
                      on
                        ? "border-[var(--menzu-accent)]/35 bg-[var(--menzu-accent)]/[0.06]"
                        : old
                          ? "border-white/5 bg-white/[0.02] hover:border-white/10"
                          : "border-white/10 bg-white/[0.02] hover:border-line-strong"
                    }`}
                  >
                    <Link
                      href={tool.href}
                      aria-label={tool.name}
                      // The orders list's and the wiki's sizes: 96x64 on a
                      // phone, 144x81 from sm, where the grid had 92px and
                      // the picture sat short beside a two-line name and its
                      // chip (19/10/2026, "làm đi").
                      className={`relative grid shrink-0 place-items-center overflow-hidden border bg-[linear-gradient(135deg,#171922,#36151e,#0d0e12)] ${
                        old
                          ? "aspect-[16/9] w-[92px] rounded-xl border-white/10"
                          : "lab-notch-sm aspect-[3/2] w-24 border-line sm:aspect-video sm:w-36"
                      }`}
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 144px, 96px"
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
                        className="line-clamp-2 text-[15px] font-semibold leading-snug text-frost transition-colors hover:text-white"
                      >
                        {sentenceCase(tool.name)}
                      </Link>
                      {/* The history tab's chip, dot and all, so a state
                          reads the same on both tabs (18/10/2026). */}
                      {state ? (
                        <span
                          className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${state.tile}`}
                        >
                          {old ? null : <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />}
                          {state.label}
                        </span>
                      ) : null}
                    </div>

                    <StatusSubscribeButton
                      // Keyed by what the server says, so a "Cả danh mục"
                      // press re-draws every bell on the shelf once the
                      // refreshed list arrives.
                      key={`${tool.code}:${tool.subscribed}`}
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
