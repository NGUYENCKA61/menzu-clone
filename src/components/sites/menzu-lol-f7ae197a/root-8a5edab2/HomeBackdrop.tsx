import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * The home page's own backdrop, drawn over the root layout's fixed artwork
 * (the same z-[-1], later in the stream). The picture shows sharp behind the
 * first screen only and fades out at its foot, on gachatool.com's pattern;
 * from there down the page sits on the same picture blurred and all but
 * black, so the colour carries on without the detail that made the rows of
 * cards look busy (option G3 of the owner's backgrounds).
 *
 * The sharp copy scrolls away with the hero (absolute); the blurred one
 * stays put (fixed). The blur is a filter on the image, scaled up a little
 * so its faded rim falls outside the frame, in a dark-filled frame.
 *
 * `look="navy"` is option G5 instead: under the first screen a fixed navy
 * base (gachatool's own tone) with a faint violet light from the top and a
 * fine grain, no second copy of the picture.
 */
export function HomeBackdrop({ src, look = "blur" }: { src?: string; look?: "blur" | "navy" }) {
  if (look === "navy") {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[-1] bg-[#0e0c16] bg-[radial-gradient(70%_55%_at_50%_0%,rgba(124,108,255,0.10),transparent_70%)]"
        />
        <SharpArt src={src} />
        <div aria-hidden className="home-grain pointer-events-none fixed inset-0 z-[-1]" />
      </>
    );
  }
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-[#08080b]">
        {src ? (
          <CardImage
            src={src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center scale-[1.12] blur-[30px] saturate-75"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#08080b]/90" />
      </div>
      <SharpArt src={src} />
    </>
  );
}

/** The picture behind the first screen, sharp, fading out at its foot. */
function SharpArt({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[100svh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
    >
      <CardImage src={src} alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-[#0a0a0d]/70" />
    </div>
  );
}
