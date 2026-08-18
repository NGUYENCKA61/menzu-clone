import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { CategoryFilterPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/CategoryFilterPanel";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import { SoftwareCard } from "@/components/sites/menzu-lol-f7ae197a/shared/SoftwareCard";
import { getCategoryPage, listCategories } from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    min?: string;
    max?: string;
    sort?: string;
    skin?: string;
    phukien?: string;
    nguon?: string;
  }>;
}

const SORTS = new Set(["newest", "price-asc", "price-desc"]);
const SOURCES = new Set(["all", "drop", "menzu"]);

/** A blank or junk parameter means "no filter", never an error page. */
function toAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPage(slug);
  return { title: `Menzu Valorant | Danh Mục ${data?.name ?? slug}` };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
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
  });
  if (!data) notFound();

  const others = (await listCategories())
    .filter((c) => c.slug !== slug)
    .slice(0, 4);

  const pageNumbers = buildPageList(data.page, data.totalPages);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* pb-24 matches the account page's resting gap before the footer. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-12 pb-24">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: data.name }]}
            />

            {/* Software first, and outside the filter panel: the panel filters
                on rank, skin and price band, none of which apply to a tool, so
                a grid that sat under it would look filtered and never be. */}
            {data.software.length > 0 ? (
              <div className="flex flex-col gap-5 mb-12">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Phần mềm
                </h2>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                  {data.software.map((s) => (
                    <SoftwareCard key={s.code} software={s} />
                  ))}
                </div>
              </div>
            ) : null}

            {data.software.length > 0 ? (
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white mb-5">
                Tài khoản game
              </h2>
            ) : null}

            <CategoryFilterPanel />

            <div className="flex flex-col gap-10">
              {data.products.length > 0 ? (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                  {data.products.map((product) => (
                    <ProductCard key={product.code} product={product} />
                  ))}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <p className="text-xl font-bold text-white mb-2">
                    CHƯA CÓ SẢN PHẨM NÀO
                  </p>
                  <p className="text-neutral-400">
                    Danh mục này đang trống. Vui lòng quay lại sau.
                  </p>
                </div>
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
                        href={`/category/${slug}?page=${n}`}
                        className={
                          n === data.page
                            ? "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-black bg-[var(--brand)] text-white"
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

            <div className="mt-16 border-t border-white/5 pt-12">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-8">
                DANH MỤC KHÁC
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {others.map((c) => (
                  <a
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-4"
                  >
                    <span className="text-center text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors tracking-widest">
                      {c.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
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
