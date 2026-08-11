import type { Metadata } from "next";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { CategoryFilterPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/CategoryFilterPanel";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import { CATEGORY_PRODUCTS } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";

/** Slug → display name, taken from the live site's category links. */
const CATEGORY_NAMES: Record<string, string> = {
  "account-valorant-tu-chon": "ACCOUNT VALORANT TỰ CHỌN",
  "random-valorant-20k-oi-thong-tin": "RANDOM VALORANT 20K | ĐỔI THÔNG TIN",
  "random-smuft-ban-rank-oi-thong-tin": "RANDOM SMUFT BẮN RANK | ĐỔI THÔNG TIN",
  "random-valorant-tren-lv-20-oi-thong-tin":
    "RANDOM VALORANT TRÊN LV 20 | ĐỔI THÔNG TIN",
  "random-valorant-tren-lv-20-nfa": "RANDOM VALORANT TRÊN LV 20 | NFA",
  "random-acc-tft": "RANDOM ACC TFT",
  "acc-tft-pet-tim": "ACC TFT PET TÍM",
  "acc-tft-san-tim": "ACC TFT SÀN TÍM",
  "acc-tft-hang-hieu": "ACC TFT HÀNG HIỆU",
};

/** Sibling categories shown under "DANH MỤC KHÁC". */
const OTHER_CATEGORIES = [
  "random-valorant-tren-lv-20-oi-thong-tin",
  "random-valorant-20k-oi-thong-tin",
  "random-smuft-ban-rank-oi-thong-tin",
  "random-valorant-tren-lv-20-nfa",
];

/** Page count reported by the live site for account-valorant-tu-chon. */
const TOTAL_PAGES = 14;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = CATEGORY_NAMES[slug] ?? slug;
  return { title: `Menzu Valorant | Danh Mục ${name}` };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const name = CATEGORY_NAMES[slug] ?? slug;
  const others = OTHER_CATEGORIES.filter((s) => s !== slug).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 py-12">
            <Breadcrumb
              items={[{ label: "Trang chủ", href: "/" }, { label: name }]}
            />

            <CategoryFilterPanel />

            <div className="flex flex-col gap-10">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                {CATEGORY_PRODUCTS.map((product) => (
                  <ProductCard key={product.code} product={product} />
                ))}
              </div>

              <div className="mt-10 mb-8 flex items-center justify-center gap-2">
                {[1, 2].map((n) => (
                  <span
                    key={n}
                    className={
                      n === 1
                        ? "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-black bg-[#7C3AED] text-white"
                        : "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    }
                  >
                    {n}
                  </span>
                ))}
                <span className="px-1 text-neutral-600">…</span>
                <span className="w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                  {TOTAL_PAGES}
                </span>
              </div>
            </div>

            <div className="mt-16 border-t border-white/5 pt-12">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-8">
                DANH MỤC KHÁC
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {others.map((s) => (
                  <a
                    key={s}
                    href={`/category/${s}`}
                    className="group flex flex-col bg-[#12141c] rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 p-4"
                  >
                    <span className="text-center text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors tracking-widest">
                      {CATEGORY_NAMES[s] ?? s}
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
