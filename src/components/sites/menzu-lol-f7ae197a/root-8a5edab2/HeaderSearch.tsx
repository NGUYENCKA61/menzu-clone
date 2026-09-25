"use client";

import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Hit {
  kind: "software" | "account" | "category";
  code: string;
  name: string;
  href: string;
  imageUrl: string | null;
  note: string;
}

/**
 * The search box in the header, left of the basket.
 *
 * A box on a desktop, nothing on a phone. It asks the search
 * route on every pause in typing and lists what came back under itself —
 * shelves first, then tools and accounts — so the reader lands on the page
 * rather than on a results page that would only list the same rows again.
 * Arrow keys walk the list, Enter opens the highlighted row, Escape clears.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const term = q.trim();

  // Asked after a short pause, and a request overtaken by more typing is
  // dropped rather than allowed to land late over fresher results.
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { hits: [] }))
        .then((data: { hits?: Hit[] }) => {
          setHits(data.hits ?? []);
          setActive(0);
          setLoading(false);
        })
        .catch(() => {
          // Aborted by newer typing, or offline: the box keeps what it had.
          setLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // A click anywhere else puts the list away.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setHits([]);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const reset = () => {
    setQ("");
    setHits([]);
  };

  // Navigate first, clear after. Clearing on Enter left an empty box and no
  // list while the next page took its half-second — which reads as "it
  // deleted what I typed and did nothing". The words stay, the icon turns,
  // and the box empties once the address has actually changed. A pick that
  // points at the page already open changes no address, so it clears at
  // once instead.
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  // Adjusted during render rather than in an effect: the address changed,
  // so the box is cleared before anything is painted for the new page.
  const [clearedFor, setClearedFor] = useState(pathname);
  if (clearedFor !== pathname) {
    setClearedFor(pathname);
    setQ("");
    setHits([]);
    setNavigating(false);
  }
  const go = (href: string) => {
    if (href === pathname) {
      reset();
      return;
    }
    setNavigating(true);
    setHits([]);
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && hits.length > 0) {
      event.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length > 0) {
      event.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      const hit = hits[active];
      if (hit) {
        event.preventDefault();
        go(hit.href);
      }
    } else if (event.key === "Escape") {
      reset();
      input.current?.blur();
    }
  };

  // Under two characters nothing is asked, so nothing stale is shown either.
  const shown = term.length >= 2 ? hits : [];
  const showList = term.length >= 2 && (shown.length > 0 || !loading);

  return (
    // Desktop only: on a phone the header has no room for a box, and the
    // shop chose no button either — the drawer and the shelves do the job.
    <div ref={box} className="relative hidden md:block">
      <div className="relative md:w-44 lg:w-52 xl:w-56">
        {/* A well, not a frosted chip. The bar is #1a1a1a, so a solid field a
            few steps darker reads as something you type into; white at 5%
            over white at 10% read as decoration and sat at the wrong radius
            from the button beside it. Borrowed from lmarket.net, which does
            the same thing in the same trade. */}
        <label className="relative flex h-9 items-center rounded-[10px] border border-[#2b2b31] bg-[#101013] text-neutral-300 transition-colors focus-within:border-[var(--menzu-accent)]/70 focus-within:ring-[3px] focus-within:ring-[var(--menzu-accent)]/15">
          {navigating ? (
            <Loader2 size={15} aria-hidden className="ml-2.5 shrink-0 animate-spin text-neutral-500 motion-reduce:animate-none" />
          ) : (
            <Search size={15} aria-hidden className="ml-2.5 shrink-0 text-neutral-500" />
          )}
          <input
            // Password managers and similar extensions stamp their own attributes
            // onto text inputs before React hydrates; without this the dev overlay
            // reports a mismatch the app did not cause (production patches it quietly).
            suppressHydrationWarning
            ref={input}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tìm hack, acc…"
            aria-label="Tìm sản phẩm"
            autoComplete="off"
            enterKeyHint="search"
            className="h-full w-full min-w-0 bg-transparent px-2 text-[13px] font-semibold text-white outline-none placeholder:text-[11px] placeholder:font-bold placeholder:uppercase placeholder:tracking-widest placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {loading ? (
            <Loader2 size={14} aria-hidden className="mr-2.5 shrink-0 animate-spin text-neutral-500" />
          ) : q ? (
            <button
              type="button"
              aria-label="Xoá từ khoá"
              onClick={() => {
                setQ("");
                input.current?.focus();
              }}
              className="mr-1.5 shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        {showList ? (
          <div className="drop-in absolute right-0 top-[42px] z-50 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[10px] border border-[#2b2b31] bg-[#0b0b0f]/97 shadow-2xl backdrop-blur-xl">
            {shown.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-neutral-500">
                Không thấy gì khớp “{term}”.
              </p>
            ) : (
              <ul role="listbox" aria-label="Kết quả tìm kiếm">
                {shown.map((hit, index) => (
                  <li key={`${hit.kind}-${hit.code}`} role="option" aria-selected={index === active}>
                    <Link
                      href={hit.href}
                      onClick={(event) => {
                        event.preventDefault();
                        go(hit.href);
                      }}
                      onMouseEnter={() => setActive(index)}
                      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                        index === active ? "bg-white/[0.08]" : ""
                      }`}
                    >
                      <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
                        {hit.imageUrl ? (
                          <Image src={hit.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-white">{hit.name}</span>
                        <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                          {hit.kind === "category"
                            ? "Danh mục"
                            : hit.kind === "software"
                              ? `Hack · ${hit.note}`
                              : `Tài khoản · ${hit.note}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
