import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Check,
  Gift,
  HandCoins,
  LayoutDashboard,
  Receipt,
  ShoppingBag,
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
 *  Three, named the way the sidebar names them. Bảo mật is one click away in
 *  that sidebar already, and Discord belongs with the other links. */
const QUICK_ACTIONS = [
  { label: "Nạp tiền", href: "/wallet", icon: Wallet, primary: true },
  { label: "Lịch sử mua", href: "/orders", icon: ShoppingBag, primary: false },
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

        {/* BANNER — game art across the top of the card only, behind the avatar
            and the name; from the tier card down the ground is the card's own
            #111 (the owner, 16/10/2026, TRIAL: "sao tui cảm giác rối quá",
            "thử đi"). Before, the art filled the card, darkened only where the
            words sit: a soft wash off the left edge, and a stronger one rising
            from the bottom. The tier card and the doors live inside it. The
            frame is the account panel's and the sidebar's: a 5% rim, 24px
            corners (03/10/2026: "màu card trái và card phải đồng bộ"). */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
          <BannerUploader hasOwn={Boolean(user.bannerUrl)} />

          {/* On a phone the card is ~3x taller than the art is wide-shaped
              for, so filling it blew a quarter of the picture up 3.3x into
              a green blur. There the art heads the card, behind the avatar
              and name, and the foot wash fades it into the card's #111. */}
          <div className="absolute inset-x-0 top-0 h-56 sm:h-60">
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-4 p-5 pt-14 sm:gap-6 sm:p-7">
            {/* Who — avatar, name, role, when they joined. */}
            <div className="flex items-center gap-4 sm:gap-5">
              <AvatarUploader avatarUrl={user.avatarUrl} username={user.username} />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  {/* A card title under the page's h1, so one step below it:
                      18/20px under the 20/24px title, as /wallet's card
                      titles are. It was 30px, bigger than the title. */}
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
            </div>

            {/* The tier card and the doors, side by side from xl. At lg the
                sidebar is already beside the panel, and the 240px door
                column squeezed the tier card to ~276px, cutting its figures
                to "Giảm …"; below xl the doors make one row under it. The column is
                180px since 16/10/2026 (the owner: "kéo dài chiều ngang thanh cấp
                bậc", the doors narrower so the tier card runs wider). */}
            <div className="grid grid-cols-1 gap-4 sm:mt-20 xl:grid-cols-[minmax(0,1fr)_180px]">
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Cấp bậc
                  </span>
                  <span className={`text-sm font-bold ${tier.text}`}>
                    {TIER_RULES[memberTier].label}
                  </span>
                </div>

                <div>
                  <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-black/60">
                    <div
                      className={`h-full rounded-full ${tier.bar}`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    {nextRule && progress.next ? (
                      <>
                        Tích lũy thêm để nhận những đặc quyền{" "}
                        <Link
                          href="/cap-bac"
                          className="font-bold text-white underline-offset-2 transition-colors hover:underline"
                        >
                          ưu đãi
                        </Link>{" "}
                        dành riêng cho khách hàng
                      </>
                    ) : (
                      "Bạn đang ở hạng cao nhất"
                    )}
                  </p>
                </div>

                {/* What the rank is worth today, what the points are, and
                    whether the account is verified (the owner, 16/10/2026:
                    "Hạng hiện tại Elite đổi thành xác minh cấp 2"); the next
                    rank's worth lives in the sentence under the bar. */}
                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-1.5 sm:gap-3">
                  {[
                    {
                      label: "Ưu đãi mua tool",
                      value: `Giảm ${formatTierPercent(TIER_RULES[memberTier].discountPercent)}%`,
                      tone: tier.text,
                    },
                    {
                      label: "Điểm thưởng",
                      value: `${user.points.toLocaleString("vi-VN")} điểm`,
                      tone: "text-white",
                    },
                    {
                      label: "Xác minh cấp 2",
                      value: user.verifiedAt ? "Đã xác minh" : "Chưa xác minh",
                      tone: user.verifiedAt ? "text-emerald-400" : "text-neutral-300",
                    },
                  ].map(({ label, value, tone }, index) => (
                    <div key={label} className="flex min-w-0 flex-col gap-0.5">
                      {/* 10px like every other label on the card, and allowed
                          to wrap: at 9px with truncate a phone read "ƯU ĐÃI
                          MU…". mt-auto keeps the three values level when only
                          some labels take two lines. */}
                      <span className="text-[10px] font-black uppercase leading-tight tracking-widest text-neutral-500">
                        {label}
                      </span>
                      <span
                        className={`mt-auto flex min-w-0 items-center gap-1 text-[13px] font-bold leading-none ${tone}`}
                      >
                        {index === 0 ? (
                          <Check size={13} strokeWidth={3} className={`shrink-0 ${tier.text}`} />
                        ) : null}
                        <span className="truncate">{value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone: Nạp tiền across, the other two side by side under
                  it (three stacked bars pushed the balance off the first
                  screen). sm–lg: one row of three. xl: the column (a one-column grid; the class
                  must not touch the ${ that follows, or Tailwind never sees it). With only
                  two doors (the wheel's off), the two share one row below xl. */}
              <div
                className={`grid grid-cols-2 gap-2.5 xl:grid-cols-1 xl:content-start ${
                  DOORS.length > 2 ? " sm:grid-cols-3" : ""
                }`}
              >
                {DOORS.map(({ label, href, icon: Icon, primary }) => (
                  <Link
                    key={href}
                    href={href}
                    // Flat, as every other red button in the account area is
                    // (the agency desk's own Nạp tiền, /security's submit):
                    // the accent glow under it was the only one of its kind.
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-colors ${
                      primary
                        ? `${DOORS.length > 2 ? "col-span-2 sm:col-span-1 " : ""}border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]`
                        : "border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]"
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
