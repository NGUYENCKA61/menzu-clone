/**
 * The account shell with nothing in it yet.
 *
 * Grey blocks at the shell's own measurements — the breadcrumb pill, the
 * sidebar card, the title, three panels — so the page that replaces it lands
 * on the same lines and nothing jumps. The sidebar is deliberately NOT drawn
 * for real: it shows an extra row for an admin and another for an agency,
 * and a skeleton that guessed wrong would shove the real rows down 56px on
 * arrival, which is exactly the jolt this exists to prevent. Fixed heights
 * instead, and the pulse the rest of the site uses for "not here yet".
 */

const BLOCK = "rounded-xl bg-white/[0.04]";

export function AccountSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-8 flex flex-col min-h-screen animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-6">
        <div className={`h-9 w-56 ${BLOCK}`} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* The sidebar: a card the width of the real one, rows at the real
            pitch, and room for the two rows only some accounts get. */}
        <aside className="hidden w-[280px] shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 lg:block">
          <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="h-14 w-14 shrink-0 rounded-full bg-white/[0.06]" />
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-28 rounded bg-white/[0.06]" />
              <div className="h-2.5 w-12 rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/[0.035]" />
            ))}
          </div>
        </aside>

        <div className="flex-1 w-full min-w-0">
          <div className="mb-6 flex flex-col gap-2.5">
            <div className={`h-8 w-72 max-w-full ${BLOCK}`} />
            <div className="h-3.5 w-96 max-w-full rounded bg-white/[0.035]" />
          </div>
          <div className="flex flex-col gap-4">
            <div className={`h-28 ${BLOCK}`} />
            <div className={`h-44 ${BLOCK}`} />
            <div className={`h-44 ${BLOCK}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
