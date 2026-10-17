"use client";

import { ChevronDown, Download } from "lucide-react";
import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { TileStyle } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";
import { sentenceCase, titleCase, withoutNewWord } from "@/lib/displayCase";
import { cn } from "@/lib/utils";
import { formatVnd, isFreeTool } from "./productData";
import { SoftwareCheckoutDialog } from "./SoftwareCheckoutDialog";

/**
 * LAB: how a shelf card's picture follows the home page's game tile dress
 * (the owner, 17/10/2026: "trang chi tiết danh mục làm đồng bộ lại đi và có
 * đủ phiên bản để đồng bộ từ a3 a4 a5 a6 b3 b4 b5 b6"). The picture takes the
 * dress's shade and brightness and the tool's name and price move onto its
 * foot in the dress's words; the body keeps the summary, the tier picker and
 * the buttons, which no picture could carry. Dresses that are not drawn over
 * the picture (classic, the first A6, C, C1, D) leave the card as it was.
 */
interface DressLook {
  /** Whose words sit on the picture: A's, lmarket's best-seller (A5) or B's. */
  family: "a" | "a5" | "b";
  /** Classes on the picture itself (A1's and B's dimming). */
  picture: string;
  /** Each shade laid over the picture, positioned by its own classes. */
  shades: string[];
  /** B's small red line over the name. */
  eyebrow: boolean;
  /** The name turns red under the pointer, as on the home tiles. */
  redName: boolean;
  /** A2 lights the rim red under the pointer. */
  redRim: boolean;
}

const A1_FADE = "absolute inset-0 bg-gradient-to-t from-scrim via-scrim/60 via-35% to-scrim/10";
const ELITE = "absolute inset-0 lab-elite-shade";
const ELITE_LIGHT = "absolute inset-0 lab-elite-shade lab-elite-shade-light";
const LMARKET = "absolute inset-0 lab-lmarket-shade";
const FOOT = "lab-lm-foot";
const A1_PICTURE = "brightness-[.72] saturate-[.9] group-hover:brightness-[.85]";

function dressLook(dress: TileStyle | undefined): DressLook | null {
  const a = (shades: string[], redName = true, redRim = false, picture = ""): DressLook =>
    ({ family: "a", picture, shades, eyebrow: false, redName, redRim });
  const b = (shades: string[], eyebrow = true, picture = ""): DressLook =>
    ({ family: "b", picture, shades, eyebrow, redName: false, redRim: false });
  switch (dress) {
    case "a":
      return a([A1_FADE], false, false, A1_PICTURE);
    case "a2":
      return a([ELITE], true, true);
    case "a3":
      return a([ELITE_LIGHT]);
    case "a4":
      return a([LMARKET]);
    case "a5":
      return { family: "a5", picture: "", shades: [LMARKET], eyebrow: false, redName: true, redRim: false };
    case "a6":
      return a([FOOT]);
    case "b":
      return b(
        ["absolute inset-0 bg-scrim/25", "absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-scrim/90 to-transparent"],
        true,
        "brightness-[.55] group-hover:brightness-[.7]",
      );
    case "b1":
      return b([A1_FADE], true, A1_PICTURE);
    case "b2":
      return b([ELITE]);
    case "b3":
      return b([ELITE_LIGHT]);
    case "b4":
      return b([LMARKET], false);
    case "b6":
      return b([FOOT]);
    default:
      return null;
  }
}

export interface SoftwareCardPackage {
  id: string;
  label: string;
  price: number;
  /**
   * The shelf price while a flash sale runs on this tier, to cross out beside
   * `price`, which is then the sale price. Absent when there is no sale.
   */
  listPrice?: number;
}

export interface SoftwareCardView {
  code: string;
  /** /{category-slug}/{product-slug}, built by the query layer. */
  href: string;
  name: string;
  /** Named in the checkout dialog under the tool, as the product page does. */
  categoryName: string;
  imageUrl: string | null;
  /** The two lines under the title: the tool's "Mô tả ngắn", or "" for none. */
  description: string;
  status: "UNDETECTED" | "STABLE" | "UPDATED" | "RISKY" | "UPDATING" | "DETECTED" | null;
  packages: SoftwareCardPackage[];
  /** Sold to level-2 ("xác thực cấp 2") accounts only: the card says so. */
  verifiedOnly: boolean;
}

