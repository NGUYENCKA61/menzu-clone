import type { Metadata } from "next";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Check,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { TelegramGlyph } from "@/components/sites/menzu-lol-f7ae197a/shared/BrandGlyphs";
import { AvatarUploader } from "@/components/sites/menzu-lol-f7ae197a/shared/AvatarUploader";
import { TierBadge } from "@/components/sites/menzu-lol-f7ae197a/shared/TierBadge";
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

const QUICK_ACTIONS = [
  { label: "Nạp tiền", href: "/wallet", icon: Wallet },
  { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag },
  { label: "Bảo mật", href: "/security", icon: ShieldCheck },
] as const;

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

  const [settings, linkedRows, query, toppedUpRow] = await Promise.all([
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
  ]);
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <div className="flex items-center gap-4">
              <AvatarUploader avatarUrl={user.avatarUrl} username={user.username} />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xl font-black uppercase tracking-wide leading-none text-white">
                    {user.username}
                  </span>
                  <BadgeCheck size={18} className="shrink-0 fill-emerald-500 text-white" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                  <SkewPlate className="border border-white/10 bg-white/[0.07] text-neutral-300">
                    UID: {user.uid}
                  </SkewPlate>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Đã tham gia:{" "}
                  {user.createdAt.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="border-t border-white/5" />

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Cấp bậc hiện tại
              </span>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-2xl font-black uppercase tracking-wider leading-none ${tier.text}`}
                >
                  {TIER_RULES[memberTier].label}
                </span>
                <TierBadge tier={memberTier} size="sm" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Tiến độ cấp bậc
                </span>
                {/* Lifetime top-ups against the next threshold — the figure
                    the rank is actually earned from. */}
                <span className="text-[10px] font-bold tracking-wider text-neutral-500 tabular-nums">
                  {nextRule
                    ? `${formatVnd(toppedUp)} / ${formatVnd(nextRule.minTopUp)}đ`
                    : `${formatVnd(toppedUp)}đ · hạng cao nhất`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-black/60">
                <div
                  className={`h-full rounded-full ${tier.bar}`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-neutral-400">
              {nextRule && progress.next ? (
                <>
                  Còn{" "}
                  <span className="font-bold text-white tabular-nums">
                    {formatVnd(progress.remaining)}đ
                  </span>{" "}
                  nạp thêm để lên{" "}
                  <span className={`font-bold ${TIER_STYLE[progress.next].text}`}>
                    {nextRule.label}
                  </span>
                  .{" "}
                </>
              ) : (
                "Bạn đang ở hạng cao nhất. "
              )}
              {TIER_RULES[memberTier].discountPercent > 0
                ? `Hạng hiện tại giảm ${formatTierPercent(TIER_RULES[memberTier].discountPercent)}% khi mua tool.`
                : nextRule
                  ? `Lên ${nextRule.label} để bắt đầu được giảm giá khi mua tool.`
                  : ""}{" "}
              <Link
                href="/cap-bac"
                className="font-bold text-[var(--menzu-accent)] hover:underline"
              >
                Xem quyền lợi các hạng →
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  Số dư khả dụng
                </span>
                <span className="text-3xl font-black leading-none text-emerald-400">
                  {formatVnd(user.balance)}{" "}
                  <span className="text-sm font-bold text-emerald-400/80">đ</span>
                </span>
                <span className="mt-auto text-xs text-neutral-500">
                  Sẵn sàng để sử dụng
                </span>
              </div>

              {/* Amber, the ledger's "waiting" colour, as on the affiliate page:
                  money that is yours but not in the wallet yet — and a figure
                  that no longer sits red on a red tint. */}
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  Số tiền hoa hồng khả dụng
                </span>
                <span className="text-3xl font-black leading-none text-amber-400">
                  {formatVnd(user.commissionBalance)}{" "}
                  <span className="text-sm font-bold text-amber-400/80">đ</span>
                </span>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-500">
                    Hoa hồng sẵn sàng rút
                  </span>
                  <WithdrawCommission amount={user.commissionBalance} />
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-black uppercase tracking-wider text-white">
                  Thao tác nhanh
                </span>
                <span className="text-xs text-neutral-500">
                  Truy cập nhanh các chức năng
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
                  // Link, not a bare anchor: these three go to pages this app
                  // serves, and a full reload here throws away the session's
                  // warm client for no reason.
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                      <Icon size={16} className="text-[var(--menzu-accent)]" />
                    </span>
                    <span className="truncate text-sm font-bold leading-none text-white">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

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
