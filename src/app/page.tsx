import { Flame } from "lucide-react";

import { FeaturedCategories } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories";
import { FlashSaleSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FlashSaleSection";
import { HeroBanners } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/HeroBanners";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { ProductRow } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";
import { DocsSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/DocsSection";
import { SeoContent } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SeoContent";
import {
  getHomeCategoryCards,
  getHomeDocCards,
  getHomeGroups,
} from "@/lib/homeRows";
import { ReviewsSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ReviewsSection";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { PartnersSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PartnersSection";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getFeedback, getFlashSaleItems, getPartners } from "@/lib/queries";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { visibleBlocks } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { UtilitiesHub } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/UtilitiesHub";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getShopSettings();
  const [flashSaleItems, reviews, partners] = await Promise.all([
    getFlashSaleItems(),
    getFeedback(),
    getPartners(),
  ]);
  const [homeGroups, categoryCards, docCards] = await Promise.all([
    getHomeGroups(settings.homeRowCount),
    getHomeCategoryCards(settings.homeCategorySlugs),
    getHomeDocCards(settings.homeDocSlugs),
  ]);

  // Each block is built once and picked out by id below, so the order on the
  // page is the order the admin arranged and nothing renders twice.
  const blocks: Record<string, React.ReactNode> = {
    hero: (
      <HeroBanners
        key="hero"
        banner={settings.heroBanner}
        video={settings.heroVideo}
        badge={settings.heroBadge}
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
        primaryLabel={settings.heroPrimaryLabel}
        primaryHref={settings.heroPrimaryHref}
        secondaryLabel={settings.heroSecondaryLabel}
        secondaryHref={settings.heroSecondaryHref}
        usps={settings.heroUsps}
      />
    ),
    flash: <FlashSaleSection key="flash" items={flashSaleItems} />,
    featured: <FeaturedCategories key="featured" cards={categoryCards} />,
    docs: <DocsSection key="docs" articles={docCards} />,
    // One row per group, in the order the admin arranged them. Headings and
    // membership come from the groups table, so this file no longer knows
    // what any row is called.
    groups: (
      <div key="groups" className="flex w-full flex-col space-y-6 sm:space-y-12">
        {homeGroups.map((group) => {
          // The admin still types an emoji on the group; a 🔥 renders as the
          // Lucide flame after the heading instead of the raw glyph before
          // it. Any other emoji keeps the old prefix treatment.
          const flame = group.icon.trim() === "🔥";
          return (
            <ProductRow
              key={group.id}
              heading={
                !flame && group.icon ? `${group.icon} ${group.name}` : group.name
              }
              headingSuffix={
                flame ? (
                  <Flame
                    size={22}
                    aria-hidden
                    // Pulled in against the row's 10px gap: with the glyph's
                    // own ~3px of internal whitespace this lands at roughly
                    // one word-space from the title, so the flame reads as its
                    // last word rather than a separate element floating after.
                    className="-ml-1.5 shrink-0 text-[var(--menzu-accent)]"
                  />
                ) : undefined
              }
              cards={group.cards}
              viewAllHref="/categories"
              tone="menzu"
            />
          );
        })}
      </div>
    ),
    reviews: (
      <ReviewsSection
        key="reviews"
        reviews={reviews.map((r) => ({
          name: r.name,
          date: r.createdAt.toLocaleDateString("vi-VN"),
          body: r.body,
          amount: formatVnd(r.amount) + "đ",
          avatar: r.avatarUrl ?? "",
        }))}
      />
    ),
    partners: <PartnersSection key="partners" partners={partners} />,
    utilities: <UtilitiesHub key="utilities" />,
    seo: (
      <SeoContent
        key="seo"
        heading={settings.seoHeading}
        body={settings.seoBody}
        faq={settings.seoFaq}
      />
    ),
  };

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30 transition-colors duration-300">
      <JsonLd data={organizationJsonLd()} />
      {/* spacer reserving the fixed header's 104px */}
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-12">
            <div className="w-full flex flex-col space-y-6 sm:space-y-12">
              {visibleBlocks(settings).map((id) => blocks[id])}
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
