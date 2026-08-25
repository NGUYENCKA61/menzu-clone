import type { Metadata } from "next";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Check,
  Gem,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { AvatarUploader } from "@/components/sites/menzu-lol-f7ae197a/shared/AvatarUploader";
import { WithdrawCommission } from "@/components/sites/menzu-lol-f7ae197a/shared/WithdrawCommission";
import {
  DiscordMark,
  GoogleMark,
} from "@/components/sites/menzu-lol-f7ae197a/shared/OAuthButtons";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { discordOauthEnabled, googleOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Tổng quan tài khoản" };
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

/** Progress ceiling the tier bar counts toward. */
const XP_CAP = 1000;

/** Each MemberTier's colour kit; unknown values wear bronze. */
const TIERS: Record<string, { text: string; bar: string }> = {
  BRONZE: { text: "text-orange-300", bar: "bg-orange-400" },
  SILVER: { text: "text-neutral-300", bar: "bg-neutral-300" },
  GOLD: { text: "text-amber-300", bar: "bg-amber-400" },
  PLATINUM: { text: "text-cyan-300", bar: "bg-cyan-400" },
  DIAMOND: { text: "text-violet-300", bar: "bg-violet-400" },
};

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

  const [settings, linkedRows, query] = await Promise.all([
    getShopSettings(),
    db.linkedAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    }),
    searchParams,
  ]);
  const linkedSet = new Set(linkedRows.map((row) => row.provider));
  const isAdmin = user.role === "ADMIN";

  const tier = TIERS[user.tier] ?? TIERS.BRONZE!;
  const xpPercent = Math.min(100, (user.points / XP_CAP) * 100);

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
                  <BadgeCheck size={18} className="shrink-0 fill-[#7c3aed] text-white" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SkewPlate
                    className={
                      isAdmin
                        ? "bg-[var(--menzu-accent)] text-white"
                        : user.role === "AGENCY"
                          ? "bg-gradient-to-r from-[#b45309] to-[#d97706] text-white"
                          : "bg-gradient-to-r from-[#7b3fe4] to-[#9354ff] text-white"
                    }
                  >
                    {isAdmin ? "Admin" : user.role === "AGENCY" ? "Đại lý" : "Member"}
                  </SkewPlate>
                  <SkewPlate className="border border-white/10 bg-white/[0.07] text-neutral-300">
                    UID: {user.uid}
                  </SkewPlate>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
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
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Cấp bậc hiện tại
              </span>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-2xl font-black uppercase tracking-wider leading-none ${tier.text}`}
                >
                  {user.tier}
                </span>
                <Gem size={20} className="shrink-0 text-neutral-500" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Tiến độ cấp bậc
                </span>
                {/* XP is Điểm thưởng counted against the mockup's 1.000
                    ceiling — no separate experience number exists yet. */}
                <span className="text-[10px] font-bold tracking-wider text-neutral-500">
                  {formatVnd(user.points)} / {formatVnd(XP_CAP)} XP
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-black/60">
                <div
                  className={`h-full rounded-full ${tier.bar}`}
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-neutral-400">
              Tích lũy để thừa hưởng thêm đặc quyền và ưu đãi dành riêng cho
              thành viên
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

              <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  Số tiền hoa hồng khả dụng
                </span>
                <span className="text-3xl font-black leading-none text-rose-400">
                  {formatVnd(user.commissionBalance)}{" "}
                  <span className="text-sm font-bold text-rose-400/80">đ</span>
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
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--brand)]/25 bg-[var(--brand)]/15">
                      <Icon size={16} className="text-[#a78bfa]" />
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
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--brand)] px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--brand-dark)]"
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
                      className="ml-auto inline-flex h-9 shrink-0 items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-widest text-neutral-500"
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
