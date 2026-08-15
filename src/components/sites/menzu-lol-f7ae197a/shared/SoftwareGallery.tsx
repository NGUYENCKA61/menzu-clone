import Image from "next/image";
import { ExternalLink, ShieldCheck, ZoomIn } from "lucide-react";

import { youtubeEmbedUrl } from "@/lib/youtube";

export interface SoftwareGalleryProps {
  name: string;
  images: string[];
  /** A YouTube link, however the shop pasted it. Null falls back to the image. */
  videoUrl?: string | null;
}

/**
 * Detail gallery for a software product: one frame and the warranty bar.
 *
 * The frame is a YouTube player when the shop has given one and the product
 * picture otherwise — same box, same corners, same size either way, so the
 * column does not reflow depending on what a product happens to have.
 *
 * Still a server component: the player is an iframe and the fallback is an
 * image, so nothing here needs to run in the browser.
 */
export function SoftwareGallery({ name, images, videoUrl }: SoftwareGalleryProps) {
  // Anything that is not a YouTube link comes back null and takes the picture
  // path — a bad paste degrades to the old behaviour instead of an empty box.
  const embed = youtubeEmbedUrl(videoUrl);

  // A product with no screenshots yet still renders a frame, because an empty
  // column would read as a broken page rather than as a missing picture.
  const current = images[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[16/9] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 group">
        {embed ? (
          <iframe
            src={embed}
            title={name}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : current ? (
          <div className="absolute inset-0 w-full h-full group-hover:scale-[1.02] transition-transform duration-500">
            <Image
              src={current}
              alt={name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-full object-contain block"
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-neutral-700">
            Chưa có ảnh
          </div>
        )}

        {/* Only over a picture. A dark wash and a "zoom in" prompt drifting
            across a video the moment the pointer crosses it would fight the
            player's own controls for the same corner of the frame. */}
        {!embed && current ? (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 px-6 py-3 rounded-full flex items-center gap-3 text-white font-bold border border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <ZoomIn size={18} />
              Phóng to chi tiết
            </div>
          </div>
        ) : null}

      </div>

      {/* A bar rather than the bare line of text it was: under a gallery this
          wide, an 11px grey link read as a caption instead of as something to
          press. */}
      <a
        href="#"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 hover:border-emerald-500/70 hover:bg-white/[0.05] transition-colors"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {/* The same emerald the "Còn hàng" line and the Undetected pill use,
              so the three reassurances on this page read as one voice. */}
          <ShieldCheck size={15} className="shrink-0 text-emerald-400" />
          <span className="truncate text-[12px] font-bold uppercase tracking-widest text-white">
            Chính sách bảo hành
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-neutral-500">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-200">
            Xem ngay
          </span>
          <ExternalLink size={12} />
        </span>
      </a>
    </div>
  );
}
