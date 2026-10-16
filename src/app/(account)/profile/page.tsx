import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BadgePercent,
  ChevronRight,
  Gift,
  HandCoins,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AccountPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPanel";
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
 * Laid out to the user's mockup, dressed in this site's own components: a
 * two-column grid — the identity-and-tier card on the left; balance, the
 * commission card, and quick actions on the right — with the account-link
 * rows full-width underneath and an edit button at header level.
 *
 * The commission card reads the wallet's own commission balance, so a referrer
 * with nothing earned sees a truthful zero and Rút tiền stays locked.
 */

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  discord: "Discord",
};

/** The column of doors beside the tier card; the first is the red one.
 *  Four, named the way the sidebar names them; Bảo mật joined on 16/10/2026
 *  with the owner's reference layout ("hay theo bố cục này thử"), which
 *  stacks four doors beside the tier card. Discord stays with the links. */
const QUICK_ACTIONS = [
  { label: "Nạp tiền", href: "/wallet", icon: Wallet, primary: true },
  { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag, primary: false },
  { label: "Bảo mật", href: "/security", icon: ShieldCheck, primary: false },
  { label: "Đổi thưởng", href: "/vong-quay", icon: Gift, primary: false },
] as const;

/** All three doors, the wheel's too while its event is suspended (the owner,
 *  16/10/2026: "hiện đổi thưởng", undoing 07/10's "ẩn luôn đi"); that door
 *  then opens the "Tạm ngưng sự kiện" sheet. */
