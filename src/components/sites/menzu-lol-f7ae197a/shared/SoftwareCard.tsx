"use client";

import { ChevronDown, Download } from "lucide-react";
import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { sentenceCase, titleCase } from "@/lib/displayCase";
import { shortBlurb } from "@/lib/shortBlurb";
import { SOFTWARE_STATUS } from "@/lib/softwareStatus";
import { formatVnd, isFreeTool } from "./productData";
import { SoftwareCheckoutDialog } from "./SoftwareCheckoutDialog";

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
  /** New on the shelf (isNewTool): a "Mới nhất" ribbon on the picture. */
  isNew: boolean;
  /** A best seller (isBestSeller): a "Bán chạy" ribbon on the picture. */
  bestSeller: boolean;
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
 * The strip across the picture's top-left corner: a band turned 45° and
 * clipped to a square at the corner, the word running along the diagonal.
 * One per card, in the colour of what it says. Flat, with one thin lit
 * line along its top edge for a little depth (lab 3200 trial, 26/10/2026,
 * "thử đi 1p"): the satin sheen and shaded ends read too heavy over the
 * covers ("cái kia đậm quá").
 */
function CornerRibbon({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="pointer-events-none absolute left-0 top-0 z-20 block h-[92px] w-[92px] overflow-hidden rounded-tl-[14px]">
      <span
        className={`absolute left-[-40px] top-[22px] block w-[150px] -rotate-45 ${tone} py-[5px] text-center text-[12px] font-semibold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_10px_rgba(0,0,0,0.5)]`}
      >
        {label}
      </span>
    </span>
  );
}

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
 *
 * The top is the home page's game tile (19/10/2026, "làm cho nó đồng bộ với
 * trang chủ card"): the name and, on the shelf, "Chỉ từ …đ" sit on the
 * picture over the tiles' shade, in their sizes and greys, and the card
 * takes their 14px corners and faint rim. The rent button is the picker's
 * and "Xem chi tiết"'s 42px with 10px corners, all three worded 12px
 * semibold (24/10/2026, after 11px and 800 trials: "tạm chốt bản này"), and
 * the state reads the site's colours (lib/softwareStatus). `old` is the
 * lab's ?ban=cu: the card as it was.
 */