/**
 * The status pill, matched to the product page: a dim rounded chip with a
 * coloured dot and label. The hue (emerald / red / amber) carries the meaning,
 * since that pill is what a tool is bought or abandoned on.
 */
const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  UNDETECTED: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Chưa phát hiện" },
  DETECTED: { dot: "bg-red-500", text: "text-red-400", label: "Đã phát hiện" },
  UPDATING: { dot: "bg-amber-500", text: "text-amber-400", label: "Đang cập nhật" },
  STABLE: { dot: "bg-sky-500", text: "text-sky-400", label: "Ổn định" },
  UPDATED: { dot: "bg-violet-500", text: "text-violet-400", label: "Cập nhật mới" },
  RISKY: { dot: "bg-orange-500", text: "text-orange-400", label: "Rủi ro" },
};

/**
 * A software listing tile, laid out to the shop's reference: a flush 16/9
 * picture, then a padded body with the title, a two-line feature summary, an
 * equal split of tier-select and rent, and a full-width details button.
 *
 * The card is a div, not one big anchor: it carries a select and buttons, and a
 * form control inside an `<a>` is invalid and unusable. Only the picture, the
 * title and "Xem chi tiết" lead to the product page.
 *
 * `variant="compact"` (the "Sản phẩm tương tự" strip) sells nothing on the tile:
 * the tier picker and rent button give way to the cheapest tier as
 * "Chỉ từ …" and one white pill to the page.
 */
