import Link from "next/link";
import { BadgePercent, ShieldCheck, Wallet, Zap } from "lucide-react";

import {
  formatTierPercent,
  MEMBER_TIERS,
  TIER_RULES,
  TIER_STYLE,
  tierProgress,
  tierRank,
  type MemberTierValue,
} from "@/lib/memberTiers";

import { formatVnd } from "./productData";
import { TierEmblem } from "./TierEmblem";

/**
 * /cap-bac since 19/10/2026 ("rà soát làm lại sao cho chuyên nghiệp thay
 * icon mới cho nhìn đỡ kì"). The rules the page opened with as one
 * paragraph, now four lines a reader can scan, in the same words.
 */
const FACTS = [
  {
    icon: Wallet,
    text: (
      <>
        Hạng được tính theo <span className="font-semibold text-frost">tổng tiền đã nạp</span>{" "}
        vào ví.
      </>
    ),
  },
  { icon: Zap, text: <>Lên hạng ngay khi lệnh nạp chạm mốc được duyệt.</> },
  {
    icon: ShieldCheck,
    text: <span className="font-semibold text-frost">Không bao giờ tụt hạng.</span>,
  },
  {
    icon: BadgePercent,
    text: <>Ưu đãi hạng giảm thẳng vào giá khi mua tool, cộng được với mã giảm giá.</>,
  },
];

export function TierFacts() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {FACTS.map(({ icon: Icon, text }, index) => (
        <li key={index} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mist">
          <Icon size={16} className="mt-[3px] shrink-0 text-frost" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/** The join between two rungs, drawn as far as the reader has climbed. */
function Join({
  filled,
  bar,
  vertical = false,
  className,
}: {
  filled: number;
  bar: string;
  vertical?: boolean;
  className: string;
}) {
  return (
    <span aria-hidden className={`absolute overflow-hidden rounded-full bg-white/10 ${className}`}>
      {filled > 0 ? (
        <span
          className={`block rounded-full ${vertical ? "w-full" : "h-full"} ${bar}`}
          style={vertical ? { height: `${filled * 100}%` } : { width: `${filled * 100}%` }}
        />
      ) : null}
    </span>
  );
}

function threshold(minTopUp: number): string {
  return minTopUp === 0 ? "Hạng khởi đầu" : `Nạp từ ${formatVnd(minTopUp)}đ`;
}

/**
 * The five tiers as one ladder instead of five tall cards with a box inside
 * each: across from lg, the rungs joined by a line that fills as far as the
 * reader has climbed; below lg a list with the same joins down its left,
 * where the stacked cards made a phone scroll through five screens of them.
 * The reader's tier, what they have topped up and what is left to the next
 * head the card; a guest gets the plain ladder and the way to sign in.
 */
export function TierLadder({
  mine,
  toppedUp,
}: {
  mine: MemberTierValue | null;
  toppedUp: number;
}) {
  const progress = mine ? tierProgress(toppedUp, mine) : null;
  const mineRank = mine ? tierRank(mine) : -1;
  const bar = mine ? TIER_STYLE[mine].bar : "";
  const last = MEMBER_TIERS.length - 1;
  // How much of the join from rung k to rung k + 1 is drawn.
  const filled = (k: number) =>
    !progress ? 0 : k < mineRank ? 1 : k === mineRank ? progress.percent / 100 : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      {mine && progress ? (
        <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <TierEmblem tier={mine} size="lg" />
              <div>
                <p className="text-[12px] font-medium text-dim">Hạng của bạn</p>
                <p className="mt-1.5 font-display text-[24px] font-black leading-none text-frost">
                  {TIER_RULES[mine].label}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[12px] font-medium text-dim">Tổng đã nạp</p>
              <p className="lab-figure mt-1.5 text-[20px] font-bold leading-none text-frost">
                {formatVnd(toppedUp)}đ
              </p>
              <p className="mt-2 text-[13px] text-mist">
                {progress.next ? (
                  <>
                    Còn{" "}
                    <span className="font-semibold text-frost">
                      {formatVnd(progress.remaining)}đ
                    </span>{" "}
                    để lên{" "}
                    <span className={`font-semibold ${TIER_STYLE[progress.next].text}`}>
                      {TIER_RULES[progress.next].label}
                    </span>
                  </>
                ) : (
                  "Bạn đang ở hạng cao nhất"
                )}
              </p>
            </div>
          </div>
          {/* Below lg the list's short joins carry no amounts, so the climb
              to the next tier keeps a bar of its own. */}
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10 lg:hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${progress.percent}%` }} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] font-bold text-frost">Năm hạng thành viên</p>
          <p className="text-[13px] text-mist">
            <Link
              href="/login?next=%2Fcap-bac"
              className="font-semibold text-[var(--menzu-accent)] hover:underline"
            >
              Đăng nhập
            </Link>{" "}
            để xem hạng và tiến độ của bạn.
          </p>
        </div>
      )}

      <ol className="mt-8 hidden grid-cols-5 border-t border-white/[0.06] pt-8 lg:grid">
        {MEMBER_TIERS.map((tier, k) => {
          const rule = TIER_RULES[tier];
          return (
            <li key={tier} className="relative flex flex-col items-center px-3 text-center">
              {k < last ? (
                <Join
                  filled={filled(k)}
                  bar={bar}
                  className="left-[calc(50%+23px)] top-[22px] h-0.5 w-[calc(100%-46px)] -translate-y-1/2"
                />
              ) : null}
              {/* Full colour whether reached or not: faded to 40% the marks
                  read as blurred ("làm cho icon nét lại"); the line and the
                  "Hạng hiện tại" chip say how far the reader is. */}
              <TierEmblem tier={tier} />
              <p className="mt-3 text-[15px] font-bold text-frost">{rule.label}</p>
              <p className="mt-1 text-[12px] text-mist">{threshold(rule.minTopUp)}</p>
              <p
                className={`lab-figure mt-4 text-[24px] font-bold leading-none ${
                  rule.discountPercent > 0 ? "text-frost" : "text-dim"
                }`}
              >
                {formatTierPercent(rule.discountPercent)}%
              </p>
              <p className="mt-1.5 text-[12px] text-dim">
                {rule.discountPercent > 0 ? "giảm khi mua tool" : "chưa có ưu đãi"}
              </p>
              {mine === tier ? (
                <span
                  className={`mt-4 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${TIER_STYLE[tier].tile}`}
                >
                  Hạng hiện tại
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <ol className="mt-5 border-t border-white/[0.06] pt-3 lg:hidden">
        {MEMBER_TIERS.map((tier, k) => {
          const rule = TIER_RULES[tier];
          return (
            <li key={tier} className="relative flex items-center gap-3.5 py-3">
              {k < last ? (
                <Join
                  filled={filled(k)}
                  bar={bar}
                  vertical
                  className="left-[21px] top-[calc(50%+22px)] h-[calc(100%-44px)] w-0.5"
                />
              ) : null}
              <TierEmblem tier={tier} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold text-frost">
                  {rule.label}
                  {mine === tier ? (
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[12px] font-semibold ${TIER_STYLE[tier].tile}`}
                    >
                      Hạng hiện tại
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12px] text-mist">{threshold(rule.minTopUp)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`lab-figure text-[18px] font-bold leading-none ${
                    rule.discountPercent > 0 ? "text-frost" : "text-dim"
                  }`}
                >
                  {formatTierPercent(rule.discountPercent)}%
                </p>
                <p className="mt-1 text-[11px] text-dim">
                  {rule.discountPercent > 0 ? "giảm giá tool" : "chưa có ưu đãi"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
