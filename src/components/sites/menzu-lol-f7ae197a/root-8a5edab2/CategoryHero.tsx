import type { ReactNode } from "react";

import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * The top of a category page, built the way menzu.lol heads its own: the
 * shelf's picture runs up under the fixed header, shaded dark along the
 * bottom into the page's flat colour, 60% along the top, and evenly across,
 * with the breadcrumb, the shelf's name as the page's one h1, and the shop's
 * sentence about it. The colour is the home page's #0f1015 rather than
 * menzu's #0a0a0d, so moving from the home page to a shelf keeps its ground.
 *
 * The picture is the one the admin already gives the category for its home
 * tile, so no shelf needs anything new; a shelf without one gets the same
 * header on the flat page.
 */
export function CategoryHero({
  name,
  description,
  imageUrl,
  breadcrumb,
}: {
  name: string;
  /** The shop's line about the shelf; "" draws no paragraph. */
  description: string;
  imageUrl: string | null;
  breadcrumb: ReactNode;
}) {
  return (
    // Pulled up under the 104px the layout keeps for the header, so the
    // picture starts at the top of the window; the padding brings the words
    // back below the header (64px tall on a phone, 104px from sm up).
    <section className="relative isolate -mt-[104px] flex min-h-[30vh] w-full flex-col justify-start overflow-hidden pt-[96px] pb-12 sm:min-h-[35vh] sm:pt-[136px]">
      {imageUrl ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <CardImage
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            // Anchored to the picture's top edge rather than its middle, as
            // the shop asked: faces and logos tend to sit high in these
            // pictures, and the header is far wider than it is tall.
            className="object-cover object-top sm:object-[right_top]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1015]/60 via-transparent to-transparent" />
          {/* Dark from the left, as menzu has it, but in the page's own
              #0f1015: on a wide window the left edge now continues the plain
              margins below rather than reading as a black band, the words sit
              on clean shade, and the picture shows in the middle and right. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1015] via-[#0f1015]/80 to-transparent sm:via-[#0f1015]/50" />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 lg:px-6">
        {breadcrumb}
        <h1 className="mb-4 py-1 text-3xl font-black uppercase leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          {name}
        </h1>
        {description.trim() ? (
          <p className="max-w-[640px] text-[13px] leading-relaxed text-neutral-400 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
