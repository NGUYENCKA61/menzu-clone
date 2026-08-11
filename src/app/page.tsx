import { FeaturedCategories } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories";
import { FlashSaleSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FlashSaleSection";
import { HeroBanners } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/HeroBanners";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { ProductRow } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";
import { getHomeRows } from "@/lib/homeRows";
import { QuickActionsBar } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/QuickActionsBar";
import { ReviewsSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ReviewsSection";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { TransactionTicker } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/TransactionTicker";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getFeedback, getFlashSaleItems, getRecentPurchases } from "@/lib/queries";
import { UtilitiesHub } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/UtilitiesHub";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [flashSaleItems, reviews, recentPurchases] = await Promise.all([
    getFlashSaleItems(),
    getFeedback(),
    getRecentPurchases(),
  ]);
  const rows = await getHomeRows();

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 transition-colors duration-300">
      {/* spacer reserving the fixed header's 104px */}
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-12">
            <div className="w-full flex flex-col space-y-6 sm:space-y-12">
              <HeroBanners />
              <QuickActionsBar />
              <FlashSaleSection items={flashSaleItems} />
              <FeaturedCategories />
              <ProductRow heading="SẢN PHẨM NỔI BẬT" cards={rows.featured} className="mb-12" />
              <ProductRow heading="ĐẤU TRƯỜNG CHÂN LÝ" cards={rows.tft} />
              <ProductRow heading="Dịch Vụ Game" cards={rows.gameServices} />
              <ProductRow heading="Dịch Vụ Khác" cards={rows.otherServices} />
              <ReviewsSection reviews={reviews.map((r) => ({
                name: r.name,
                date: r.createdAt.toLocaleDateString("vi-VN"),
                body: r.body,
                amount: formatVnd(r.amount) + "đ",
                avatar: r.avatarUrl ?? "",
              }))} />
              {/* Falls back to the captured sample until real purchases exist — an
                  empty strip would look broken, and seeding fake orders would put
                  invented rows in the ledger. */}
              <TransactionTicker
                entries={recentPurchases.length > 0 ? recentPurchases : undefined}
              />
              <UtilitiesHub />
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
