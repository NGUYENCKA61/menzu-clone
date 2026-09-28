import type { ReactNode } from "react";

import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";

/**
 * The top of a category page, the way menzu.lol heads its own: the shelf's
 * picture across the page, bright at the top and fading out downwards into
 * whatever lies behind the page, with the breadcrumb, the shelf's name as the
 * page's one h1, and the shop's sentence about it over the picture.
 *
 * The picture is the one the admin already gives the category for its home
 * tile, so no shelf needs anything new; a shelf without one gets the same
 * header over the page's own backdrop.
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
    // The layout reserves 104px for the header, which is only 64px tall on a
    // phone: pulled up there, so the picture starts right under the header
    // instead of below a strip of backdrop.
    <section className="relative isolate -mt-10 overflow-hidden sm:mt-0">
      {imageUrl ? (
        <div
          aria-hidden
          // Faded out from the middle down, so the page's backdrop takes over
          // below it rather than meeting a hard edge.
          className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
        >
          <CardImage
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_30%]"
          />
          {/* Enough shade under the words to read them on any picture,
              lightest at the top so the picture still shows there. */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0d]/35 via-[#0a0a0d]/70 via-60% to-[#0a0a0d]/0" />
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[230px] max-w-[1320px] flex-col px-4 pt-8 pb-8 sm:min-h-[310px] sm:pt-11 sm:pb-12 lg:px-6">
        {breadcrumb}
        <h1 className="text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-[56px]">
          {name}
        </h1>
        {description.trim() ? (
          <p className="mt-4 max-w-[640px] text-[13px] leading-relaxed text-neutral-300 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
