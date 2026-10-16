import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * Fixed full-viewport background artwork that sits behind every page, under a
 * dimming overlay so the content stays legible over it. The picture is the
 * shop's `siteBackground` setting; an empty value leaves just the overlay over
 * the page's own black, so the field can never throw an empty <Image src>.
 *
 * `soft` is the sign-in pages' version, which those pages draw over the root
 * layout's copy: the same picture blurred and all but black (about 6% of it
 * shows through), on the owner's word. The sharp artwork read as clutter
 * behind the card, and plain black as a hole. The blur is a filter on the
 * image rather than a backdrop-filter layer, the cheaper of the two on a weak
 * phone; the image is scaled up a little so the blur's faded rim falls outside
 * the frame, and the frame is filled dark in case any of it shows.
 *
 * Live site: `div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none`
 * containing an `img.object-cover.object-center.transition-all.duration-700` and a
 * `div.absolute.inset-0.bg-scrim/70` dim overlay.
 */
export function PageBackdrop({ src, soft = false }: { src?: string; soft?: boolean }) {
  return (
    <div
      className={`site-backdrop fixed top-0 left-0 w-full h-[100vh] z-[-1] overflow-hidden pointer-events-none ${
        soft ? "bg-scrim" : ""
      }`}
    >
      {src ? (
        <CardImage
          src={src}
          alt=""
          fill
          // Eager, as it is on screen from the start, but Low: it is
          // decoration that Chrome never counts as the LCP, and preloaded at
          // High it raced every page's real hero for the line (SEO review,
          // 13/10/2026). "low" also keeps React from preloading it.
          loading="eager"
          fetchPriority="low"
          sizes="100vw"
          className={`object-cover object-center ${soft ? "scale-110 blur-[28px] saturate-70" : ""}`}
        />
      ) : null}
      <div className={`absolute inset-0 ${soft ? "bg-scrim/94" : "bg-scrim/70"}`} />
    </div>
  );
}
