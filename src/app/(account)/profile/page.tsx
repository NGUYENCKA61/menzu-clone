import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  HandCoins,
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AvatarUploader } from "@/components/sites/menzu-lol-f7ae197a/shared/AvatarUploader";
import { BannerUploader } from "@/components/sites/menzu-lol-f7ae197a/shared/BannerUploader";
import { WithdrawCommission } from "@/components/sites/menzu-lol-f7ae197a/shared/WithdrawCommission";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { SHOP_TZ } from "@/lib/dayGroups";
import { db } from "@/lib/db";
import {
  formatTierPercent,
  readMemberTier,
  TIER_RULES,
  TIER_STYLE,
  tierProgress,
} from "@/lib/memberTiers";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Tổng quan tài khoản",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/**
 * One flat card in the account panel's own dress (16/10/2026): the title,
 * the member's cover as a band, who they are beside one Nạp tiền door, the
 * tier in a line, and the account's numbers along the foot.
 *
 * The commission card reads the wallet's own commission balance, so a referrer
 * with nothing earned sees a truthful zero and Rút tiền stays locked.
 */

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  discord: "Discord",
};

/** Behind the banner when no category has a cover: the shop's own backdrop. */
const BANNER_FALLBACK = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/f945cb242281183.696998e170840.webp";

/** The parallelogram role plate carried over from the previous pass. */
function SkewPlate({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    // px-2 py-1: the same plate the header menu draws for the same role
    // (UserMenu.tsx), which calls them one badge.
    <span className={`inline-flex -skew-x-12 rounded-[4px] px-2 py-1 ${className}`}>
      <span className="skew-x-12 text-[10px] font-black uppercase tracking-widest leading-none">
        {children}
      </span>
    </span>
  );
}

/** The page's title and its line, the way every account page prints them. */
function OverviewTitle({ className }: { className: string }) {
  return (
    <div className={className}>
      <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
        <LayoutDashboard size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
        Tổng quan tài khoản
      </h1>
      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
        Quản lý tài khoản, số dư và các dịch vụ của bạn.
      </p>
    </div>
  );
}

