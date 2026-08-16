import Image from "next/image";

/**
 * Fixed full-viewport background artwork that sits behind every page, under a
 * dimming overlay so the content stays legible over it. The picture is the
 * shop's `siteBackground` setting; an empty value leaves just the overlay over
 * the page's own black, so the field can never throw an empty <Image src>.
 *
 * Live site: `div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none`
 * containing an `img.object-cover.object-center.transition-all.duration-700` and a
 * `div.absolute.inset-0.bg-[#0a0a0d]/70` dim overlay.
 */
export function PageBackdrop({ src }: { src?: string }) {
  return (
    <div className="fixed top-0 left-0 w-full h-[100vh] z-[-1] overflow-hidden pointer-events-none">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center transition-all duration-700"
        />
      ) : null}
      <div className="absolute inset-0 bg-[#0a0a0d]/70" />
    </div>
  );
}