export function SoftwareCard({
  software,
  variant = "shelf",
  priority = false,
  eager = false,
  old = false,
}: {
  software: SoftwareCardView;
  variant?: "shelf" | "compact";
  /** The page's LCP image (first in its grid, nothing drawn above it):
   *  preloaded and fetched at High. One per page. */
  priority?: boolean;
  /** Also above the fold: fetched before the rest, at no raised priority. */
  eager?: boolean;
  /** LAB: ?ban=cu, the card from before 19/10/2026. */
  old?: boolean;
}) {
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
  const status = software.status && !free ? (old ? STATUS : SOFTWARE_STATUS)[software.status] : null;
  const chosen = software.packages.find((p) => p.id === packageId) ?? null;
  const hasPackages = software.packages.length > 0;
  const detailHref = software.href;
  const minPrice = software.packages.length
    ? Math.min(...software.packages.map((p) => p.price))
    : null;
  const freeHref = detailHref;
  const FREE_BUTTON =
    "flex h-[42px] items-center justify-center gap-2 rounded-[10px] bg-[var(--menzu-accent)] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]";

  // One dropdown row. Same 11px/Inter as the trigger and the buttons, so the
  // open list matches the card exactly (the whole reason for a custom picker
  // over a native select). The chosen row is filled red; the rest sit light
  // grey and turn red on hover.
  const optionCls = (selected: boolean) =>
    `block w-full whitespace-nowrap rounded-[7px] px-3 py-2 text-left transition-colors ${
      old ? "text-[11px] font-extrabold" : "text-[13px] font-semibold"
    } ${
      selected
        ? "bg-[var(--menzu-accent)] text-white"
        : "text-neutral-200 hover:bg-[var(--menzu-accent)]/10"
    }`;
  // The rent button at the picker's and "Xem chi tiết"'s height and corners.
  const RENT = old ? "h-11 rounded-xl" : "h-[42px] rounded-[10px]";
  // The pills on the picture keep their dark glass, for a photo under them,
  // and take the site's chip shape: 8px corners like the home tile's "Top
  // tháng" and the state chips, semibold words (19/10/2026, "làm thử").
  const PILL_SHAPE = old ? "rounded-full font-medium" : "rounded-md font-semibold";

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
    // On hover the card lifts 4px, its edge turns red and a shadow falls under
    // it: 3100's effect (24/10/2026, "lấy hiệu ứng card 3100", "thêm hiệu ứng
    // viền đỏ ngoài khi rê").
    // At rest the edge is white 10%, a step above the home tiles' 6%: the
    // product cards only (24/10/2026, "lên viền cho card sản phẩm ... thôi").
    // The hover lift is a transform, which makes the card its own stacking
    // context: the open tier list, however high its z-index, could never rise
    // above the cards and sections drawn after this one. While the list is
    // open the whole card steps up a layer instead.
    // tool-card, tool-status, tool-status-line and tool-more are hooks for the
    // light trial "moi" (theme-light.css, part 6); no style of their own.
    <div
      className={`tool-card group relative flex h-full w-full flex-col bg-panel transition-colors ${
        old
          ? "lab-notch border border-line hover:border-line-strong"
          : "rounded-[14px] border border-white/10 lift-card hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-[0_15px_40px_#00000088]"
      } ${open ? "z-40" : ""}`}
    >
      {/* Picture flush to the card's edges. The shop's image when set; otherwise
          the reference's dark gradient, under the name. */}
      <Link href={detailHref} className="block">
        <div
          className={`relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-[linear-gradient(135deg,#171922,#36151e,#0d0e12)] ${
            old ? "lab-notch-top" : "rounded-t-[14px]"
          }`}
        >
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
              className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            />
          ) : old ? (
            <span className="px-5 text-center text-2xl font-black leading-tight text-white/90">
              {software.name}
            </span>
          ) : null}

          {!old && variant === "shelf" ? (
            // The shelf's picture stands clean (the owner, 23/10/2026: "bỏ
            // cái hiệu ứng đen mờ"): no shade, the name and the price below
            // it; only the red line it lights on hover stays.
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : old ? null : (
            // The home tile's shade, the red line it lights on hover, and its
            // caption: the name in the tile's black 17px, up to two lines,
            // and on the shelf the cheapest tier in its 13px grey.
            <>
              <span aria-hidden className="absolute inset-0 lab-lmarket-shade" />
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="absolute inset-x-3.5 bottom-3 flex flex-col gap-1 text-left">
                <h3
                  title={sentenceCase(software.name)}
                  className="line-clamp-2 text-[17px] font-black leading-[1.15] text-white transition-colors duration-300 group-hover:text-[var(--menzu-accent)]"
                >
                  {sentenceCase(software.name)}
                </h3>
                {variant === "shelf" && minPrice !== null && !free ? (
                  <span className="truncate text-[13px] font-medium leading-snug text-neutral-400">
                    Chỉ từ {formatVnd(minPrice)}đ
                  </span>
                ) : null}
              </span>
            </>
          )}

          {free ? (
            // A red ribbon across the picture's corner in place of the green
            // pill (the owner, 13/10/2026: "thay vì ghi miễn phí có cái tag
            // chéo góc bìa card đỏ"): a strip turned 45° and clipped to a
            // square at the corner, the word running along the diagonal.
            <CornerRibbon label="Miễn phí" tone="bg-[var(--menzu-accent)]" />
          ) : software.isNew ? (
            // The same ribbon for a tool new on the shelf (the owner,
            // 26/10/2026, lab 3200: "thêm 1 nhãn ruy băng cho card sản phẩm là
            // mới màu xanh lá", then "màu tím thử": violet, the site's purple,
            // where it was emerald; for the word "ghi mới nhất", then "HACK
            // MỚI ĐI", then back to "MỚI NHẤT ĐI CHO RÕ NGHĨA"). A free tool
            // keeps its red one: being free says more than being new.
            <CornerRibbon label="Mới nhất" tone="bg-violet-600" />
          ) : software.bestSeller ? (
            // And in orange for a best seller (the owner, 26/10/2026, lab 3200:
            // "thêm 1 nhãn nữa màu xanh dương bán chạy", then "màu cam": it was
            // blue; for the word "bán chạy thành best seller thử", then back,
            // "ghi bán chạy đi"), from the shop's own
            // "... BÁN CHẠY" badge. Under "Mới nhất": a tool's first weeks
            // are short, and its sales will still be there after.
            <CornerRibbon label="Bán chạy" tone="bg-orange-600" />
          ) : software.verifiedOnly ? (
            // Sold to level 2 only (the owner, 12/10/2026): the buyer learns it
            // on the card, not after the click.
            <span
              className={`absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 border border-white/10 bg-panel/88 px-2.5 py-1 text-[12px] text-amber-300 ${PILL_SHAPE}`}
            >
              Cấp 2
            </span>
          ) : null}

          {status ? (
            <span
              className={`tool-status absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 border border-white/10 bg-panel/88 px-2.5 py-1 ${PILL_SHAPE}`}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[12px] ${old ? "font-medium" : "font-semibold"} ${status.text}`}>
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
        {/* Title with the red marker bar, left-aligned (the old card; the new
            one names the tool on its picture). */}
        {old ? (
          <Link href={detailHref} className="flex items-center gap-2.5">
            <h3
              title={sentenceCase(software.name)}
              className="truncate font-display text-[17px] font-semibold text-frost transition-colors hover:text-white"
            >
              {sentenceCase(software.name)}
            </h3>
          </Link>
        ) : null}

        {!old && variant === "shelf" ? (
          // Under the picture now that it has no shade to carry them, in the
          // sizes they had on it (23/10/2026: "theo bố cục, kích thước giữ
          // y nguyên"), every word's first letter capital and the acronyms
          // kept ("viết hoa chữ cái đầu… CFVN thì khỏi"). The name runs to
          // two lines, then "…" (24/10/2026: "TIÊU ĐỀ 2 hàng đi"), and holds
          // two lines' height so the copy under it starts level along a row.
          // 3100's red marker bar stands by its first line (24/10/2026,
          // after two trials: "THÊM CẠCH ĐỎ LẠI ĐI"). 16px, a step under the
          // home tile's 17px so the picture leads (lmarket's and unnamed's
          // product names are 14 and 16px; "vậy 16 đi"). Lab 3200 trial,
          // 26/10/2026: 17px, the home tile's own size, so the name stands
          // clear of the 13px copy ("thử trong 5p phương án lên 17px"); on
          // the shop's 37 tools it cuts no more names than 16px did. 18px
          // was tried too and cut five more; the owner settled on 17 ("chốt
          // 17 px cái đi"), then asked to see 18 once more ("card sản phẩm
          // 18px thử") and, after flipping between the two, settled on 18
          // ("chốt 18px"), five more long names ending in "…" with it. 17
          // or 18 stays open on the backlog page ("đưa cái này vô artifact").
          <div>
            <Link href={detailHref} className="flex items-start gap-2.5">
              <span aria-hidden className="mt-1 h-4 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
              <h3
                title={titleCase(software.name)}
                className="line-clamp-2 min-h-[2.5em] min-w-0 break-words text-[18px] font-extrabold leading-[1.25] text-white transition-colors duration-300 group-hover:text-[var(--menzu-accent)]"
              >
                {titleCase(software.name)}
              </h3>
            </Link>
            {/* No "Chỉ từ …" line under the name (the owner, 23/10/2026:
                "bỏ dòng Chỉ từ 40.000đ"): the package picker below
                prices each tier. */}
          </div>
        ) : null}

        {/* Two lines, held at that height so cards stay level whether the copy
            fills them or not. Back on the shelf's card too (the owner,
            23/10/2026: "bỏ dòng mô tả thử", then "thêm lại dòng mô tả đi").
            On the shelf the name and the copy read as one four-line block
            (the owner, 26/10/2026: "tên với chữ mô tả nó cứ bằng bằng nhau
            … loạn mắt"), so, a lab 3200 trial: the name's two lines closer
            (20px, were 22), 12px between them (was 8) and the copy a step
            dimmer, still well over 4.5:1 on the card. */}
        <p
          className={`mb-[14px] line-clamp-2 min-h-[37px] text-[13px] leading-[1.55] ${
            !old && variant === "shelf" ? "mt-3 text-mist/80" : "text-mist"
          } ${old ? "mt-2" : ""}`}
        >
          {old ? software.description : shortBlurb(software.description ?? "")}
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
                  {/* The prices' one look, the account card's black with its
                      tight tracking (25/10/2026: "đồng bộ tỷ lệ ấy"). */}
                  <span className="font-display text-[22px] font-black leading-none tabular-nums tracking-[-0.03em] text-frost">
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
                className={`inline-flex shrink-0 items-center gap-2 bg-[var(--menzu-accent)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] ${RENT}`}
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
                className={`flex h-[42px] w-full items-center justify-between gap-1 rounded-[10px] border bg-white/[0.02] px-2.5 outline-none transition-colors duration-200 hover:border-[var(--menzu-accent)]/45 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/40 aria-expanded:border-[var(--menzu-accent)]/45 aria-expanded:text-white disabled:opacity-50 ${
                  old ? "text-[11px] font-extrabold" : "text-[12px] font-semibold"
                } ${
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
              className={`bg-[var(--menzu-accent)] text-[12px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 ${RENT}`}
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
            className="tool-more flex h-[42px] w-full items-center justify-center rounded-[10px] border border-[var(--menzu-accent)]/40 bg-transparent text-[12px] font-semibold text-[#ddd] transition-colors hover:bg-[var(--menzu-accent)]/10"
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
