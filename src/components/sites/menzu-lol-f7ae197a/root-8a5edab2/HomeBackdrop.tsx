import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * The home page's own backdrop, drawn over the root layout's fixed artwork
 * (the same z-[-1], later in the stream), option L2: the first screen keeps
 * the site picture behind it, sharp, holding to 70% of the screen's height
 * and fading out by the "Khám phá ngay" cue; from there down the page is
 * lmarket.net's flat dark tone (#0f1015, the header's own), so the rows of
 * cards stand on nothing but their own covers.
 *
 * The picture scrolls away with the hero (absolute); the flat tone stays put
 * (fixed).
 */
export function HomeBackdrop({ src }: { src?: string }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] bg-[#0f1015]" />
      {src ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[100svh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        >
          <CardImage src={src} alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-[#0a0a0d]/70" />
        </div>
      ) : null}
    </>
  );
}
