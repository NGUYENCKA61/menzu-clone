import { PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { CategoryFilterPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/CategoryFilterPanel";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import { CardBoundary } from "@/components/sites/menzu-lol-f7ae197a/shared/CardBoundary";
import { SoftwareCard } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareCard";
import { SoftwareFilterPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareFilterPanel";
import { db } from "@/lib/db";
import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { getCategoryPage } from "@/lib/queries";
import { softwareSearchHint } from "@/lib/searchHint";
import { categoryHref } from "@/lib/routes";
import { getShopSettings } from "@/lib/settingsStore";
import { weaponKey } from "@/lib/weaponImages";
import { shareCard } from "@/lib/shareCard";
import { categoryBehindOldSlug } from "@/lib/slugHistory";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{
    page?: string;
    min?: string;
    max?: string;
    sort?: string;
    skin?: string;
    phukien?: string;
    nguon?: string;
    /** The software panel's own keys, kept apart from the account panel's. */
    pm?: string;
    cn?: string;
    tt?: string;
    pmsort?: string;
  }>;
}

const SORTS = new Set(["newest", "price-asc", "price-desc"]);
const SOURCES = new Set(["all", "drop", "menzu"]);

/** How many library items the HOT PICK chip rotates through, besides the pin. */
const HOT_PICK_ROTATION = 8;

/** The status chips' URL values, and the column values they stand for. */
const SOFTWARE_STATUSES = {
  undetected: "UNDETECTED",
  stable: "STABLE",
  updated: "UPDATED",
  risky: "RISKY",
  updating: "UPDATING",
  detected: "DETECTED",
} as const;

/** A blank or junk parameter means "no filter", never an error page. */
function toAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug: slug } = await params;
  const data = await getCategoryPage(slug);
  const name = data?.name ?? slug;
  const canonical = categoryHref(slug);
  // A real sentence for the search snippet and the social card, built from what
  // the category actually holds rather than left blank.
  const kinds = data
    ? [data.accountTotal > 0 ? "tài khoản game" : "", data.softwareTotal > 0 ? "phần mềm hỗ trợ" : ""]
        .filter(Boolean)
        .join(" và ")
    : "";
  const description = `${name} tại THICHTHIHACK${kinds ? ` — ${kinds}` : ""}: giá tốt, giao dịch tự động, uy tín.`;
  return {
    title: `Danh mục ${name}`,
    description,
    // The category sits at the root and is reached from several groups; the
    // canonical says which of those addresses is the page itself.
    alternates: { canonical },
    // An empty category has nothing to rank for and is left out of the
    // sitemap; it is indexed again the day its first product appears.
    ...(data && !data.listed ? { robots: { index: false, follow: true } } : {}),
    ...(await shareCard({ url: canonical })),
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug: slug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1) || 1);

  const data = await getCategoryPage(slug, page, {
    min: toAmount(query.min),
    max: toAmount(query.max),
    sort: SORTS.has(query.sort ?? "")
      ? (query.sort as "newest" | "price-asc" | "price-desc")
      : undefined,
    skin: query.skin?.trim() || undefined,
    accessory: query.phukien?.trim() || undefined,
    source: SOURCES.has(query.nguon ?? "")
      ? (query.nguon as "all" | "drop" | "menzu")
      : undefined,
    software: query.pm?.trim() || undefined,
    softwareFeature: query.cn?.trim() || undefined,
    softwareStatus:
      SOFTWARE_STATUSES[query.tt as keyof typeof SOFTWARE_STATUSES] ?? undefined,
    softwareSort: SORTS.has(query.pmsort ?? "")
      ? (query.pmsort as "newest" | "price-asc" | "price-desc")
      : undefined,
  });
  if (!data) {
    // Nothing lives here now; maybe something used to. A renamed category
    // keeps answering on its old address with a permanent redirect, so links
    // shared before the rename stay alive and search engines follow along.
    const moved = await categoryBehindOldSlug(slug);
    if (moved) permanentRedirect(categoryHref(moved.slug));
    notFound();
  }

  // The HOT PICK chip's rotating cast: the picture library's newest items,
  // led by whatever name Cấu hình pins. The pin joins even with no picture
  // yet — the shop named it on purpose — and looks its picture up directly
  // rather than hoping to find itself among the newest few. A blank pin just
  // means the library rotates on its own.
  const settings = await getShopSettings();
  const pinnedName = settings.hotPickSkin.trim();
  const pinnedKey = pinnedName ? weaponKey(pinnedName) : null;
  const [pinnedImage, libraryPicks] = await Promise.all([
    pinnedKey
      ? db.weaponImage.findUnique({ where: { key: pinnedKey }, select: { url: true } })
      : Promise.resolve(null),
    db.weaponImage.findMany({
      orderBy: { updatedAt: "desc" },
      take: HOT_PICK_ROTATION,
      select: { name: true, url: true },
    }),
  ]);
  const hotPickList: { name: string; imageUrl: string | null }[] = [
    ...(pinnedName ? [{ name: pinnedName, imageUrl: pinnedImage?.url ?? null }] : []),
    ...libraryPicks
      .filter((w) => weaponKey(w.name) !== pinnedKey)
      .map((w) => ({ name: w.name, imageUrl: w.url })),
  ];
  const hotPicks = hotPickList.length > 0 ? hotPickList : undefined;

  const pageNumbers = buildPageList(data.page, data.totalPages);

  // Three shapes for the account half, decided by what the category holds.
  //   accounts on sale         the whole section: heading, panel, grid, pager
  //   software but no accounts nothing at all. The panel filters on rank,
  //     skins and price band, and a notice that there are no accounts, on a
  //     page that never offered any, answers a question nobody asked.
  //   neither                  the box by itself. There is nothing to filter
  //     and no filter to undo, so the panel would be furniture round a blank.
  //
  // Both read the unfiltered totals, never the lists: with a search running,
  // an empty list means "nothing matched", which is the opposite of "nothing
  // here" and gets the opposite treatment.
  const hasAccounts = data.accountTotal > 0;
  const sellsNothing = !hasAccounts && data.softwareTotal === 0;


  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* pb-24 matches the account page's resting gap before the footer. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-12 pb-24">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: data.name }]}
            />

            {/* The page's one top-level heading. The design has no room for a
                title — the breadcrumb already names the shelf and the two
                section headings do the visible work — but a page with no h1
                gives a screen reader no statement of where it is and a crawler
                no title for it. Read, not drawn, and it keeps the two shelf
                headings at h2 so the outline runs h1 → h2 → h3 without a
                gap. */}
            <h1 className="sr-only">Danh mục {data.name}</h1>

            {/* Software first, with its own search: the panel below filters on
                rank, skins and a price band, none of which describe a tool, so
                a grid that sat under it would look filtered and never be. */}
            {data.softwareTotal > 0 ? (
              <div className="flex flex-col gap-5 mb-12">
                {/* Named after the shelf, not the kind of goods: "Danh mục Hack
                    Valorant" says where you are, where "Phần mềm" only said
                    what these tiles were. */}
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Danh mục {data.name}
                </h2>
                <SoftwareFilterPanel
                  hint={softwareSearchHint(
                    data.name,
                    data.software.map((s) => s.name),
                  )}
                />
                {data.software.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                    {data.software.map((s) => (
                      // Each card in its own boundary: a fault in one tile
                      // costs that tile, not the shelf.
                      <CardBoundary key={s.code}>
                        <SoftwareCard
                          // A rich-editor description is HTML; the card prints a
                          // sentence, so it gets the prose without the tags.
                          software={
                            isHtmlBody(s.description)
                              ? { ...s, description: docHtmlToPlainText(s.description, 180) }
                              : s
                          }
                        />
                      </CardBoundary>
                    ))}
                  </div>
                ) : (
                  // Only reachable through the search above — the section as a
                  // whole is hidden when the category stocks no tools — so the
                  // copy points at the search rather than at the shelf.
                  <EmptyPanel
                    title="Không tìm thấy phần mềm nào"
                    note="Không có phần mềm nào khớp với từ khoá hoặc bộ lọc hiện tại. Thử bỏ bớt điều kiện xem sao."
                  />
                )}
              </div>
            ) : null}

            {hasAccounts ? (
              <>
                {/* Always headed, like the software shelf above it — and by the
                    game, not the shelf: a category called "Hack Valorant" sells
                    Valorant accounts, so the leading "Hack" comes off. */}
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white mb-5">
                  Danh mục tài khoản game {data.name.replace(/^hacks+/i, "")}
                </h2>

                <CategoryFilterPanel hotPicks={hotPicks} />

                <div className="flex flex-col gap-10">
                  {data.products.length > 0 ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                      {data.products.map((product) => (
                        <ProductCard key={product.code} product={product} />
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Chưa có tài khoản nào"
                      note="Hiện tại danh mục này đang trống hoặc đã bán hết. Vui lòng quay lại sau!"
                    />
                  )}

                  {data.totalPages > 1 ? (
                    <div className="mt-10 mb-8 flex items-center justify-center gap-2">
                      {pageNumbers.map((n, i) =>
                        n === null ? (
                          <span key={`gap-${i}`} className="px-1 text-neutral-600">
                            …
                          </span>
                        ) : (
                          <a
                            key={n}
                            href={`${categoryHref(slug)}?page=${n}`}
                            className={
                              n === data.page
                                ? "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-black bg-[var(--menzu-accent)] text-white"
                                : "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                            }
                          >
                            {n}
                          </a>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            ) : sellsNothing ? (
              // Nothing on sale here at all, so the page is this box. "No
              // products" rather than "no accounts": with no software grid
              // above it either, the narrower wording would leave a reader
              // unable to tell a bare category from a filtered one.
              <EmptyPanel
                title="Chưa có sản phẩm nào"
                note="Hiện tại danh mục này đang trống hoặc đã bán hết. Vui lòng quay lại sau!"
              />
            ) : null}
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}

/**
 * The dashed box a grid falls back to when it has nothing to draw.
 *
 * Three callers, three different sentences: a category that stocks nothing, a
 * software search that matched nothing, and an account filter that matched
 * nothing. Only the words differ, so only the words are passed in — the box
 * itself has to look the same each time, or the page reads as though something
 * different went wrong.
 */
function EmptyPanel({ title, note }: { title: string; note: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center px-6 py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
      <PackageOpen
        size={56}
        strokeWidth={1.5}
        aria-hidden
        className="mb-5 text-neutral-600"
      />
      <p className="text-[17px] font-black uppercase tracking-wide text-white">
        {title}
      </p>
      <p className="mt-2.5 max-w-[520px] text-[15px] text-neutral-400">{note}</p>
    </div>
  );
}

/** 1 2 … 14 — first pages, an ellipsis, then the last, like the live pager. */
function buildPageList(current: number, total: number): (number | null)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, current, total]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const [i, n] of sorted.entries()) {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push(null);
    out.push(n);
  }
  return out;
}
