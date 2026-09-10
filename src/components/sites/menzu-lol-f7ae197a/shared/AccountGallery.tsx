import { productImage } from "./productData";
import { PictureGallery, WarrantyBar } from "./PictureGallery";

export interface AccountGalleryProps {
  code: string;
  /** The shop's uploaded picture; absent, the by-code path is shown. */
  imageUrl?: string | null;
  /** Extra screenshots after the main picture; the arrows page through. */
  images?: string[];
  viewers: number;
}

/**
 * Detail gallery for an account: the shared picture frame with the "N
 * người đang xem" pill in its corner, and the warranty bar under it. The
 * frame itself — paging, lightbox, keyboard — lives in PictureGallery,
 * where the tool page shares it.
 */
export function AccountGallery({
  code,
  imageUrl,
  images = [],
  viewers,
}: AccountGalleryProps) {
  return (
    <div className="space-y-4">
      <PictureGallery
        // Main picture first, then the extras.
        slides={[imageUrl ?? productImage(code), ...images]}
        alt={code}
        badge={
          <div className="absolute top-[2px] left-5 z-10 pointer-events-none">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-b-lg bg-black/70 border border-white/10 border-t-0 text-[10px] sm:text-[11px] font-bold text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
              {viewers} người đang xem
            </div>
          </div>
        }
      />
      <WarrantyBar />
    </div>
  );
}
