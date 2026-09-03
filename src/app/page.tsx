import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";

import { FeaturedCategories } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories";
import { FlashSaleSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FlashSaleSection";
import { HeroBanners } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/HeroBanners";
import { ProductRow } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";
import { DocsSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/DocsSection";
import { SeoContent } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SeoContent";
import {
  getHomeCategoryCards,
  getHomeDocCards,
  getHomeGroups,
} from "@/lib/homeRows";
import { ReviewsSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ReviewsSection";
import { TrustStatsStrip } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/TrustStatsStrip";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { PartnersSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PartnersSection";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getFeedback, getFlashSaleItems, getPartners } from "@/lib/queries";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { visibleBlocks } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { getTrustStats } from "@/lib/trustStats";
import { shareCard } from "@/lib/shareCard";

export const dynamic = "force-dynamic";

/** The one page whose address really is "/". */
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: "/" },
    ...(await shareCard({ url: "/" })),
  };
}

/** The group that carries the search, the platform chips and "Xem thêm". */
const GAME_LIST_SLUG = "danh-sach-hack-game";

/**
 * Lucide icons drawn after a group row's heading, keyed by the group's slug.
 *
 * The Group table used to carry an admin-typed emoji; the shop retired that
 * in favour of Lucide glyphs, and those are components, so the assignment
 * lives here rather than in a column. A group without an entry simply has no
 * icon. Pulled in with -ml-1.5 against the row's 10px gap: with the glyph's
 * own internal whitespace it sits about one word-space off the title, reading
 * as its last word rather than an element floating after it.
 */
// One icon on the whole page, deliberately: the arrow is what marks
// the featured row out, and a glyph on every heading would dilute exactly that.
const GROUP_ICONS: Record<string, React.ReactNode> = {
  "hot-trending": (
    <TrendingUp
      size={24}
      aria-hidden
      className="animate-bounce-subtle -ml-1.5 shrink-0 text-[var(--menzu-accent)]"
    />
  ),
};

export default async function Home() {
  const settings = await getShopSettings();
  const trust = await getTrustStats(settings);
  const [flashSaleItems, reviews, partners] = await Promise.all([
    getFlashSaleItems(),
    getFeedback(),
    getPartners(),
  ]);
  const [homeGroups, categoryCards, docCards] = await Promise.all([
    // The game list is not capped: it shows three lines and reveals the rest
    // behind "Xem thêm", so it needs every category to be there to reveal.
    getHomeGroups(settings.homeRowCount, [GAME_LIST_SLUG]),
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
        title={settings.heroTitle}
        badge={settings.heroBadge}
        subtitle={settings.heroSubtitle}
        primaryLabel={settings.heroPrimaryLabel}
        primaryHref={settings.heroPrimaryHref}
        secondaryLabel={settings.heroSecondaryLabel}
        secondaryHref={settings.heroSecondaryHref}
        shootingStars={settings.heroShootingStars}
      />
    ),
    flash: (
      <FlashSaleSection
        key="flash"
        items={flashSaleItems}
        backgroundImage={settings.flashSaleBackground}
      />
    ),
    featured: <FeaturedCategories key="featured" cards={categoryCards} />,
    docs: <DocsSection key="docs" articles={docCards} />,
    // One row per group, in the order the admin arranged them. Headings and
    // membership come from the groups table, so this file no longer knows
    // what any row is called.
    groups: (
      <div key="groups" className="flex w-full flex-col space-y-6 sm:space-y-12">
        {homeGroups.map((group) => (
          <ProductRow
            key={group.id}
            heading={group.name}
            headingSuffix={GROUP_ICONS[group.slug]}
            cards={group.cards}
            viewAllHref="/categories"
            tone="menzu"
            marquee={group.slug === "hot-trending"}
            ranked={group.slug === "hot-trending"}
            searchable={group.slug === GAME_LIST_SLUG}
          />
        ))}
      </div>
    ),
    reviews: (
      // The figures ride above the reviews they vouch for, as one block.
      <div key="reviews">
        <TrustStatsStrip stats={trust} />
        <ReviewsSection
          // Four on the home page — a taste; the rest live on /feedback.
          reviews={reviews.slice(0, 4).map((r) => ({
            name: r.name,
            date: r.createdAt.toLocaleDateString("vi-VN"),
            body: r.body,
            amount: formatVnd(r.amount) + "đ",
            avatar: r.avatarUrl ?? "",
            rating: r.rating,
          }))}
          summary={
            trust.rating && reviews.length > 0
              ? { rating: trust.rating, count: trust.reviews }
              : null
          }
        />
      </div>
    ),
    partners: <PartnersSection key="partners" partners={partners} />,
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
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30 transition-colors duration-300">
      <JsonLd data={organizationJsonLd()} />
      {/* spacer reserving the fixed header's 104px */}
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        {/* The home page's h1 lives inside the hero, which the shop can switch
            off in Cấu hình — and a front page with no h1 tells a crawler
            nothing about what the site is. This one is always here, read by
            screen readers and search engines and drawn by neither. */}
        {!visibleBlocks(settings).includes("hero") ? (
          <h1 className="sr-only">
            {settings.brandName} — hack game và tài khoản game
          </h1>
        ) : null}
        <div className="w-full">
          <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 py-6 lg:py-10 pb-16 lg:pb-24">
            {/* A wider beat between blocks than the rows keep inside them, so
                the page reads as sections rather than as one long list. */}
            <div className="w-full flex flex-col space-y-12 sm:space-y-20">
              {visibleBlocks(settings).map((id) => blocks[id])}
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