export function SoftwareCard({
  software,
  variant = "shelf",
  priority = false,
  eager = false,
  dress,
}: {
  software: SoftwareCardView;
  variant?: "shelf" | "compact";
  /** The page's LCP image (first in its grid, nothing drawn above it):
   *  preloaded and fetched at High. One per page. */
  priority?: boolean;
  /** Also above the fold: fetched before the rest, at no raised priority. */
  eager?: boolean;
  /** LAB: the home page's game tile dress to follow (see dressLook). */
  dress?: TileStyle;
}) {
  const look = variant === "shelf" ? dressLook(dress) : null;
  const [packageId, setPackageId] = useState("");
  const [hint, setHint] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the tier dropdown on an outside click or Escape. Bound only while it
  // is open, off a document listener rather than a fixed backdrop — the card's
  // hover transform would otherwise trap a fixed overlay inside the card.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // The trigger takes focus back; it used to fall to <body>.
      dropdownRef.current?.querySelector<HTMLElement>('button[aria-haspopup="listbox"]')?.focus({ preventScroll: true });
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * A free tool (the shop's 1đ placeholder tier) gets its own card (the
   * owner, 07/10/2026: "thiết kế card cho phần mềm thuộc dạng miễn phí" →
   * "b"): a ribbon across the picture's corner (13/10/2026) and one
   * "Tải ngay" (13/10/2026, was "Nhận miễn phí") in
   * the shop's red (a green one glared: "xanh lá chói quá… đỏ hoặc tím")
   * that leads to the tool's own page, where the key is handed out behind
   * the shop's shortlink (12/10/2026; until then it opened the download
   * link), in place of a tier list reading "999999999 giờ - 1đ" and a
   * "Thuê ngay" that charged 1đ.
   */
  const free = isFreeTool(software.packages);
  // No status label on a free tool (the owner, 16/10/2026: "Hack miễn phí
  // nên bỏ cái nhãn chưa phát hiện"): it is a try-out, not a sold build.
  const status = software.status && !free ? STATUS[software.status] : null;
  const chosen = software.packages.find((p) => p.id === packageId) ?? null;
  const hasPackages = software.packages.length > 0;
  const detailHref = software.href;
  const minPrice = software.packages.length
    ? Math.min(...software.packages.map((p) => p.price))
    : null;
  const freeHref = detailHref;
  const FREE_BUTTON =
    "flex h-[42px] items-center justify-center gap-2 rounded-[10px] bg-[var(--menzu-accent)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]";

  // One dropdown row. Same 11px/Inter as the trigger and the buttons, so the
  // open list matches the card exactly (the whole reason for a custom picker
  // over a native select). The chosen row is filled red; the rest sit light
  // grey and turn red on hover.
  const optionCls = (selected: boolean) =>
    `block w-full whitespace-nowrap rounded-[7px] px-3 py-2 text-left text-[11px] font-extrabold transition-colors ${
      selected
        ? "bg-[var(--menzu-accent)] text-white"
        : "text-neutral-200 hover:bg-[var(--menzu-accent)]/10"
    }`;

  /**
   * Opens the same "Xác nhận mua" the product page uses, right here: a buyer
   * who has picked a tier on the shelf should not have to walk into the
   * product page to pay for it. Nothing is charged on this click — the
   * dialog shows the sum and asks once, as it does there.
   */
  function rentNow() {
    if (!chosen) {
      setHint(true);
      return;
    }
    setConfirming(true);
  }

  return (
    // The hover lift is a transform, which makes the card its own stacking
    // context: the open tier list, however high its z-index, could never rise
    // above the cards and sections drawn after this one. While the list is
    // open the whole card steps up a layer instead.
    // tool-card, tool-status, tool-status-line and tool-more are hooks for the
    // light trial "moi" (theme-light.css, part 6); no style of their own.
    <div
      className={cn(
        "tool-card lab-notch group relative flex h-full w-full flex-col border border-line bg-panel transition-colors hover:border-line-strong",
        look?.redRim && "hover:border-[var(--menzu-accent)]",
        open && "z-40",
      )}
    >
      {/* Picture flush to the card's edges. The shop's image when set; otherwise
          the reference's dark gradient with the tool's name centred over it. */}
      <Link href={detailHref} className="block">
        <div className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden lab-notch-top bg-[linear-gradient(135deg,#171922,#36151e,#0d0e12)]">
          {software.imageUrl ? (
            <CardImage
              src={software.imageUrl}
              alt={software.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              {...(priority
                ? { preload: true, fetchPriority: "high" as const }
                : eager
                  ? { loading: "eager" as const }
                  : {})}
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-[1.025]",
                look?.picture,
              )}
            />
          ) : look ? null : (
            <span className="px-5 text-center text-2xl font-black leading-tight text-white/90">
              {software.name}
            </span>
          )}

          {look ? (
            <>
              {look.shades.map((shade) => (
                <span key={shade} aria-hidden className={cn("tile-scrim", shade)} />
              ))}
              {/* The name and the price on the picture's foot, in the home
                  tile's words for this dress. */}
              <span className="tile-caption absolute inset-x-4 bottom-3.5 z-10 flex flex-col gap-1 text-left">
                {look.eyebrow ? (
                  <span className="text-[12px] font-semibold text-[var(--menzu-accent)]">Hack game</span>
                ) : null}
                <span
                  title={sentenceCase(software.name)}
                  className={cn(
                    "line-clamp-2 text-white",
                    look.family === "a" && "text-[17px] font-black leading-[1.15]",
                    look.family === "a5" && "text-[17px] font-bold leading-tight",
                    look.family === "b" && "text-[15px] font-bold leading-tight tracking-wide",
                    look.redName && "transition-colors duration-300 group-hover:text-[var(--menzu-accent)]",
                  )}
                >
                  {titleCase(withoutNewWord(software.name))}
                </span>
                {free ? (
                  <span className="text-[12px] font-semibold text-neutral-200">Miễn phí</span>
                ) : minPrice === null ? null : look.family === "a5" ? (
                  <span className="mt-1 text-[13px] text-neutral-400">
                    từ <span className="lab-figure text-[16px] font-bold text-white">{formatVnd(minPrice)}đ</span>
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-[12px]",
                      look.family === "a" ? "font-semibold text-neutral-200" : "font-medium text-neutral-400",
                    )}
                  >
                    {look.family === "a" ? "Chỉ từ" : "Từ"} {formatVnd(minPrice)}đ
                  </span>
                )}
              </span>
            </>
          ) : null}

          {free ? (
            // A red ribbon across the picture's corner in place of the green
            // pill (the owner, 13/10/2026: "thay vì ghi miễn phí có cái tag
            // chéo góc bìa card đỏ"): a strip turned 45° and clipped to a
            // square at the corner, the word running along the diagonal.
            <span className="pointer-events-none absolute left-0 top-0 z-20 block h-[92px] w-[92px] overflow-hidden rounded-tl-[14px]">
              <span className="absolute left-[-40px] top-[22px] block w-[150px] -rotate-45 bg-[var(--menzu-accent)] py-[5px] text-center text-[12px] font-semibold leading-none text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                Miễn phí
              </span>
            </span>
          ) : software.verifiedOnly ? (
            // Sold to level 2 only (the owner, 12/10/2026): the buyer learns it
            // on the card, not after the click.
            <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-panel/88 px-2.5 py-1 text-[12px] font-medium text-amber-300">
              Cấp 2
            </span>
          ) : null}

          {status ? (
            <span className="tool-status absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-panel/88 px-2.5 py-1">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[12px] font-medium ${status.text}`}>
                {status.label}
              </span>
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {/* The status again as a small coloured line over the name, for the
            light trial "moi" only, which takes the pill off the picture
            (judge's graft, 14/10/2026). Hidden everywhere else, so the other
            dresses read the pill once and this never. */}
        {status ? (
          <p className={`tool-status-line hidden ${status.text}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </p>
        ) : null}
        {/* Title with the red marker bar, left-aligned. Under a home dress the
            name sits on the picture instead, so here it is only read. */}
        <Link href={detailHref} className={look ? "sr-only" : "flex items-center gap-2.5"}>
          <h3
            title={sentenceCase(software.name)}
            className="truncate font-display text-[17px] font-semibold text-frost transition-colors hover:text-white"
          >
            {sentenceCase(software.name)}
          </h3>
        </Link>

        {/* Two lines, held at that height so cards stay level whether the copy
            fills them or not. */}
        <p className={cn("mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-[13px] leading-[1.55] text-mist", look && "mt-0")}>
          {software.description}
        </p>

        {variant === "compact" ? (
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div className="min-w-0">
              {/* "Chỉ từ Miễn phí" read as nothing: a free tool's figure
                  stands alone. */}
              {free ? null : (
                <span className="block text-[12px] text-dim">
                  Chỉ từ
                </span>
              )}
              {minPrice !== null && !free ? (
                <span className="mt-1 flex items-baseline gap-1">
                  <span className="lab-figure text-[22px] font-bold leading-none text-frost">
                    {formatVnd(minPrice)}
                  </span>
                  <span className="text-[13px] font-semibold text-dim">đ</span>
                </span>
              ) : (
                <span className="mt-1 block font-display text-[19px] font-bold leading-none text-frost">
                  {minPrice === null ? "Liên hệ" : "Miễn phí"}
                </span>
              )}
            </div>
            {free ? (
              <a
                href={freeHref}
                className={`${FREE_BUTTON} shrink-0`}
              >
                <Download size={14} strokeWidth={2.75} aria-hidden />
                Tải ngay
              </a>
            ) : (
              <Link
                href={detailHref}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
              >
                Thuê ngay
              </Link>
            )}
          </div>
        ) : (
        <div className="mt-auto flex flex-col gap-2">
          {free ? (
            <a
              href={freeHref}
              className={`${FREE_BUTTON} w-full`}
            >
              <Download size={14} strokeWidth={2.75} aria-hidden />
              Tải ngay
            </a>
          ) : (
          <>
          <div className="grid grid-cols-2 gap-2">
            {/* Custom picker: a native <select>'s open list is drawn by the OS
                in its own font and size, so it never matches the card. This one
                is real elements — same 11px Inter throughout — and carries the
                reference's red styling. State and handoff are unchanged. */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                disabled={!hasPackages}
                aria-haspopup="listbox"
                aria-expanded={open}
                // The visible words come first, then which tool they belong
                // to. An aria-label that does not begin with the text on the
                // button leaves anyone driving the page by voice unable to
                // say what they can see — "chọn gói" was the label while the
                // button read "-- Chọn gói --" or a tier and a price.
                aria-label={`${
                  chosen
                    ? `${chosen.label} - ${formatVnd(chosen.price)}đ`
                    : hasPackages
                      ? "Chọn gói"
                      : "Chưa có gói"
                } - ${software.name}`}
                onClick={() => hasPackages && setOpen((o) => !o)}
                className={`flex h-[42px] w-full items-center justify-between gap-1 rounded-[10px] border bg-white/[0.02] px-2.5 text-[11px] font-extrabold outline-none transition-colors duration-200 hover:border-[var(--menzu-accent)]/45 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/40 aria-expanded:border-[var(--menzu-accent)]/45 aria-expanded:text-white disabled:opacity-50 ${
                  chosen
                    ? "border-[var(--menzu-accent)]/45 text-white"
                    : "border-[#292a30] text-[#aaa]"
                }`}
              >
                <span className="truncate">
                  {chosen
                    ? `${chosen.label} - ${formatVnd(chosen.price)}đ`
                    : hasPackages
                      ? "-- Chọn gói --"
                      : "Chưa có gói"}
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open ? (
                <div
                    role="listbox"
                    className="drop-in absolute left-0 top-[calc(100%+6px)] z-50 min-w-full w-max max-w-[230px] overflow-hidden rounded-[10px] border border-[var(--menzu-accent)]/40 bg-[#160b0e] p-1.5 shadow-[0_18px_40px_#0009]"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={packageId === ""}
                      onClick={() => {
                        setPackageId("");
                        setHint(false);
                        setOpen(false);
                        dropdownRef.current?.querySelector<HTMLElement>('button[aria-haspopup="listbox"]')?.focus({ preventScroll: true });
                      }}
                      className={`mb-1 ${optionCls(packageId === "")}`}
                    >
                      -- Chọn gói --
                    </button>
                    {software.packages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={p.id === packageId}
                        onClick={() => {
                          setPackageId(p.id);
                          setHint(false);
                          setOpen(false);
                          dropdownRef.current?.querySelector<HTMLElement>('button[aria-haspopup="listbox"]')?.focus({ preventScroll: true });
                        }}
                        className={optionCls(p.id === packageId)}
                      >
                        {p.label} - {formatVnd(p.price)}đ
                        {p.listPrice ? (
                          <span className="ml-1.5 text-[11px] text-[#8a8c94] line-through">
                            {formatVnd(p.listPrice)}đ
                          </span>
                        ) : null}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={rentNow}
              disabled={!hasPackages}
              className="h-11 rounded-xl bg-[var(--menzu-accent)] text-[14px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50"
            >
              Thuê ngay
            </button>
          </div>

          {/* One slot that is always in the tree, so a line appearing here
              is appended into it rather than inserted between siblings. */}
          <div aria-live="polite" className="empty:hidden">
            {hint ? (
              <p role="alert" className="text-[11px] font-semibold text-[var(--menzu-accent)]">
                Hãy chọn gói thời hạn trước.
              </p>
            ) : null}
          </div>
          </>
          )}

          <Link
            href={detailHref}
            className="tool-more flex h-[42px] w-full items-center justify-center rounded-[10px] border border-[var(--menzu-accent)]/40 bg-transparent text-[14px] font-semibold text-[#ddd] transition-colors hover:bg-[var(--menzu-accent)]/10"
          >
            Xem chi tiết
          </Link>
        </div>
        )}
      </div>

      {variant === "shelf" ? (
      <SoftwareCheckoutDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        product={{
          code: software.code,
          name: software.name,
          categoryName: software.categoryName,
          imageUrl: software.imageUrl,
          loginNext: detailHref,
        }}
        tier={chosen}
        quantity={1}
        risky={software.status === "RISKY"}
      />
      ) : null}
    </div>
  );
}
