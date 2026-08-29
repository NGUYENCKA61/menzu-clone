import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { getInventory, getRelatedProducts } from "@/lib/queries";
import { categoryHref } from "@/lib/routes";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";

import { AccountBuyPanel, type AccountDetail } from "./AccountBuyPanel";
import { AccountGallery } from "./AccountGallery";
import { AccountInventory } from "./AccountInventory";
import { Breadcrumb } from "./Breadcrumb";
import { ProductCard } from "./ProductCard";

/**
 * One account's page, whole. The counterpart to SoftwareDetailView: the route
 * decides which of the two a slug means, and this draws the account.
 */
export async function AccountDetailView({ account }: { account: AccountDetail }) {
  const [related, inventory] = await Promise.all([
    // Three, matching the grid's columns — a fourth would sit alone on row two.
    getRelatedProducts(account.code, account.categorySlug, 3),
    getInventory(account.code),
  ]);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <JsonLd
        data={productJsonLd({
          code: account.code,
          price: account.price,
          oldPrice: account.oldPrice,
          imageUrl:
            account.imageUrl ??
            `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${account.code}.webp`,
          categoryName: account.categoryName,
          rank: account.rank,
          weaponSkins: account.weaponSkins,
          available: !account.sold,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: account.categoryName, path: categoryHref(account.categorySlug) },
          { name: `Mã ${account.code}` },
        ])}
      />
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* Same 32px of air under the fixed header as the software page —
              the two detail pages should hang their breadcrumbs at one height.
              pb-24 is the resting gap before the footer, on the container so
              it holds whether or not "Tài Khoản Tương Tự" rendered. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8 pb-24">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                {
                  label: account.categoryName,
                  href: categoryHref(account.categorySlug),
                },
                { label: `Mã ${account.code}` },
              ]}
            />

            <div className="w-full max-w-[1320px] mx-auto flex flex-col">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <AccountGallery
                  code={account.code}
                  imageUrl={account.imageUrl}
                  images={account.images}
                  viewers={account.viewers}
                />
                <AccountBuyPanel account={account} />
              </div>

              <AccountInventory account={account} items={inventory} />
            </div>

            {related.length > 0 ? (
              <div className="mt-20 border-t border-white/5 pt-12">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-8">
                  Tài Khoản Tương Tự
                </h2>
                {/* The category page's grid, so a card here is the same size
                    as the one the customer just came from — four columns made
                    them read as thumbnails of themselves. */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                  {related.map((p) => (
                    <ProductCard key={p.code} product={p} />
                  ))}
                </div>
              </div>
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
