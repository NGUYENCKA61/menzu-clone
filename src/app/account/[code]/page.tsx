import type { Metadata } from "next";

import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { PageBackdrop } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/PageBackdrop";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ToolsRail } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ToolsRail";
import {
  AccountBuyPanel,
  type AccountDetail,
} from "@/components/sites/menzu-lol-f7ae197a/shared/AccountBuyPanel";
import { AccountGallery } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountGallery";
import { AccountInventory } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountInventory";
import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/shared/ProductCard";
import {
  CATEGORY_PRODUCTS,
  formatVnd,
} from "@/components/sites/menzu-lol-f7ae197a/shared/productData";

/**
 * Real values read from https://menzu.lol/account/VLR2030. Everything except
 * this one account falls back to the listing data until the API exists —
 * inventing stats for the others would be guesswork.
 */
const VLR2030: AccountDetail = {
  code: "VLR2030",
  rank: "Unranked",
  lastRank: "DIAMOND 1 (V26 // ACT III)",
  weaponSkins: 42,
  buddies: 40,
  agents: 26,
  cards: 51,
  sprays: 49,
  level: 91,
  vp: 301,
  rp: 0,
  kc: 1833,
  tag: "DROP MAIL",
  mailType: "Mail gốc",
  oldPrice: 4_800_000,
  price: 2_990_000,
  depositFrom: 299_000,
  categoryName: "ACCOUNT VALORANT TỰ CHỌN",
  categorySlug: "account-valorant-tu-chon",
  viewers: 6,
};

function buildDetail(code: string): AccountDetail {
  if (code === VLR2030.code) return VLR2030;

  const listed = CATEGORY_PRODUCTS.find((p) => p.code === code);
  if (!listed) return { ...VLR2030, code };

  return {
    ...VLR2030,
    code,
    rank: listed.rank,
    lastRank: null,
    weaponSkins: listed.skins,
    tag: listed.tag,
    oldPrice: listed.oldPrice,
    price: listed.price,
  };
}

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const detail = buildDetail(code);
  return {
    title: `Menzu Valorant | Mã ${code} - ${code.replace(
      /^([A-Z]+)/,
      "$1#",
    )} | Giá bán: ${formatVnd(detail.price)}đ`,
  };
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { code } = await params;
  const account = buildDetail(code);
  const related = CATEGORY_PRODUCTS.filter((p) => p.code !== code).slice(0, 4);

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
          </div>
        </div>
        <SiteFooter />
      </main>

      <ToolsRail />
      <MobileBottomNav />
    </div>
  );
}
