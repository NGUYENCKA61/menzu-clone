/**
 * The storefront's two page shapes with nothing in them yet.
 *
 * Grey blocks at the pages' own measurements — the breadcrumb, the title,
 * the filter chips and a grid of cards for a shelf; the 16/9 frame and the
 * buy panel's rows for a product — so the page that replaces them lands on
 * the same lines and nothing jumps. The same pulse the account skeleton
 * uses for "not here yet", stilled for readers who asked for less motion.
 */

const BLOCK = "rounded-xl bg-white/[0.04]";

export function CategorySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-12 pb-24 animate-pulse motion-reduce:animate-none"
    >
      <div className="h-4 w-48 rounded bg-white/[0.05]" />
      <div className="mt-6 h-9 w-72 max-w-full rounded-lg bg-white/[0.06]" />
      <div className="mt-2.5 h-3.5 w-96 max-w-full rounded bg-white/[0.035]" />

      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-white/[0.04]" />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:gap-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded-[15px] border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4"
          >
            <div className="aspect-[16/9] rounded-xl bg-white/[0.05]" />
            <div className="mt-4 h-4 w-3/4 rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.04]" />
            <div className="mt-5 h-11 rounded-xl bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8 pb-24 animate-pulse motion-reduce:animate-none"
    >
      <div className="h-4 w-64 max-w-full rounded bg-white/[0.05]" />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <div className="aspect-[16/9] w-full rounded-3xl border border-white/[0.06] bg-white/[0.04]" />
          <div className={`mt-4 h-12 ${BLOCK}`} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="h-7 w-32 rounded-full bg-white/[0.05]" />
          <div className="flex flex-col gap-2.5">
            <div className="h-10 w-full max-w-[520px] rounded-lg bg-white/[0.06]" />
            <div className="h-3.5 w-full max-w-[560px] rounded bg-white/[0.035]" />
            <div className="h-3.5 w-2/3 max-w-[400px] rounded bg-white/[0.035]" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/[0.03]" />
            ))}
          </div>
          <div className="h-11 w-48 rounded-lg bg-white/[0.06]" />
          <div className="flex flex-col gap-3">
            <div className="h-14 rounded-2xl bg-white/[0.06]" />
            <div className="h-14 rounded-2xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
