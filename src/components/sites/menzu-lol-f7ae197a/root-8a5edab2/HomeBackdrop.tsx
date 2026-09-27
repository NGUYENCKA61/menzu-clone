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
 */
export function HomeBackdrop({ src }: { src?: string }) {
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
    </>
  );
}