const DOORS = QUICK_ACTIONS;

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
    // The account panel holding the art card, the way /wallet and /security
    // hold theirs (the owner, 16/10/2026, with a picture of this layout: "sửa
    // lại như này đi"; the one-card trial of 03/10 is undone). The layout
    // inside is this shop's own (29/09: "bố cục theo web mình").
    <AccountPageFrame crumb="Tổng quan tài khoản">
      <AccountPanel
        icon={LayoutDashboard}
        title="Tổng quan tài khoản"
        subtitle="Quản lý tài khoản, số dư và các dịch vụ của bạn."
      >
      <div className="flex flex-col gap-4">
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

        {/* BANNER — the cover fills the card from sm (on a phone it heads it),
            laid out to the owner's reference card (16/10/2026, "hay theo bố cục
            này thử"): a tall band of picture above the avatar and the name, a
            soft wash off the left edge and a strong one rising from the foot,
            which the tier card and the doors sit on. The frame is the account
            panel's and the sidebar's: a 5% rim, 24px corners (03/10/2026:
            "màu card trái và card phải đồng bộ"). */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
          <BannerUploader hasOwn={Boolean(user.bannerUrl)} />

          {/* On a phone the card is ~3x taller than the art is wide-shaped
              for, so filling it blew a quarter of the picture up 3.3x into
              a green blur. There the art heads the card, behind the avatar
              and name, and the foot wash fades it into the card's #111. */}
          <div className="absolute inset-x-0 top-0 h-56 sm:inset-0 sm:h-auto">
            <Image
              src={bannerArt}
              alt=""
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 960px"
              className="object-cover object-[60%_28%] opacity-95"
            />
            {/* Left wash: enough to seat the name, gone by a third across. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/45 to-transparent" />
            {/* Foot wash: the band the tier card and the doors sit on. */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/55 to-transparent" />
          </div>

          {/* 96px of cover above the avatar from sm, 32px of padding around,
              32px between the name and the tier card: the reference's
              proportions on this card's width. */}
          <div className="relative flex flex-col gap-5 p-5 pt-14 sm:gap-8 sm:p-8 sm:pt-24">
            {/* Who — avatar, name, role, when they joined. */}
            <div className="flex items-center gap-4 sm:gap-5">
              <AvatarUploader avatarUrl={user.avatarUrl} username={user.username} />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  {/* The card's title: a step under the page's h1 on a phone,
                      level with it from sm, as the reference's name is. */}
                  <span className="truncate text-xl font-black uppercase tracking-wide leading-none text-white sm:text-2xl">
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
            </div>

            {/* The tier card and the doors, side by side from xl: the card
                takes the width, the doors a 200px column (a quarter of the
                card, the reference's share). Below xl the doors make a row
                under the card. */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_200px]">
              <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#111111]/60 p-5 backdrop-blur-md sm:p-6">
                {/* The rank, and the one after it in its own metal. */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Cấp bậc
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    {nextRule ? (
                      <>
                        <span className="text-neutral-400">{TIER_RULES[memberTier].label}</span>
                        <ChevronRight size={14} className="text-neutral-500" aria-hidden />
                        <span className={tier.text}>{nextRule.label}</span>
                      </>
                    ) : (
                      <span className={tier.text}>{TIER_RULES[memberTier].label}</span>
                    )}
                  </span>
                </div>

                {/* What the rank is earned from, in the open: the lifetime
                    top-ups against the next rank's line, then the bar, then
                    how much is left. The reference prints its points the
                    same way; here the rank is bought with top-ups. */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    <span className="text-2xl font-black tabular-nums leading-none text-white sm:text-3xl">
                      {formatVnd(toppedUp)}
                    </span>
                    <span className="text-sm font-semibold text-neutral-400">
                      {progress.to !== null ? `/ ${formatVnd(progress.to)} đ đã nạp` : "đ đã nạp"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/5 bg-black/60">
                    <div
                      className={`h-full rounded-full ${tier.bar}`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    {nextRule && progress.next ? (
                      <>
                        Còn{" "}
                        <span className="font-bold text-white">{formatVnd(progress.remaining)} đ</span>{" "}
                        để lên{" "}
                        <Link
                          href="/cap-bac"
                          className={`font-bold underline-offset-2 transition-colors hover:underline ${tier.text}`}
                        >
                          {nextRule.label}
                        </Link>
                      </>
                    ) : (
                      "Bạn đang ở hạng cao nhất"
                    )}
                  </p>
                </div>

                {/* What the rank is worth today, the points, and whether the
                    account is verified (16/10/2026: "Hạng hiện tại Elite đổi thành
                    xác minh cấp 2"), each behind a round badge as the reference
                    draws its three. Rows on a phone, three cells from sm. */}
                <div className="mt-auto grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
                  {[
                    {
                      icon: BadgePercent,
                      label: "Ưu đãi mua tool",
                      value: `Giảm ${formatTierPercent(TIER_RULES[memberTier].discountPercent)}%`,
                      tone: tier.text,
                    },
                    {
                      icon: Sparkles,
                      label: "Điểm thưởng",
                      value: `${user.points.toLocaleString("vi-VN")} điểm`,
                      tone: "text-white",
                    },
                    {
                      icon: ShieldCheck,
                      label: "Xác minh cấp 2",
                      value: user.verifiedAt ? "Đã xác minh" : "Chưa xác minh",
                      tone: user.verifiedAt ? "text-emerald-400" : "text-neutral-300",
                    },
                  ].map(({ icon: Icon, label, value, tone }, index) => (
                    <div
                      key={label}
                      className={`flex min-w-0 items-center gap-3 ${index > 0 ? "sm:pl-4" : ""} ${index < 2 ? "sm:pr-4" : ""}`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] ${tone}`}
                        aria-hidden
                      >
                        <Icon size={16} />
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-black uppercase leading-tight tracking-widest text-neutral-500">
                          {label}
                        </span>
                        <span className={`truncate text-[13px] font-bold leading-none ${tone}`}>{value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone: 2x2. sm–lg: one row of four. xl: the column, the four
                  spread over the tier card's height as the reference spreads
                  its four. */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-1 xl:content-between">
                {DOORS.map(({ label, href, icon: Icon, primary }) => (
                  <Link
                    key={href}
                    href={href}
                    // Flat, as every other red button in the account area is
                    // (the agency desk's own Nạp tiền, /security's submit).
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                      primary
                        ? "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
                        : "border-white/15 bg-black/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md hover:border-white/35 hover:bg-black/50"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* THE ACCOUNT IN NUMBERS — the same four cells as the strip across the
            foot of the card, now one framed row of their own under it (the owner,
            16/10/2026, with a capture of the strip after a mocked-up page of
            separate cards: "cỡ này thử", then "gắn dính lại thử" on the four
            loose cards; nothing in the cells changes). Four across from xl,
            the order count giving width to the commission
            cell: in equal quarters "Rút tiền" dropped under any commission from
            10.000đ. */}
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] sm:mt-2 xl:grid-cols-[1fr_1fr_0.7fr_1.3fr] xl:divide-x xl:divide-white/[0.06]">
          {[
            { icon: Wallet, label: "Số dư khả dụng", value: formatVnd(user.balance), unit: "đ", tone: "text-emerald-400" },
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
          <div className="flex flex-col gap-2 px-5 py-4 sm:gap-3">
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
      </AccountPanel>
    </AccountPageFrame>
  );
}
