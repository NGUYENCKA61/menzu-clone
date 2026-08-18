import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { AccountBuyPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import { AccountGallery } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountGallery";
import { AccountInventory } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountInventory";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAccountDetail, getInventory, getRelatedProducts } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const account = await getAccountDetail(code);
  if (!account) return { title: "Không tìm thấy tài khoản" };

  // The live site puts the price in the <title>; kept as-is because it is the
  // single strongest click signal on a shop listing in search results.
  const title = `Mã ${code} - ${code.replace(/^([A-Z]+)/, "$1#")} | Giá bán: ${formatVnd(
    account.price,
  )}đ`;
  const description =
    `Account Valorant mã ${code} — rank ${account.rank}, ${account.weaponSkins} skin súng, ` +
    `${account.agents} agent, level ${account.level}. Giá ${formatVnd(account.price)}đ. ` +
    `Bàn giao ngay sau khi thanh toán.`;
  const image =
    account.imageUrl ??
    `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${code}.webp`;

  return {
    title,
    description,
    alternates: { canonical: `/account/${code}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/account/${code}`,
      images: [{ url: image, alt: `Kho đồ tài khoản ${code}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { code } = await params;

  const account = await getAccountDetail(code);
  if (!account) notFound();

  const [related, inventory] = await Promise.all([
    // Three, matching the grid's columns — a fourth would sit alone on row two.
    getRelatedProducts(account.code, account.categorySlug, 3),
    getInventory(account.code),
  ]);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
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
          { name: account.categoryName, path: `/category/${account.categorySlug}` },
          { name: `Mã ${account.code}` },
        ])}
      />
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          {/* Same 32px of air under the fixed header as the software page —
              the two detail pages should hang their breadcrumbs at one height.
              pb-24 is the resting gap before the footer's payment strip, on
              the container so it holds whether or not "Tài Khoản Tương Tự"
              rendered. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8 pb-24">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                {
                  label: account.categoryName,
                  href: `/category/${account.categorySlug}`,
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

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
