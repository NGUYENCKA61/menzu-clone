import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, ShieldCheck } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { TierBadge } from "@/components/sites/menzu-lol-f7ae197a/shared/TierBadge";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { db } from "@/lib/db";
import {
  formatTierPercent,
  MEMBER_TIERS,
  readMemberTier,
  TIER_RULES,
  TIER_STYLE,
  tierProgress,
  tierRank,
} from "@/lib/memberTiers";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cấp bậc thành viên",
  description:
    "Năm hạng thành viên của shop, mốc nạp tiền để lên hạng và ưu đãi giảm giá khi mua tool ở mỗi hạng.",
  alternates: { canonical: "/cap-bac" },
};
export const dynamic = "force-dynamic";

const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * The tier ladder, public: what each rank costs to reach and what it pays
 * back. Signed in, the reader's own rank is marked and their climb to the
 * next one is drawn; signed out it is the plain table.
 */
export default async function MemberTiersPage() {
  const user = await getCurrentUser();
  const toppedUpRow = user
    ? await db.topUp.aggregate({
        _sum: { amount: true },
        where: { userId: user.id, status: "COMPLETED" },
      })
    : null;
  const toppedUp = Number(toppedUpRow?._sum.amount ?? 0n);
  const mine = user ? readMemberTier(user.tier) : null;
  const progress = mine ? tierProgress(toppedUp, mine) : null;

  return (
    <SimplePage title="Cấp bậc thành viên" crumb="Cấp bậc">
      <p className="max-w-[720px] text-sm leading-relaxed text-neutral-400">
        Hạng được tính theo <span className="font-bold text-white">tổng tiền đã nạp</span>{" "}
        vào ví, lên hạng ngay khi lệnh nạp chạm mốc được duyệt và{" "}
        <span className="font-bold text-white">không bao giờ tụt hạng</span>. Ưu đãi hạng
        giảm thẳng vào giá khi mua tool, cộng được với mã giảm giá.
      </p>

      {mine && progress ? (
        <section className="mt-6 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <TierBadge tier={mine} size="lg" />
              <div>
                <p className={LABEL}>Hạng của bạn</p>
                <p
                  className={`mt-0.5 text-2xl font-black uppercase leading-none tracking-wider ${TIER_STYLE[mine].text}`}
                >
                  {TIER_RULES[mine].label}
                </p>
              </div>
            </div>
            <div className="text-[13px] text-neutral-400 sm:text-right">
              Tổng đã nạp{" "}
              <span className="font-bold text-white tabular-nums">{formatVnd(toppedUp)}đ</span>
              {progress.next ? (
                <>
                  {" · "}còn{" "}
                  <span className="font-bold text-white tabular-nums">
                    {formatVnd(progress.remaining)}đ
                  </span>{" "}
                  để lên{" "}
                  <span className={`font-bold ${TIER_STYLE[progress.next].text}`}>
                    {TIER_RULES[progress.next].label}
                  </span>
                </>
              ) : (
                " · hạng cao nhất"
              )}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full border border-white/5 bg-black/60">
            <div
              className={`h-full rounded-full ${TIER_STYLE[mine].bar}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </section>
      ) : (
        <p className="mt-4 text-[13px] text-neutral-500">
          <Link
            href="/login?next=%2Fcap-bac"
            className="font-bold text-[var(--menzu-accent)] hover:underline"
          >
            Đăng nhập
          </Link>{" "}
          để xem hạng và tiến độ của bạn.
        </p>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {MEMBER_TIERS.map((tier) => {
          const rule = TIER_RULES[tier];
          const style = TIER_STYLE[tier];
          const current = mine === tier;
          const reached = mine !== null && tierRank(tier) <= tierRank(mine);
          return (
            <li
              key={tier}
              className={`flex flex-col gap-3 rounded-2xl border p-5 ${
                current
                  ? "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/[0.05]"
                  : "border-white/10 bg-neutral-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <TierBadge tier={tier} size="md" />
                {current ? (
                  <span className="rounded-md border border-[var(--menzu-accent)]/30 bg-[var(--menzu-accent)]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--menzu-accent)]">
                    Bạn đang ở đây
                  </span>
                ) : reached ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <ShieldCheck size={12} />
                    Đã đạt
                  </span>
                ) : null}
              </div>
              <div>
                <p
                  className={`text-xl font-black uppercase leading-none tracking-wider ${style.text}`}
                >
                  {rule.label}
                </p>
                <p className="mt-2 text-[12px] text-neutral-400">
                  {rule.minTopUp === 0 ? (
                    "Hạng khởi đầu của mọi tài khoản."
                  ) : (
                    <>
                      Nạp từ{" "}
                      <span className="font-bold text-white tabular-nums">
                        {formatVnd(rule.minTopUp)}đ
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className={LABEL}>Ưu đãi</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-white">
                  <BadgePercent size={15} className={style.text} />
                  {rule.discountPercent > 0
                    ? `Giảm ${formatTierPercent(rule.discountPercent)}% khi mua tool`
                    : "Chưa có ưu đãi"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-[12px] leading-relaxed text-neutral-500">
        Ưu đãi hạng áp dụng cho phần mềm; tài khoản game giữ giá niêm yết. Tài khoản đại lý đã
        hưởng giá sỉ không cộng thêm ưu đãi hạng.
      </p>
    </SimplePage>
  );
}
