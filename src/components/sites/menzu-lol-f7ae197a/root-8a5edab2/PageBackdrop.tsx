import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * Fixed full-viewport background artwork that sits behind every page, under a
 * dimming overlay so the content stays legible over it. The picture is the
 * shop's `siteBackground` setting; an empty value leaves just the overlay over
 * the page's own black, so the field can never throw an empty <Image src>.
 *
 * `tone` is for the sign-in pages, which draw a second backdrop over the root
 * layout's copy; the sharp artwork read as clutter behind their card, and
 * plain black as a hole. "soft" is the same picture blurred and all but black
 * (about 6% of it shows through). The blur is a filter on the image rather
 * than a backdrop-filter layer, the cheaper of the two on a weak phone; the
 * image is scaled up a little so the blur's faded rim falls outside the
 * frame, and the frame is filled dark in case any of it shows. "spotlight"
 * drops the picture for site-black with a faint light falling from the top
 * of the screen, under the header.
 *
 * Live site: `div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none`
 * containing an `img.object-cover.object-center.transition-all.duration-700` and a
 * `div.absolute.inset-0.bg-[#0a0a0d]/70` dim overlay.
 */
export function PageBackdrop({ src, tone }: { src?: string; tone?: "soft" | "spotlight" }) {
  if (tone === "spotlight") {
    return (
      <div className="fixed top-0 left-0 w-full h-[100vh] z-[-1] pointer-events-none bg-[#050508] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.10),rgba(255,255,255,0.03)_50%,transparent_80%)]" />
    );
  }
  const soft = tone === "soft";
  return (
    <div
      className={`fixed top-0 left-0 w-full h-[100vh] z-[-1] overflow-hidden pointer-events-none ${
        soft ? "bg-[#08080b]" : ""
      }`}
    >
      {src ? (
        <CardImage
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover object-center ${soft ? "scale-110 blur-[28px] saturate-70" : ""}`}
        />
      ) : null}
      <div className={`absolute inset-0 ${soft ? "bg-[#08080b]/94" : "bg-[#0a0a0d]/70"}`} />
    </div>
  );
}
