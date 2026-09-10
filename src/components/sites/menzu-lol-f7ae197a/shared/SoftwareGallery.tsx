import { youtubeEmbedUrl } from "@/lib/youtube";

import { PictureGallery, WarrantyBar } from "./PictureGallery";

export interface SoftwareGalleryProps {
  name: string;
  images: string[];
  /** A YouTube link, however the shop pasted it. Null falls back to the pictures. */
  videoUrl?: string | null;
}

/**
 * Detail gallery for a software product: one frame and the warranty bar.
 *
 * The frame is a YouTube player when the shop has given one and the
 * product's pictures otherwise — same box, same corners, same size either
 * way, so the column does not reflow depending on what a product happens
 * to have. The pictures are the shared PictureGallery, which pages through
 * all of them and opens any near full-screen; this used to show images[0]
 * alone, drop the rest in silence, and draw a "Phóng to chi tiết" prompt
 * on hover with nothing behind it.
 *
 * Still a server component: the player is an iframe, and the gallery is
 * a client piece it simply renders.
 */
export function SoftwareGallery({ name, images, videoUrl }: SoftwareGalleryProps) {
  // Anything that is not a YouTube link comes back null and takes the picture
  // path — a bad paste degrades to the old behaviour instead of an empty box.
  const embed = youtubeEmbedUrl(videoUrl);

  return (
    <div className="space-y-4">
      {embed ? (
        <div className="relative w-full aspect-[16/9] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800">
          <iframe
            src={embed}
            title={name}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <PictureGallery slides={images} alt={name} />
      )}

      <WarrantyBar />
    </div>
  );
}
