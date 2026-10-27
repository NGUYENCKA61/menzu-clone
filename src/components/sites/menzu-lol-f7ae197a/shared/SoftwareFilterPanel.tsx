"use client";

import { ChevronDown, Clock, Crosshair, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import { launcherLabel } from "@/lib/toolFilters";

import {
  CHIP_ACTIVE,
  CHIP_INACTIVE,
  GROUP_DIVIDER,
  GROUP_LABEL_CLASS,
  PANEL_CLASS,
  SEARCH_SHELL_CLASS,
  SEGMENT_IDLE,
  SEGMENT_PICKED,
  SEGMENTS_CLASS,
} from "./filterChrome";
import { ScopeSearchField } from "./ScopeSearchField";

/*
 * This panel's chips and either-or wells are menzu's (the owner, 24/10/2026:
 * "áp style bộ lọc menzu qua đi"; see filterChrome). The loose chips are the
 * shared 32px chip, a segment's height, in a row padded 4px above and below
 * so it stands as tall as a well: the chips line up with the segments, and
 * each group's caption with its neighbours' on the lg row. The wells and
 * their segments are filterChrome's, shared with the account panel: their
 * words the chips' 11px bold (menzu sets them 10px black; "lên 11px đi" made
 * the row one size).
 */
const PILL = CHIP_INACTIVE;
const PILL_ACTIVE = CHIP_ACTIVE;
const PILL_ROW = "flex flex-wrap items-center gap-2 py-1";
const SEGMENTS = SEGMENTS_CLASS;
const SEGMENT = SEGMENT_IDLE;
const SEGMENT_ACTIVE = SEGMENT_PICKED;

// The states a buyer shops by. "Rủi ro", "Đang cập nhật" and "Đã phát hiện"
// came off the chips (the owner, 07/10/2026: "bỏ 3 cái rủi ro đang cập nhật
// đã phát hiện đi"); an old link carrying one of them still filters, it just
// lights no chip. "Ổn định" leads after "Tất cả" (the owner, 24/10/2026:
// "sắp thứ tự ổn định, chưa phát hiện, cập nhật mới").
const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "stable", label: "Ổn định" },
  { value: "undetected", label: "Chưa phát hiện" },
  { value: "updated", label: "Cập nhật mới" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá ↑" },
  { value: "price-desc", label: "Giá ↓" },
] as const;

/** "Hoạt động" (the owner, 07/10/2026: "máy nhà, máy nét, tất cả"). */
const RUNS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "nha", label: "Máy nhà" },
  { value: "net", label: "Máy nét" },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];
type SortValue = (typeof SORT_OPTIONS)[number]["value"];
type RunsValue = (typeof RUNS_OPTIONS)[number]["value"];

/**
 * Search + filter panel above the software grid, sibling to the account one
 * below it and wearing the same chrome.
 *
 * It carries its own URL keys — `pm`, `cn`, `tt`, `pmsort` — rather than
 * reusing the account panel's `skin` and `sort`. A category can list both kinds
 * at once, and a single `sort` serving two grids would reorder the accounts
 * every time someone sorted the tools. For the same reason nothing here clears
 * `page`: that number belongs to the account listing, which this panel does not
 * touch.
 *
 * The two boxes narrow together rather than widening: a name and a feature both
 * filled means "this tool, and it does that", which is the question someone
 * typing in both boxes is asking.
 *
 * No price band, unlike the account panel. A tool costs whatever its cheapest
 * package costs, so a band would first have to explain which of three or four
 * prices it was matching; the two price sorts answer the same question without
 * the footnote.
 */
