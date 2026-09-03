"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatVnd } from "./productData";
import { SoftwareCheckoutDialog } from "./SoftwareCheckoutDialog";

export interface SoftwareCardPackage {
  id: string;
  label: string;
  price: number;
}

export interface SoftwareCardView {
  code: string;
  /** /{category-slug}/{product-slug}, built by the query layer. */
  href: string;
  name: string;
  /** Named in the checkout dialog under the tool, as the product page does. */
  categoryName: string;
  imageUrl: string | null;
  /** The feature line under the title, e.g. "Aimbot · ESP · No Recoil". */
  description: string;
  status: "UNDETECTED" | "STABLE" | "UPDATED" | "RISKY" | "UPDATING" | "DETECTED" | null;
  packages: SoftwareCardPackage[];
  /** Null hides the download button rather than pointing it nowhere. */
  downloadUrl: string | null;
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
 */
export function SoftwareCard({ software }: { software: SoftwareCardView }) {
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
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const status = software.status ? STATUS[software.status] : null;
  const chosen = software.packages.find((p) => p.id === packageId) ?? null;
  const hasPackages = software.packages.length > 0;
  const detailHref = software.href;

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
    <div
      className={`group relative flex h-full w-full flex-col rounded-[15px] border border-[#24252a] bg-[#101114] transition-all duration-[250ms] hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-[0_15px_40px_#00000088] ${open ? "z-40" : ""}`}
    >
      {/* Picture flush to the card's edges. The shop's image when set; otherwise
          the reference's dark gradient with the tool's name centred over it. */}
      <Link href={detailHref} className="block">
        <div className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-t-[14px] bg-[linear-gradient(135deg,#171922,#36151e,#0d0e12)]">
          {software.imageUrl ? (
            <Image
              src={software.imageUrl}
              alt={software.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <span className="px-5 text-center text-2xl font-black uppercase leading-tight tracking-wide text-white/90">
              {software.name}
            </span>
          )}

          {status ? (
            <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0d0d12]/80 px-2.5 py-1 backdrop-blur-md">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[10px] font-black uppercase tracking-wide ${status.text}`}>
                {status.label}
              </span>
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {/* Title with the red marker bar, left-aligned. */}
        <Link href={detailHref} className="flex items-center gap-2.5">
          <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
          <h3 className="truncate text-[17px] font-black uppercase tracking-wide text-white transition-colors hover:text-[var(--menzu-accent)]">
            {software.name}
          </h3>
        </Link>

        {/* Two lines, held at that height so cards stay level whether the copy
            fills them or not. */}
        <p className="mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-[12px] leading-[1.55] text-[#9b9da5]">
          {software.description}
        </p>

        <div className="mt-auto flex flex-col gap-2">
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
                    ? `${chosen.label} — ${formatVnd(chosen.price)}đ`
                    : hasPackages
                      ? "Chọn gói"
                      : "Chưa có gói"
                } — ${software.name}`}
                onClick={() => hasPackages && setOpen((o) => !o)}
                className={`flex h-[42px] w-full items-center justify-between gap-1 rounded-[9px] border bg-[#111216] px-2.5 text-[11px] font-extrabold outline-none transition-colors duration-200 hover:border-[var(--menzu-accent)]/45 hover:text-white aria-expanded:border-[var(--menzu-accent)]/45 aria-expanded:text-white disabled:opacity-50 ${
                  chosen
                    ? "border-[var(--menzu-accent)]/45 text-white"
                    : "border-[#292a30] text-[#aaa]"
                }`}
              >
                <span className="truncate">
                  {chosen
                    ? `${chosen.label} — ${formatVnd(chosen.price)}đ`
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
                    className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full w-max max-w-[230px] overflow-hidden rounded-[10px] border border-[var(--menzu-accent)]/40 bg-[#160b0e] p-1.5 shadow-[0_18px_40px_#0009]"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={packageId === ""}
                      onClick={() => {
                        setPackageId("");
                        setHint(false);
                        setOpen(false);
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
                        }}
                        className={optionCls(p.id === packageId)}
                      >
                        {p.label} — {formatVnd(p.price)}đ
                      </button>
                    ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={rentNow}
              disabled={!hasPackages}
              className="h-[42px] rounded-[9px] bg-[var(--menzu-accent)] text-[11px] font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50"
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

          <Link
            href={detailHref}
            className="flex h-[42px] w-full items-center justify-center rounded-[9px] border border-[var(--menzu-accent)]/40 bg-transparent text-[11px] font-extrabold uppercase tracking-wide text-[#ddd] transition-colors hover:bg-[var(--menzu-accent)]/10"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>

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
      />
    </div>
  );
}
