import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * The home page's own backdrop, drawn over the root layout's fixed artwork
 * (the same z-[-1], later in the stream), on gachatool.com's pattern: the
 * picture sits behind the first screen only and fades out at its foot, and
 * from there down the page is a calm near-black with a fine grain. Under
 * the old backdrop the artwork stayed behind every row of cards to the
 * footer, and the owner found the page busy. (gachatool also scatters
 * stars over its sky; they were tried here and taken out as clutter.)
 *
 * The picture scrolls away with the hero (absolute); the sky stays put
 * (fixed). The grain comes after the picture so it lies over it too. Their
 * styles are the home-sky-* classes in globals.css. `plain` drops the glows
 * and the grain for a flat near-black under the first screen, the other
 * version the owner is weighing.
 */
export function HomeBackdrop({ src, plain = false }: { src?: string; plain?: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[-1] ${plain ? "bg-[#08080b]" : "home-sky-base"}`}
      />
      {src ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[100svh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
        >
          <CardImage
            src={src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#0a0a0d]/70" />
        </div>
      ) : null}
      {plain ? null : (
        <div aria-hidden className="home-sky-grain pointer-events-none fixed inset-0 z-[-1]" />
      )}
    </>
  );
}
