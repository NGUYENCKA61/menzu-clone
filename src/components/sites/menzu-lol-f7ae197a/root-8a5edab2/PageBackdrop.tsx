import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * Fixed full-viewport background artwork that sits behind every page, under a
 * dimming overlay so the content stays legible over it. The picture is the
 * shop's `siteBackground` setting; an empty value leaves just the overlay over
 * the page's own black, so the field can never throw an empty <Image src>.
 *
 * `blur` draws the picture blurred, the site-wide look the owner is trying:
 * the sharp artwork read as clutter behind the rows of cards. `soft` is the
 * sign-in pages' version, which those pages draw over the root layout's copy:
 * blurred as well and all but black (about 6% of the picture shows through),
 * where plain black had read as a hole. The blur is a filter on the image
 * rather than a backdrop-filter layer, the cheaper of the two on a weak phone;
 * the image is scaled up a little so the blur's faded rim falls outside the
 * frame, and the frame is filled dark in case any of it shows.
 *
 * Live site: `div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none`
 * containing an `img.object-cover.object-center.transition-all.duration-700` and a
 * `div.absolute.inset-0.bg-[#0a0a0d]/70` dim overlay. This one dims to 86% on
 * the owner's word: at 70% the artwork stayed busy behind every row of cards.
 */
export function PageBackdrop({
  src,
  soft = false,
  blur = false,
}: {
  src?: string;
  soft?: boolean;
  blur?: boolean;
}) {
  const blurred = soft || blur;
  return (
    <div
      className={`fixed top-0 left-0 w-full h-[100vh] z-[-1] overflow-hidden pointer-events-none ${
        blurred ? "bg-[#08080b]" : ""
      }`}
    >
      {src ? (
        <CardImage
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover object-center ${blurred ? "scale-110 blur-[28px] saturate-70" : ""}`}
        />
      ) : null}
      <div
        className={`absolute inset-0 ${
          soft ? "bg-[#08080b]/94" : blur ? "bg-[#08080b]/86" : "bg-[#0a0a0d]/86"
        }`}
      />
    </div>
  );
}
