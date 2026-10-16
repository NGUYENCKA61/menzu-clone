"use client";

import { ImagePlus } from "lucide-react";
import { useState } from "react";

/**
 * What the picker asks for unless a slot says otherwise. Covers are drawn in
 * 16:9 frames (cards, the product gallery) and cropped into the 4:3 game
 * tiles, where a 300px tile shows the picture about 400px wide, and twice
 * that on a sharp phone or laptop screen. A 640px file is therefore already
 * stretched there, which is why the card pictures looked soft (the owner's
 * question of 13/10/2026: do the card pictures need more quality?).
 * 1920×1080 leaves room for every size the storefront asks for.
 */
const DEFAULT_HINT = "Nên dùng 1920×1080 (16:9), từ 1280×720 trở lên · PNG / JPG / WebP · tối đa 8MB";
const DEFAULT_WARN_BELOW = 1280;

/**
 * Upload-or-paste for a single admin image, with the current one beside it.
 *
 * Lifted out of the category list when the category editor moved to its own
 * page: two screens now offer the same control, and a second copy of it would
 * be two sets of accepted file types and two size limits to keep in step.
 *
 * It also says, softly, when the picture in the slot is narrower than
 * `warnBelow`. Nothing is refused: the upload routes keep their own hard
 * floors, and this is only a nudge toward a sharper file.
 */
export function AdminImagePicker({
  uploading,
  value,
  onPick,
  hint = DEFAULT_HINT,
  warnBelow = DEFAULT_WARN_BELOW,
}: {
  uploading: boolean;
  value: string;
  onPick: (file: File) => void | Promise<void>;
  /** The line beside the button; each slot can state its own sizes. */
  hint?: string;
  /** Width in px under which the "small picture" note shows; 0 turns it off. */
  warnBelow?: number;
}) {
  // Read off the thumbnail itself, so the note covers a fresh upload, a pasted
  // path and the picture already saved alike, without each screen passing the
  // upload's width down. Kept with the path it was measured for, so a new
  // value never shows the previous picture's size.
  const [measured, setMeasured] = useState<{ src: string; width: number; height: number } | null>(
    null,
  );

  function measure(img: HTMLImageElement | null) {
    // complete is checked as well as onLoad, because a cached picture can
    // finish before React attaches the handler. naturalWidth is 0 for a
    // broken file, which is no size to warn about.
    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (measured?.src === value) return;
    setMeasured({ src: value, width: img.naturalWidth, height: img.naturalHeight });
  }

  const small =
    warnBelow > 0 && measured !== null && measured.src === value && measured.width < warnBelow
      ? measured
      : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <div className="relative h-12 w-[68px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
        {value ? (
          // A plain img: the path is typed by hand or just uploaded, so it may
          // not be a host next/image is configured for — and this is a 68px
          // thumbnail on an admin screen, which is not worth an optimiser pass.
          // Keyed by the path so a new picture gets a fresh element: on a
          // reused one, `complete` can still describe the old file for a
          // moment after src changes, and its size would be read as the new.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={value}
            ref={measure}
            onLoad={(event) => measure(event.currentTarget)}
            src={value}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-neutral-700">
            Trống
          </span>
        )}
      </div>

      <label
        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-neutral-200 transition-colors hover:bg-white/10 ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <ImagePlus size={13} />
        {uploading ? "Đang tải…" : "Chọn ảnh từ máy"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so picking the same file twice fires change again —
            // otherwise a failed upload could not be retried with that file.
            event.target.value = "";
            if (file) void onPick(file);
          }}
        />
      </label>

      <span className="text-[10px] text-neutral-600">{hint}</span>

      {small ? (
        <p role="status" className="basis-full text-[11px] text-amber-400">
          Ảnh nhỏ ({small.width}×{small.height}px), sẽ bị mờ trên màn hình nét
        </p>
      ) : null}
    </div>
  );
}
