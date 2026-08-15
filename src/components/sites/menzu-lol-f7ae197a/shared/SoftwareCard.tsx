"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatVnd } from "./productData";

export interface SoftwareCardPackage {
  id: string;
  label: string;
  price: number;
}

export interface SoftwareCardView {
  code: string;
  name: string;
  imageUrl: string | null;
  status: "UNDETECTED" | "DETECTED" | "UPDATING" | null;
  packages: SoftwareCardPackage[];
  /** Null hides the download button rather than pointing it nowhere. */
  downloadUrl: string | null;
}

/**
 * The status pill, as filled chips.
 *
 * The brief's card shows one solid red chip. Painting all three that colour
 * would have made "safe to use" and "caught by anti-cheat" identical at a
 * glance, and that pill is the single thing a tool is bought or abandoned on —
 * so the shape, the corner and the weight are copied from the design and only
 * the hue still carries the meaning.
 */
const STATUS: Record<string, { chip: string; label: string }> = {
  UNDETECTED: { chip: "bg-emerald-500", label: "Undetected" },
  DETECTED: { chip: "bg-red-600", label: "Detected" },
  UPDATING: { chip: "bg-[var(--menzu-accent)]", label: "Đang cập nhật" },
};

/**
 * A software listing tile.
 *
 * The card is a div, not one big anchor. It carries a select and two buttons,
 * and a form control inside an `<a>` is both invalid markup and unusable — a
 * click meant for the dropdown would navigate instead. Only the picture and
 * the title link out.
 */
export function SoftwareCard({ software }: { software: SoftwareCardView }) {
  const router = useRouter();
  const [packageId, setPackageId] = useState("");
  const [hint, setHint] = useState(false);

  const status = software.status ? STATUS[software.status] : null;
  const chosen = software.packages.find((p) => p.id === packageId) ?? null;
  const hasPackages = software.packages.length > 0;

  /**
   * Hands off to the product page with the tier already selected rather than
   * charging from here. The wallet confirmation lives there, and a listing
   * card that could spend money on one click — with the price of whichever
   * tier happened to be in the dropdown — is not a card anyone should trust.
   */
  function buyNow() {
    if (!chosen) {
      setHint(true);
      return;
    }
    router.push(`/software/${software.code}?pkg=${encodeURIComponent(chosen.id)}`);
  }

  return (
    <div className="h-full w-full group flex flex-col rounded-2xl bg-[#0b0b0f] p-3">
      <Link href={`/software/${software.code}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-950">
          {software.imageUrl ? (
            <Image
              src={software.imageUrl}
              alt={software.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}

          {status ? (
            <span
              className={`absolute top-2.5 right-2.5 z-20 rounded-md px-2.5 py-1 text-[10px] font-black text-white shadow-lg ${status.chip}`}
            >
              {status.label}
            </span>
          ) : null}
        </div>
      </Link>

      <Link href={`/software/${software.code}`} className="block px-1 pt-4 pb-3">
        {/* Sized against the control boxes below it so the block reads as one
            set. The title stays the heaviest thing on the card, but not by so
            much that a long name pushes the buttons out of sight. */}
        <h3 className="text-center text-[19px] font-black uppercase leading-tight tracking-wide text-white hover:text-[var(--menzu-accent)] transition-colors">
          {software.name}
        </h3>
      </Link>

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-stretch gap-2">
          <select
            value={packageId}
            disabled={!hasPackages}
            aria-label={`Chọn gói cho ${software.name}`}
            onChange={(e) => {
              setPackageId(e.target.value);
              setHint(false);
            }}
            className="min-w-0 basis-[42%] rounded-lg border border-white/15 bg-[#15151b] px-2.5 py-2 text-[11px] font-semibold text-neutral-200 outline-none focus:border-[var(--menzu-accent)]/70 disabled:opacity-50 transition-colors"
          >
            <option value="" className="bg-neutral-900">
              {hasPackages ? "--Chọn gói--" : "Chưa có gói"}
            </option>
            {software.packages.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900">
                {p.label} — {formatVnd(p.price)}đ
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={buyNow}
            disabled={!hasPackages}
            className="flex-1 rounded-lg bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 px-3 py-2 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
          >
            Mua ngay
          </button>
        </div>

        {hint ? (
          <p role="alert" className="text-[11px] font-semibold text-[var(--menzu-accent)]">
            Hãy chọn gói thời hạn trước.
          </p>
        ) : null}

        {software.downloadUrl ? (
          <a
            href={software.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-[var(--menzu-accent)]/70 bg-transparent hover:bg-[var(--menzu-accent)]/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white transition-colors"
          >
            Tải tool và hướng dẫn sử dụng
          </a>
        ) : null}
      </div>
    </div>
  );
}
