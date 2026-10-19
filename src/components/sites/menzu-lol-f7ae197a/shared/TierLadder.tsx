import Link from "next/link";

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
import { TierBadge } from "./TierBadge";

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
 * What the tier takes off, said in one line the way the old cards said it,
 * where a big figure over a repeated caption read like a pricing template
 * ("rà soát lại những chỗ nào AI thì bỏ", 19/10/2026).
 */
function Discount({ percent, className }: { percent: number; className: string }) {
  return percent > 0 ? (
    <p className={`text-[15px] font-semibold text-frost ${className}`}>
      Giảm {formatTierPercent(percent)}%
    </p>
  ) : (
    <p className={`text-[14px] text-mist ${className}`}>Chưa có ưu đãi</p>
  );
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
              <TierBadge tier={mine} size="lg" />
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
        <p className="text-[13px] text-mist">
          <Link
            href="/login?next=%2Fcap-bac"
            className="font-semibold text-[var(--menzu-accent)] hover:underline"
          >
            Đăng nhập
          </Link>{" "}
          để xem hạng và tiến độ của bạn.
        </p>
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
                  className="left-[calc(50%+27px)] top-[22px] h-0.5 w-[calc(100%-54px)] -translate-y-1/2"
                />
              ) : null}
              <TierBadge tier={tier} size="md" className={mine && k > mineRank ? "opacity-40" : ""} />
              <p className="mt-3 text-[15px] font-bold text-frost">{rule.label}</p>
              <p className="mt-1 text-[12px] text-mist">{threshold(rule.minTopUp)}</p>
              <Discount percent={rule.discountPercent} className="mt-3" />
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
                  className="left-[21px] top-[calc(50%+26px)] h-[calc(100%-52px)] w-0.5"
                />
              ) : null}
              <TierBadge tier={tier} size="md" className={mine && k > mineRank ? "opacity-40" : ""} />
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
              <Discount percent={rule.discountPercent} className="shrink-0 text-right" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
