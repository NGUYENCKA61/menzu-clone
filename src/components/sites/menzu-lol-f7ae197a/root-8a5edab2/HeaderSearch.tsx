"use client";

import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Hit {
  kind: "software" | "account" | "category";
  code: string;
  name: string;
  href: string;
  imageUrl: string | null;
  note: string;
}

/** The bell's and the basket's square, for the button the phone gets. */
const ICON_BUTTON =
  "relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white";

/**
 * The search box in the header, left of the basket.
 *
 * A box on a desktop, a button that opens one on a phone. It asks the search
 * route on every pause in typing and lists what came back under itself —
 * shelves first, then tools and accounts — so the reader lands on the page
 * rather than on a results page that would only list the same rows again.
 * Arrow keys walk the list, Enter opens the highlighted row, Escape clears.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      if (box.current && !box.current.contains(event.target as Node)) {
        setOpen(false);
        setHits([]);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const reset = () => {
    setQ("");
    setHits([]);
    setOpen(false);
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
        reset();
        router.push(hit.href);
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
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Tìm kiếm"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => input.current?.focus(), 0);
        }}
        className={`${ICON_BUTTON} md:hidden`}
      >
        <Search size={16} />
      </button>

      <div
        className={`${
          open ? "absolute right-0 top-11 z-50 w-[min(92vw,22rem)]" : "hidden"
        } md:relative md:static md:block md:w-48 lg:w-60 xl:w-72`}
      >
        <label className="relative flex h-9 items-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition-colors focus-within:border-white/25 focus-within:bg-white/[0.08]">
          <Search size={15} aria-hidden className="ml-3 shrink-0 text-neutral-500" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tìm hack, tài khoản…"
            aria-label="Tìm sản phẩm"
            autoComplete="off"
            enterKeyHint="search"
            className="h-full w-full min-w-0 bg-transparent px-2.5 text-[12px] font-semibold text-white outline-none placeholder:text-neutral-500 [&::-webkit-search-cancel-button]:hidden"
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
              className="mr-1.5 shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        {showList ? (
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d12]/95 shadow-2xl backdrop-blur-xl">
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
                      onClick={reset}
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
