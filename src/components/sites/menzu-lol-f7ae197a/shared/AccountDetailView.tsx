import { accountDisplayName, accountLdDescription } from "@/lib/accountSeo";
import { DocHtml } from "@/lib/docFormat";
import {
  type AccountPageDetail,
  getInventory,
  getRelatedProducts,
} from "@/lib/queries";
import { categoryHref, productHref } from "@/lib/routes";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";

import { AccountBuyPanel } from "./AccountBuyPanel";
import type { BuyerLevel } from "./SoftwareBuyPanel";
import { AccountGallery } from "./AccountGallery";
import { AccountInventory } from "./AccountInventory";
import { Breadcrumb } from "./Breadcrumb";
import { ProductCard } from "./ProductCard";

/**
 * The section heading the home rows wear (ProductRow): a 3px accent bar before
 * black caps. Inlined here rather than imported so this page carries the one
 * canonical look without waiting on a shared component (the owner,
 * 13/10/2026, UI consistency review).
 */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[3px] h-5 bg-[var(--menzu-accent)] rounded-full shrink-0" />
      <h2
        id={id}
        className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
      >
        {children}
      </h2>
    </div>
  );
}

/**
 * One account's page, whole. The counterpart to SoftwareDetailView: the route
 * decides which of the two a slug means, and this draws the account.
 */
export async function AccountDetailView({
  account: { descriptionHtml, ...account },
  initialQuantity,
  viewer,
}: {
  /**
   * The write-up is split off at the door: the rest goes to the buy panel and
   * the inventory, both client components, and the description is drawn
   * here on the server, so it reaches the browser once, as markup.
   */
  account: AccountPageDetail;
  /** From `?sl=` — the quantity a guest had set before the login gate. */
  initialQuantity?: number;
  /** Who is looking, for an account sold to level 2 only. */
  viewer: BuyerLevel;
}) {
  const [related, inventory] = await Promise.all([
    // At most four (the owner, 13/10/2026, UI consistency review): two rows
    // of two on a tablet, and on a desktop, where the row holds three, the
    // grid below stands the fourth down so no tile sits alone on row two.
    getRelatedProducts(account.code, account.categorySlug, 4),
    getInventory(account.code),
  ]);

  return (
    <>
      <JsonLd
        data={productJsonLd({
          code: account.code,
          // The heading's name and the write-up, or only the figures that
          // have a value (lib/accountSeo.ts), as the title and the meta
          // description say.
          name: accountDisplayName(account),
          description: accountLdDescription(account),
          price: account.price,
          images: [
            account.imageUrl ??
              `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${account.code}.webp`,
            ...account.images,
          ],
          categoryName: account.categoryName,
          // The buy panel's own soldOut rule: a random listing is never
          // "sold", so its pile decides. It said InStock over "Tạm hết hàng"
          // (the owner's SEO review, 13/10/2026).
          available: account.pool ? account.pool.available > 0 : !account.sold,
          restockable: account.pool !== null,
          // The offer used to point at /account/<code>, an address the shop
          // stopped serving — every offer led a crawler to a 404.
          href: productHref(account.categorySlug, account.slug),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: account.categoryName, path: categoryHref(account.categorySlug) },
          { name: `Mã ${account.code}` },
        ])}
      />
          {/* Same 32px of air under the fixed header as the software page —
              the two detail pages should hang their breadcrumbs at one height.
              pb-16 is the resting gap before the footer, the one the tool
              page ends on under its own similar-products row; on the
              container so it holds whichever of the sections below rendered.
              It was pb-24, which with nothing after the buy box read as an
              empty band before the footer (the owner, 13/10/2026, UI
              consistency review). */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8 pb-16">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <AccountGallery
                  code={account.code}
                  imageUrl={account.imageUrl}
                  images={account.images}
                  viewers={account.viewers}
                />
                <AccountBuyPanel
                  account={account}
                  initialQuantity={initialQuantity}
                  viewer={viewer}
                />
              </div>

              <AccountInventory account={account} items={inventory} />
            </div>

            {/* The shop's own write-up for this account, from the admin's
                "Mô tả sản phẩm" field, printed through the renderer the tool
                page uses so headings, bold lines and screenshots arrive caged
                to one allowlist. Only when there is one: a titled section
                over nothing is worse than none (the owner, 13/10/2026, UI
                consistency review). The sign-in lives in its own columns and
                is never part of this. */}
            {descriptionHtml ? (
              <section
                aria-labelledby="account-description-heading"
                className="mt-14 border-t border-white/10 pt-12"
              >
                <div className="mb-5">
                  <SectionTitle id="account-description-heading">
                    Mô tả sản phẩm
                  </SectionTitle>
                </div>
                <DocHtml body={descriptionHtml} />
              </section>
            ) : null}

            {related.length > 0 ? (
              <section
                aria-labelledby="similar-accounts-heading"
                className="mt-14 border-t border-white/10 pt-12"
              >
                <div className="mb-8">
                  <SectionTitle id="similar-accounts-heading">
                    Acc tương tự
                  </SectionTitle>
                </div>
                {/* The category page's grid, so a card here is the same size
                    as the one the customer just came from — four columns made
                    them read as thumbnails of themselves. Where the row holds
                    three, a fourth result is left out rather than stranded
                    alone on a second row. */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8 lg:[&>:nth-child(4)]:hidden">
                  {related.map((p) => (
                    <ProductCard key={p.code} product={p} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
    </>
  );
}
