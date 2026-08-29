"use client";

import { ImagePlus } from "lucide-react";

/**
 * Upload-or-paste for a single admin image, with the current one beside it.
 *
 * Lifted out of the category list when the category editor moved to its own
 * page: two screens now offer the same control, and a second copy of it would
 * be two sets of accepted file types and two size limits to keep in step.
 */
export function AdminImagePicker({
  uploading,
  value,
  onPick,
}: {
  uploading: boolean;
  value: string;
  onPick: (file: File) => void | Promise<void>;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <div className="relative h-12 w-[68px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
        {value ? (
          // A plain img: the path is typed by hand or just uploaded, so it may
          // not be a host next/image is configured for — and this is a 68px
          // thumbnail on an admin screen, which is not worth an optimiser pass.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[9px] font-bold uppercase tracking-widest text-neutral-700">
            Trống
          </span>
        )}
      </div>

      <label
        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:bg-white/10 ${
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

      <span className="text-[10px] text-neutral-600">
        PNG / JPG / WebP · tối thiểu 320×180 · tối đa 8MB
      </span>
    </div>
  );
}
