import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import { AccountBuyPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import { AccountGallery } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountGallery";
import { AccountInventory } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountInventory";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { getAccountDetail, getRelatedProducts } from "@/lib/queries";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const account = await getAccountDetail(code);
  if (!account) return { title: "Menzu Valorant" };
  return {
    title: `Menzu Valorant | Mã ${code} - ${code.replace(
      /^([A-Z]+)/,
      "$1#",
    )} | Giá bán: ${formatVnd(account.price)}đ`,
  };
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { code } = await params;

  const account = await getAccountDetail(code);
  if (!account) notFound();

  const related = await getRelatedProducts(account.code, account.categorySlug);

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-indigo-500/30">
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
          <PageBackdrop />
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6">
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
                <AccountGallery code={account.code} viewers={account.viewers} />
                <AccountBuyPanel account={account} />
              </div>

              <AccountInventory account={account} />
            </div>

            {related.length > 0 ? (
              <div className="mt-20 border-t border-white/5 pt-12">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-8">
                  Tài Khoản Tương Tự
                </h2>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