export function SoftwareFilterPanel({
  hint = "Tìm tool theo tên…",
  launchers = [],
}: {
  /** The example in the name box, built from this category's own tools. */
  hint?: string;
  /** The launcher keys this category's tools carry; none hides "Nền tảng". */
  launchers?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [nameQuery, setNameQuery] = useState(params.get("pm") ?? "");
  const [featureQuery, setFeatureQuery] = useState(params.get("cn") ?? "");
  const status = (params.get("tt") as StatusValue) ?? "all";
  const sort = (params.get("pmsort") as SortValue) ?? "newest";
  const runs = (params.get("hd") as RunsValue) ?? "all";
  /** A launcher key in lower case, as the URL carries it; "" is all. */
  const launcher = params.get("nt") ?? "";

  // Same arrangement as the account panel above it: optimistic copies of the
  // URL's two chip values, a transition around the push, and the grid told
  // through <html> that a filter is on its way.
  const [isPending, startTransition] = useTransition();
  const [shownStatus, showStatus] = useOptimistic(status);
  const [shownSort, showSort] = useOptimistic(sort);
  const [shownRuns, showRuns] = useOptimistic(runs);
  const [shownLauncher, showLauncher] = useOptimistic(launcher);
  /** The chip groups, on a phone: folded until asked for. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtering =
    shownStatus !== "all" || shownSort !== "newest" || shownRuns !== "all" || shownLauncher !== "";

  useEffect(() => {
    document.documentElement.toggleAttribute("data-filtering", isPending);
    return () => document.documentElement.removeAttribute("data-filtering");
  }, [isPending]);

  /** Rewrites the URL, which is what the listing actually reads. */
  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    startTransition(() => {
      // scroll: false keeps the shopper where they are; a filter that threw
      // them back to the top of the page made every chip a trip (24/10/2026,
      // "mỗi lần lọc là tự nhảy về đầu trang").
      router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    apply({ pm: nameQuery.trim(), cn: featureQuery.trim() });
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending} className="flex flex-col gap-3 w-full">
      {/* Split 6/4 like the account row above: the name is what most people
          arrive knowing, the feature is what they fall back on. */}
      <div className="flex flex-col md:flex-row gap-2.5">
        <div className="flex-[6] relative min-w-0">
          <ScopeSearchField
            value={nameQuery}
            onChange={setNameQuery}
            placeholder={hint}
            busy={isPending}
            // The breathing outline without the gold pill: the pill was tried
            // here and taken back off, the glow was asked to stay — breathing
            // purple into red rather than the account banner's red into gold.
            glow="brand"
          />
        </div>

        <div className="flex-[4] relative min-w-0">
          <div className={SEARCH_SHELL_CLASS}>
            {/* As big as the reticle in the field beside it, on trial
                (24/10/2026, "cho kích thước icon bên phải bằng kích thước
                icon bên trái đi cho đồng bộ thử"); it was 15px. */}
            <Crosshair size={22} className="text-neutral-500 shrink-0" />
            <input
              type="text"
              value={featureQuery}
              onChange={(event) => setFeatureQuery(event.target.value)}
              placeholder="Tìm chức năng (Aimbot, ESP…)"
              className="flex-1 bg-transparent outline-none text-white placeholder-neutral-500 text-sm cursor-text text-ellipsis"
            />
          </div>
        </div>

        <button
          type="submit"
          // A 12px corner like the chips below (the owner, 16/10/2026: "nút tìm
          // kiếm cũng z", after "tròn quá" about the chips); was rounded-3xl.
          className="hidden md:flex bg-[var(--brand)] hover:bg-[var(--brand-dark)] active:scale-95 text-white font-semibold rounded-xl px-6 transition items-center gap-2 shrink-0"
        >
          {isPending ? (
            <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Search size={16} />
          )}
          Tìm kiếm
        </button>
      </div>

      {/* On a phone the chip groups fold behind one row: two search boxes,
          three rows of chips and a full-width button took the whole first
          screen before a single product was in view. The row stays open
          by itself while a filter other than the default is on, so what is
          narrowing the list is never hidden. From md up the panel is
          always open, as before. */}
      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen || filtering}
        className="md:hidden flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] font-semibold text-neutral-300"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={14} aria-hidden />
          Bộ lọc
          {filtering ? (
            <span className="rounded-md bg-[var(--brand)]/15 px-1.5 py-0.5 text-[10px] text-[var(--brand)]">
              Đang lọc
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-200 motion-reduce:transition-none ${filtersOpen || filtering ? "rotate-180" : ""}`}
        />
      </button>
      <div className={filtersOpen || filtering ? "" : "hidden md:block"}>
      <div className={PANEL_CLASS}>
        {/* The groups on one row from lg, a hairline between each two, the
            way the original lays out its panel (the owner, 07/10/2026: "theo
            menzu có đường kẻ | giữa"); stacked on narrower screens. Pills
            for the open-ended lists, a segmented well for the short
            either-or ones. */}
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-4">
          <div>
            {/* First, because it is the one thing a tool is bought or
                abandoned on — the card leads with the same pill. */}
            <span className={GROUP_LABEL_CLASS}>Trạng thái</span>
            <div className={PILL_ROW}>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={shownStatus === option.value}
                  onClick={() =>
                    startTransition(() => {
                      showStatus(option.value);
                      apply({ tt: option.value === "all" ? "" : option.value });
                    })
                  }
                  className={shownStatus === option.value ? PILL_ACTIVE : PILL}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <span aria-hidden className={GROUP_DIVIDER} />

          <div>
            <span className={GROUP_LABEL_CLASS}>Hoạt động</span>
            <div className={SEGMENTS}>
              {RUNS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={shownRuns === option.value}
                  onClick={() =>
                    startTransition(() => {
                      showRuns(option.value);
                      apply({ hd: option.value === "all" ? "" : option.value });
                    })
                  }
                  className={shownRuns === option.value ? SEGMENT_ACTIVE : SEGMENT}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Only the launchers some tool here carries; none set yet on any
              of them, no group at all rather than a row that filters out
              everything. */}
          {launchers.length > 0 ? (
            <>
              <span aria-hidden className={GROUP_DIVIDER} />
              <div>
                <span className={GROUP_LABEL_CLASS}>Nền tảng</span>
                <div className={PILL_ROW}>
                  {["", ...launchers.map((key) => key.toLowerCase())].map((value) => (
                    <button
                      key={value || "all"}
                      type="button"
                      aria-pressed={shownLauncher === value}
                      onClick={() =>
                        startTransition(() => {
                          showLauncher(value);
                          apply({ nt: value });
                        })
                      }
                      className={shownLauncher === value ? PILL_ACTIVE : PILL}
                    >
                      {value ? launcherLabel(value.toUpperCase()) : "Tất cả"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <span aria-hidden className={GROUP_DIVIDER} />

          <div>
            <span className={GROUP_LABEL_CLASS}>Sắp xếp</span>
            <div className={SEGMENTS}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={shownSort === option.value}
                  onClick={() =>
                    startTransition(() => {
                      showSort(option.value);
                      apply({ pmsort: option.value === "newest" ? "" : option.value });
                    })
                  }
                  className={shownSort === option.value ? SEGMENT_ACTIVE : SEGMENT}
                >
                  {option.value === "newest" ? <Clock size={12} aria-hidden /> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      <button
        type="submit"
        className="press md:hidden flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-[14px] font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        {isPending ? (
          <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />
        ) : (
          <Search size={16} />
        )}
        Tìm kiếm
      </button>
    </form>
  );
}
