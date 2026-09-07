import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BadgePercent,
  Check,
  Crown,
  HandCoins,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { TelegramGlyph } from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";
import { AvatarUploader } from "@/components/sites/menzu-lol-f7ae197a/shared/AvatarUploader";
import { WithdrawCommission } from "@/components/sites/menzu-lol-f7ae197a/shared/WithdrawCommission";
import {
  DiscordMark,
  GoogleMark,
} from "@/components/sites/menzu-lol-f7ae197a/shared/OAuthButtons";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import {
  formatTierPercent,
  readMemberTier,
  TIER_RULES,
  TIER_STYLE,
  tierProgress,
} from "@/lib/memberTiers";
import { getCurrentUser } from "@/lib/session";
import { discordOauthEnabled, googleOauthEnabled } from "@/lib/settings";
import { linkUrl as telegramLinkUrl } from "@/lib/telegramShop";
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

/** The column of doors beside the tier card; the first is the red one. */
const QUICK_ACTIONS = [
  { label: "Nạp tiền", href: "/wallet", icon: Wallet, primary: true },
  { label: "Xem đơn hàng", href: "/orders", icon: ShoppingBag, primary: false },
  { label: "Bảo mật", href: "/security", icon: ShieldCheck, primary: false },
] as const;

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
    <span className={`inline-flex -skew-x-12 rounded-[4px] px-2.5 py-1.5 ${className}`}>
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

  const [settings, linkedRows, query, toppedUpRow, spentRow, paidOrders, cover] = await Promise.all([
    getShopSettings(),
    db.linkedAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    }),
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
  // The shop's own choice first, then the catalogue's lead cover, then the
  // site backdrop — so the page is never bare.
  const bannerArt = settings.profileBanner || cover?.imageUrl || BANNER_FALLBACK;
  const spent = Math.abs(Number(spentRow._sum.delta ?? 0n));
  const linkedSet = new Set(linkedRows.map((row) => row.provider));
  const isAdmin = user.role === "ADMIN";

  const memberTier = readMemberTier(user.tier);
  const tier = TIER_STYLE[memberTier];
  const toppedUp = Number(toppedUpRow._sum.amount ?? 0n);
  const progress = tierProgress(toppedUp, memberTier);
  const nextRule = progress.next ? TIER_RULES[progress.next] : null;

  const providers = [
    {
      key: "discord",
      name: "Discord",
      perk: "Nhận thông báo đơn hàng",
      enabled: discordOauthEnabled(settings),
      mark: <DiscordMark className="w-5 h-5 text-[#5865F2]" />,
    },
    {
      key: "google",
      name: "Google",
      perk: "Đăng nhập nhanh hơn",
      enabled: googleOauthEnabled(settings),
      mark: <GoogleMark className="w-5 h-5" />,
    },
  ] as const;

  return (
    <AccountPageFrame
      title="Tổng quan tài khoản"
      subtitle="Quản lý tài khoản, số dư và các dịch vụ của bạn."
      crumb="Tổng quan tài khoản"
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

        {/* BANNER — game art behind the identity, faded to the card's own
            ground on the left and along the bottom so the type sits on ink,
            not on a picture. The tier card and the doors live inside it. */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e12]">
          <div className="absolute inset-0">
            <Image
              src={bannerArt}
              alt=""
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 960px"
              className="object-cover object-[70%_30%] opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e12] via-[#0e0e12]/70 to-[#0e0e12]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-[#0e0e12]/60 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-6 p-5 sm:p-7">
            {/* Who — avatar, name, role, when they joined. */}
            <div className="flex items-center gap-4 sm:gap-5">
              <AvatarUploader avatarUrl={user.avatarUrl} username={user.username} />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <span className="truncate text-2xl font-black uppercase tracking-wide leading-none text-white sm:text-3xl">
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
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* The tier card and the doors, side by side from lg. */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0e0e12]/80 p-5 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Cấp bậc
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-bold">
                    <span className={tier.text}>{TIER_RULES[memberTier].label}</span>
                    {nextRule && progress.next ? (
                      <>
                        <span className="text-neutral-600">›</span>
                        <span className={TIER_STYLE[progress.next].text}>{nextRule.label}</span>
                      </>
                    ) : null}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums leading-none text-white">
                      {formatVnd(toppedUp)}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-neutral-500">
                      {nextRule ? `/ ${formatVnd(nextRule.minTopUp)}đ đã nạp` : "đ đã nạp · hạng cao nhất"}
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
                        <span className="font-bold tabular-nums text-white">
                          {formatVnd(progress.remaining)}đ
                        </span>{" "}
                        để lên{" "}
                        <span className={`font-bold ${TIER_STYLE[progress.next].text}`}>
                          {nextRule.label}
                        </span>
                      </>
                    ) : (
                      "Bạn đang ở hạng cao nhất"
                    )}
                    <span className="mx-1.5 text-neutral-600">·</span>
                    <Link href="/cap-bac" className="font-bold text-[var(--menzu-accent)] hover:underline">
                      Xem quyền lợi các hạng →
                    </Link>
                  </p>
                </div>

                {/* Three facts the rank brings, in one row. */}
                <div className="grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                  {[
                    { icon: Crown, label: "Hạng hiện tại", value: TIER_RULES[memberTier].label, tone: tier.text },
                    {
                      icon: BadgePercent,
                      label: "Ưu đãi mua tool",
                      value: TIER_RULES[memberTier].discountPercent > 0
                        ? `Giảm ${formatTierPercent(TIER_RULES[memberTier].discountPercent)}%`
                        : "Chưa có",
                      tone: "text-white",
                    },
                    { icon: Receipt, label: "Đơn đã mua", value: `${paidOrders} đơn`, tone: "text-white" },
                  ].map(({ icon: Icon, label, value, tone }) => (
                    <div key={label} className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                        <Icon size={15} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {label}
                        </span>
                        <span className={`truncate text-sm font-black ${tone}`}>{value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {QUICK_ACTIONS.map(({ label, href, icon: Icon, primary }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-black uppercase tracking-wider transition-colors ${
                      primary
                        ? "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
                        : "border-white/10 bg-[#0e0e12]/80 text-neutral-200 backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                ))}
                {(() => {
                  const discord = providers.find((p) => p.key === "discord");
                  const linked = linkedSet.has("discord");
                  const enabled = discord?.enabled ?? false;
                  const cls =
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0e0e12]/80 text-[12px] font-black uppercase tracking-wider text-neutral-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.06]";
                  if (linked) {
                    return (
                      <span className={`${cls} cursor-default text-emerald-300`}>
                        <DiscordMark className="h-4 w-4 text-[#5865F2]" /> Discord · đã liên kết
                      </span>
                    );
                  }
                  if (!enabled || !discord) return null;
                  // A plain anchor on purpose, as the link rows below: this is
                  // an OAuth door served by a route handler, not a page.
                  return (
                    <a href={`/api/auth/${discord.key}?next=%2Fprofile`} className={cls}>
                      <DiscordMark className="h-4 w-4 text-[#5865F2]" /> Discord
                    </a>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* FOUR FIGURES — the account in numbers, one strip. The commission
            tile keeps its withdraw door; a referrer with nothing earned sees a
            truthful zero and the door stays locked. */}
        <section className="grid grid-cols-2 divide-white/[0.06] rounded-2xl border border-white/10 bg-neutral-900/50 lg:grid-cols-4 lg:divide-x">
          {[
            { icon: Wallet, label: "Số dư khả dụng", value: formatVnd(user.balance), unit: "đ", tone: "text-emerald-400" },
            { icon: Receipt, label: "Tổng chi tiêu", value: formatVnd(spent), unit: "đ", tone: "text-white" },
            { icon: ShoppingBag, label: "Đơn hàng", value: String(paidOrders), unit: "", tone: "text-white" },
          ].map(({ icon: Icon, label, value, unit, tone }) => (
            <div key={label} className="flex flex-col gap-3 p-5">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-neutral-300">
                  <Icon size={13} />
                </span>
                {label}
              </span>
              <span className={`text-2xl font-black tabular-nums leading-none ${tone}`}>
                {value}
                {unit ? <span className="ml-1 text-xs font-bold text-neutral-500">{unit}</span> : null}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-3 p-5">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-neutral-300">
                <HandCoins size={13} />
              </span>
              Hoa hồng khả dụng
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-2xl font-black tabular-nums leading-none text-white">
                {formatVnd(user.commissionBalance)}
                <span className="ml-1 text-xs font-bold text-neutral-500">đ</span>
              </span>
              <WithdrawCommission amount={user.commissionBalance} />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-black uppercase tracking-wider text-white">
              Liên kết tài khoản
            </span>
            <span className="text-xs text-neutral-500">
              Kết nối để sử dụng thêm tiện ích
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Telegram is not an OAuth door: the link is a signed t.me URL the
                shop bot verifies, and "linked" is the telegramId on the user
                row rather than an oauth_links entry. Same card, its own state. */}
            {(() => {
              const telegramLink = telegramLinkUrl(settings, user.id);
              return (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/50">
                    <TelegramGlyph className="w-5 h-5 text-[#29a9eb]" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-bold leading-none text-white">Telegram</span>
                    <span className="truncate text-[11px] leading-none text-neutral-500">
                      {user.telegramId ? "Đã liên kết" : "Chưa liên kết"} · Mua hàng và nhận key ngay trong Telegram
                    </span>
                  </span>
                  {user.telegramId ? (
                    <span className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      <Check size={12} /> Đã liên kết
                    </span>
                  ) : telegramLink ? (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--menzu-accent)] px-4 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#ff1f4a]"
                    >
                      Liên kết
                    </a>
                  ) : (
                    <span
                      title="Chưa bật — điền token bot bán hàng Telegram ở Cấu hình để mở"
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-wider text-neutral-500"
                    >
                      Chưa mở
                    </span>
                  )}
                </div>
              );
            })()}
            {providers.map((provider) => {
              const isLinked = linkedSet.has(provider.key);
              return (
                <div
                  key={provider.key}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/50">
                    {provider.mark}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-bold leading-none text-white">
                      {provider.name}
                    </span>
                    <span className="truncate text-[11px] leading-none text-neutral-500">
                      {isLinked ? "Đã liên kết" : "Chưa liên kết"} · {provider.perk}
                    </span>
                  </span>
                  {isLinked ? (
                    <span className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      <Check size={12} /> Đã liên kết
                    </span>
                  ) : provider.enabled ? (
                    <a
                      href={`/api/auth/${provider.key}?next=%2Fprofile`}
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--menzu-accent)] px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
                    >
                      Liên kết
                    </a>
                  ) : (
                    // No keys in Cấu hình means no door. It says so instead of
                    // wearing the same accent as the button that works — a
                    // control that looks live and does nothing costs the reader
                    // a click to find out.
                    <span
                      title={`Chưa bật — điền khóa ${provider.name} ở Cấu hình để mở`}
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-widest text-neutral-400"
                    >
                      Chưa mở
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AccountPageFrame>
  );
}