interface ProfilePageProps {
  searchParams: Promise<{ linked?: string; linkError?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fprofile");

  const [settings, query, toppedUpRow, spentRow, paidOrders, cover] = await Promise.all([
    getShopSettings(),
    searchParams,
    // Lifetime completed top-ups: what the tier is earned from.
    db.topUp.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, status: "COMPLETED" },
    }),
    // Lifetime spend: every purchase line in the ledger, negative by sign.
    db.transaction.aggregate({
      _sum: { delta: true },
      where: { userId: user.id, kind: "PURCHASE", status: "SUCCESS" },
    }),
    db.order.count({ where: { userId: user.id, status: "PAID" } }),
    // The banner wears the first category's cover — the game art the shop
    // leads with — so the page changes when the catalogue does.
    db.category.findFirst({
      where: { imageUrl: { not: null } },
      orderBy: { sortOrder: "asc" },
      select: { imageUrl: true },
    }),
  ]);
  // The member's own choice first — this is their page — then the shop's,
  // then the catalogue's lead cover, then the site backdrop, so the card is
  // never bare for somebody who never picked one.
  const bannerArt =
    user.bannerUrl || settings.profileBanner || cover?.imageUrl || BANNER_FALLBACK;
  const spent = Math.abs(Number(spentRow._sum.delta ?? 0n));
  const isAdmin = user.role === "ADMIN";

  const memberTier = readMemberTier(user.tier);
  const tier = TIER_STYLE[memberTier];
  const toppedUp = Number(toppedUpRow._sum.amount ?? 0n);
  const progress = tierProgress(toppedUp, memberTier);
  const nextRule = progress.next ? TIER_RULES[progress.next] : null;

  return (
    // One card, the page's title inside it, the way /orders draws "Lịch sử
    // mua hàng" inside its own panel, rather than a #111 panel holding a
    // card (the owner, 03/10/2026: "hay nhét tổng quan tài khoản vô dồn về 1
    // card thôi"). On a phone, where that panel never drew a plate, the title
    // stays above the card: inside it, beside the banner menu's button, it
    // broke onto two lines. The layout inside is this shop's own (29/09: "bố
    // cục theo web mình").
    <AccountPageFrame crumb="Tổng quan tài khoản">
      <div className="flex flex-col gap-4">
        <OverviewTitle className="mb-2 sm:hidden" />
        {query.linked && PROVIDER_NAMES[query.linked] ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
            Đã liên kết {PROVIDER_NAMES[query.linked]} vào tài khoản của bạn.
          </div>
        ) : null}
        {query.linkError && PROVIDER_NAMES[query.linkError] ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            Tài khoản {PROVIDER_NAMES[query.linkError]} này đang liên kết với một
            người dùng khác.
          </div>
        ) : null}

        {/* ONE FLAT CARD, like /wallet's and /security's panels (the owner,
            16/10/2026: "chỉ sửa cái card tổng quan tài khoản", after asking
            for it "không rối" and "đồng bộ với những trang khác"): the title,
            the member's cover as a slim band, who they are with one red door,
            the tier in one line, and the numbers. Until then the art filled
            the whole card behind glass boxes and two more doors. The frame is
            the account panel's and the sidebar's: a 5% rim, 24px corners. */}
        <section className="overflow-hidden rounded-[24px] border border-white/5 bg-[#111111]">
          <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-7">
            <OverviewTitle className="hidden sm:block" />

            {/* The cover: the member's own picture (else the shop's, else the
                catalogue's), a band rather than a backdrop, its menu in the
                corner (BannerUploader positions itself top right). */}
            <div className="relative h-24 overflow-hidden rounded-xl border border-white/5 sm:h-28">
              <Image
                src={bannerArt}
                alt=""
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 960px"
                className="object-cover object-[60%_28%]"
              />
              <BannerUploader hasOwn={Boolean(user.bannerUrl)} />
            </div>

            {/* Who, and the one door worth repeating: Nạp tiền. Lịch sử mua
                and the rest are one click away in the sidebar. */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <AvatarUploader avatarUrl={user.avatarUrl} username={user.username} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  {/* A card title under the page's h1, so one step below it:
                      18/20px under the 20/24px title, as /wallet's card
                      titles are. */}
                  <span className="truncate text-lg font-black uppercase tracking-wide leading-none text-white sm:text-xl">
                    {user.username}
                  </span>
                  <BadgeCheck size={18} className="shrink-0 fill-emerald-500 text-white" />
                  <SkewPlate
                    className={
                      isAdmin
                        ? "bg-[var(--menzu-accent)] text-white"
                        : user.role === "AGENCY"
                          ? "bg-gradient-to-r from-[#b45309] to-[#d97706] text-white"
                          : "bg-gradient-to-r from-neutral-600 to-neutral-700 text-white"
                    }
                  >
                    {isAdmin ? "Admin" : user.role === "AGENCY" ? "Đại lý" : "Member"}
                  </SkewPlate>
                </div>
                <span className="text-[12px] font-semibold text-neutral-300">
                  UID {user.uid}
                  <span className="mx-2 text-neutral-600">·</span>
                  Tham gia từ{" "}
                  {user.createdAt.toLocaleDateString("vi-VN", {
                    timeZone: SHOP_TZ,
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
              <Link
                href="/wallet"
                // Flat, as every other red button in the account area is.
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--menzu-accent)] bg-[var(--menzu-accent)] px-5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] sm:w-auto"
              >
                <Wallet size={14} />
                Nạp tiền
              </Link>
            </div>

            {/* The tier in one line, the row a door to /cap-bac, with a slim
                bar underneath while there is a rank left to reach. It was a
                glass box with a bar, a sentence and three small figures. */}
            <Link
              href="/cap-bac"
              className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-white/25"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Cấp bậc
                </span>
                <span className={`font-bold ${tier.text}`}>{TIER_RULES[memberTier].label}</span>
                <span className="text-neutral-600" aria-hidden>·</span>
                <span className="text-neutral-200">
                  Giảm {formatTierPercent(TIER_RULES[memberTier].discountPercent)}%<span className="hidden sm:inline"> khi mua tool</span>
                </span>
                <span className="text-neutral-600" aria-hidden>·</span>
                <span className="text-neutral-200">{user.points.toLocaleString("vi-VN")} điểm</span>
                <span className="ml-auto text-[11px] font-bold text-neutral-400 transition-colors group-hover:text-white">
                  {nextRule
                    ? `Lên ${nextRule.label}: giảm ${formatTierPercent(nextRule.discountPercent)}%`
                    : "Hạng cao nhất"}
                </span>
              </div>
              {nextRule ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
                  <div
                    className={`h-full rounded-full ${tier.bar}`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              ) : null}
            </Link>

            {/* THE ACCOUNT IN NUMBERS, a flat band at the card's foot: three
                across from xl, the order count giving width to the commission
                cell so "Rút tiền" stays beside its figure. */}
            <div className="-mx-5 -mb-5 grid grid-cols-2 border-t border-white/10 bg-black/20 sm:-mx-7 sm:-mb-7 xl:grid-cols-[1fr_0.7fr_1.3fr] xl:divide-x xl:divide-white/[0.06]">
              {[
                { icon: Receipt, label: "Tổng chi tiêu", value: formatVnd(spent), unit: "đ", tone: "text-white" },
                { icon: ShoppingBag, label: "Đơn hàng", value: String(paidOrders), unit: "", tone: "text-white" },
              ].map(({ icon: Icon, label, value, unit, tone }) => (
                // Label over figure the way /vong-quay builds its stat tiles:
                // a bare 13px icon (no 28px box), the unit at text-sm, and
                // the figure a step smaller on phones, where 24px ran past
                // a 2x2 cell.
                <div key={label} className="flex flex-col gap-2 px-5 py-4 sm:gap-3">
                  <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <Icon size={13} className="shrink-0 text-neutral-300" />
                    {label}
                  </span>
                  <span className="flex min-h-9 items-center">
                    <span className={`text-xl font-black tabular-nums leading-none sm:text-2xl ${tone}`}>
                      {value}
                      {unit ? (
                        <span className="ml-1 text-sm font-bold text-neutral-500">{unit}</span>
                      ) : null}
                    </span>
                  </span>
                </div>
              ))}
              {/* Three cells in a two-column strip: this one takes the whole
                  second row below xl. */}
              <div className="col-span-2 flex flex-col gap-2 border-t border-white/[0.06] px-5 py-4 sm:gap-3 xl:col-span-1 xl:border-t-0">
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  <HandCoins size={13} className="shrink-0 text-neutral-300" />
                  Hoa hồng khả dụng
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-h-9 items-center">
                    <span className="text-xl font-black tabular-nums leading-none text-white sm:text-2xl">
                      {formatVnd(user.commissionBalance)}
                      <span className="ml-1 text-sm font-bold text-neutral-500">đ</span>
                    </span>
                  </span>
                  <WithdrawCommission amount={user.commissionBalance} />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </AccountPageFrame>
  );
}
