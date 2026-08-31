import type { Metadata } from "next";
import Link from "next/link";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HandCoins, Handshake, Link2, UserPlus, Users } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { ReferralLinkBox } from "@/components/sites/menzu-lol-f7ae197a/shared/ReferralLinkBox";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import { REFERRAL_PERCENT } from "@/lib/referral";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cộng tác viên",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/**
 * The referral desk, rebuilt from the contact-the-admin brochure it used to
 * be: share /register?ref=<uid>, and every credited top-up from an account
 * that registered through it pays the referrer REFERRAL_PERCENT — written by
 * the same transaction that credits the top-up (see topupStore.creditTopUp).
 * Commission piles up on the overview card, where "Rút tiền" moves it into
 * the spendable balance.
 */

const STEPS = [
  { icon: Link2, text: "Gửi liên kết giới thiệu cho bạn bè" },
  { icon: UserPlus, text: "Họ đăng ký tài khoản qua liên kết đó" },
  {
    icon: HandCoins,
    text: `Mỗi lệnh nạp thành công của họ, bạn nhận ngay ${REFERRAL_PERCENT}% vào hoa hồng`,
  },
] as const;

function formatDay(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const EARNING_COLUMNS = ["Thành viên", "Số tiền nạp", "Hoa hồng", "Thời gian"];

/**
 * "bant***01" — enough of the name for its inviter to recognise, not enough
 * for anyone else to point at. Short names keep only their first letters, so
 * the stars never end up revealing more than they hide.
 */
function maskName(username: string): string {
  if (username.length < 7) return `${username.slice(0, 2)}***`;
  return `${username.slice(0, 4)}***${username.slice(-2)}`;
}

export default async function AffiliatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faffiliate");

  const [head, referredCount, earnedAgg, recent] = await Promise.all([
    headers(),
    db.user.count({ where: { referredById: user.id } }),
    db.referralEarning.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    db.referralEarning.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        // Masked before display: the referrer recognises who they invited,
        // but a screenshot of this table names nobody's spending.
        fromUser: { select: { username: true } },
        topUp: { select: { amount: true } },
      },
    }),
  ]);

  // The link is built server-side from this request's own host, so what the
  // box shows is exactly what the visitor's address bar said.
  const host = head.get("host") ?? "localhost:3100";
  const proto = head.get("x-forwarded-proto") ?? "http";
  const link = `${proto}://${host}/register?ref=${user.uid}`;

  const totalEarned = Number(earnedAgg._sum.amount ?? 0n);

  const stats = [
    {
      icon: Users,
      label: "Người đã giới thiệu",
      value: String(referredCount),
      unit: "người",
      // White figure on a neutral tile: the count is a fact, not a warning,
      // and red type on a red tint was the hardest thing on the page to read.
      tone: "text-white",
      box: "border-white/10 bg-white/[0.06] text-[var(--menzu-accent)]",
      shell: "border-white/10 bg-neutral-900/50",
    },
    {
      icon: HandCoins,
      label: "Hoa hồng khả dụng",
      value: formatVnd(user.commissionBalance),
      unit: "đ",
      // Amber — money waiting to be moved, the ledger's "pending" colour —
      // so the three cards read as count / waiting / done rather than as
      // two shades of red beside a green.
      tone: "text-amber-400",
      box: "border-amber-500/25 bg-amber-500/10 text-amber-400",
      shell: "border-amber-500/15 bg-amber-500/[0.04]",
    },
    {
      icon: Handshake,
      label: "Tổng hoa hồng đã nhận",
      value: formatVnd(totalEarned),
      unit: "đ",
      tone: "text-emerald-400",
      box: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
      shell: "border-emerald-500/15 bg-emerald-500/[0.04]",
    },
  ] as const;

  return (
    <AccountPageFrame
      title="Cộng tác viên"
      subtitle={`Chia sẻ liên kết giới thiệu, nhận ${REFERRAL_PERCENT}% mỗi giao dịch nạp tiền`}
      crumb="Cộng tác viên"
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Liên kết giới thiệu của bạn
            </h3>
            <span className="text-xs text-neutral-500">
              Ai đăng ký qua link này là người bạn giới thiệu
            </span>
          </div>
          <ReferralLinkBox link={link} />
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, value, unit, tone, box, shell }) => (
            <div
              key={label}
              className={`flex items-center gap-4 rounded-2xl border p-5 ${shell}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${box}`}
              >
                <Icon size={18} />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  {label}
                </span>
                <span className={`text-2xl font-black leading-none ${tone}`}>
                  {value}{" "}
                  <span className="text-sm font-bold opacity-80">{unit}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Cách hoạt động
            </h3>
            <span className="text-xs text-neutral-500">
              Hoa hồng rút về ví ở trang Tổng quan
            </span>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, text }, index) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                  <Icon size={16} className="text-[var(--menzu-accent)]" />
                </span>
                <span className="text-sm font-semibold leading-snug text-neutral-200">
                  <span className="mr-1.5 font-black text-white">{index + 1}.</span>
                  {text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Hoa hồng gần đây
            </h3>
            <span className="text-xs text-neutral-500">
              {REFERRAL_PERCENT}% mỗi lệnh nạp được cộng của người bạn giới thiệu
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
              Chưa có hoa hồng nào — gửi liên kết cho bạn bè để bắt đầu.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    {EARNING_COLUMNS.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((earning) => (
                    <tr
                      key={earning.id}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4">
                        {/* The shop accent: the name is the row's subject, and it
                            reads as one. */}
                        <span className="inline-flex rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-bold leading-none text-neutral-200">
                          {maskName(earning.fromUser.username)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold tabular-nums text-neutral-200">
                          {formatVnd(Number(earning.topUp.amount))}đ
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-black leading-none tabular-nums text-emerald-400">
                          +{formatVnd(Number(earning.amount))}đ
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] tabular-nums text-neutral-500">
                          {formatDay(earning.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-neutral-500">
          Có đầu ra ổn định và muốn nhập theo lô?{" "}
          <Link
            href="/agency"
            className="font-black uppercase tracking-wider text-[var(--menzu-accent)] transition-colors hover:text-white"
          >
            Nâng cấp đại lý
          </Link>{" "}
          để làm việc thẳng với admin.
        </p>
      </div>
    </AccountPageFrame>
  );
}
