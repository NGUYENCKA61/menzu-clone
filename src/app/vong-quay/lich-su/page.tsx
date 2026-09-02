import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Gift,
  Star,
  Ticket,
  Truck,
} from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { SpinExchangeButton } from "@/components/sites/menzu-lol-f7ae197a/shared/SpinExchangeButton";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { dayHeading, dayTime } from "@/lib/dayGroups";
import { db } from "@/lib/db";
import { GAP, PER_PAGE, pageCount, pageRange, pageStrip, parsePage } from "@/lib/paging";
import { getCurrentUser } from "@/lib/session";
import { listSpinPrizes } from "@/lib/spinPrizes";

export const metadata: Metadata = {
  title: "Lịch sử nhận thưởng",
  // One reader's own wins. Followed, not indexed, like the rest of the account.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

/**
 * How each kind of win is dressed, all in one place.
 *
 * `rail` is the left edge of its row and `tile` the icon behind it, so a
 * reader scanning the page sorts four kinds of win by colour before reading a
 * word of it — money green, points violet, codes blue, parcels amber.
 */
const KIND = {
  BALANCE: {
    icon: Coins,
    rail: "border-l-emerald-500/70",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    value: "text-emerald-400",
  },
  POINTS: {
    icon: Star,
    rail: "border-l-[#a78bfa]/70",
    tile: "border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa]",
    value: "text-[#a78bfa]",
  },
  VOUCHER: {
    icon: Ticket,
    rail: "border-l-sky-500/70",
    tile: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    value: "text-sky-400",
  },
  ITEM: {
    icon: Gift,
    rail: "border-l-amber-500/70",
    tile: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    value: "text-amber-400",
  },
} as const;

type WonKind = keyof typeof KIND;

const PILL =
  "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider";

/** One figure in the strip across the top. */
function Total({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: typeof Coins;
  tint: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tint}`}>
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <p className="mt-1.5 text-xl font-black leading-none">{value}</p>
    </div>
  );
}

/**
 * Every prize this reader has won, newest first.
 *
 * Losing spins are left out. "Lịch sử nhận thưởng" is a record of what was
 * received, and a list where nine rows in ten say "chúc may mắn lần sau" is a
 * list nobody scrolls to the bottom of — the wheel's card already said so at
 * the time.
 *
 * Grouped by day with the shared helper, so this reads the way the order
 * history and the status board do.
 */
export default async function SpinHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fvong-quay%2Flich-su");

  const where = { userId: user.id, kind: { not: "NOTHING" } };

  // The totals are counted across every win, not across the page being read:
  // a running total that changed when you turned the page would be a running
  // total of nothing.
  const [total, byKind] = await Promise.all([
    db.spinWin.count({ where }),
    db.spinWin.groupBy({
      by: ["kind"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const pages = pageCount(total, PER_PAGE);
  const { trang } = await searchParams;
  const page = parsePage(trang, pages);

  const [wins, prizes] = await Promise.all([
    db.spinWin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        label: true,
        prizeId: true,
        kind: true,
        amount: true,
        status: true,
        createdAt: true,
        voucherCode: true,
        tracking: true,
        pointsBack: true,
        address: true,
      },
    }),
    listSpinPrizes(),
  ]);

  // A won code's own row, so the page can say whether it is still good. One
  // query rather than one per row: a hundred wins would otherwise be a hundred
  // round trips for a line of text.
  const codes = wins.map((w) => w.voucherCode).filter((c): c is string => c !== null);
  const vouchers = codes.length
    ? await db.voucher.findMany({
        where: { code: { in: codes } },
        select: { code: true, usedCount: true, maxUses: true, expiresAt: true },
      })
    : [];
  const voucherBy = new Map(vouchers.map((v) => [v.code, v]));

  const now = new Date();
  const sum = (kind: string) =>
    byKind.find((row) => row.kind === kind)?._sum.amount ?? 0;
  const count = (kind: string) =>
    byKind.find((row) => row.kind === kind)?._count._all ?? 0;
  const shown = pageRange(page, PER_PAGE, total);

  return (
    <SimplePage title="Lịch sử nhận thưởng" crumb="Lịch sử nhận thưởng">
      <div className="flex max-w-3xl flex-col gap-6">
        <Link
          href="/vong-quay"
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vòng quay
        </Link>

        {/* WHAT THE WHEEL HAS GIVEN, ADDED UP */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total
            label="Tiền"
            value={`${formatVnd(sum("BALANCE"))}đ`}
            icon={Coins}
            tint="border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400"
          />
          <Total
            label="Điểm"
            value={formatVnd(sum("POINTS"))}
            icon={Star}
            tint="border-[#a78bfa]/25 bg-[#a78bfa]/[0.07] text-[#a78bfa]"
          />
          <Total
            label="Mã giảm giá"
            value={String(count("VOUCHER"))}
            icon={Ticket}
            tint="border-sky-500/25 bg-sky-500/[0.07] text-sky-400"
          />
          <Total
            label="Quà tặng"
            value={String(count("ITEM"))}
            icon={Gift}
            tint="border-amber-500/25 bg-amber-500/[0.07] text-amber-400"
          />
        </section>

        {wins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <p className="text-sm font-bold text-white">Chưa trúng phần thưởng nào</p>
            <p className="mt-1.5 text-[13px] text-neutral-400">
              Quay một lượt để bắt đầu — mỗi lần trúng sẽ được ghi lại ở đây.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {wins.map((win, index) => {
              const kind = KIND[win.kind as WonKind] ?? KIND.ITEM;
              const Icon = kind.icon;
              const day = dayHeading(win.createdAt, now);
              const newDay =
                index === 0 || dayHeading(wins[index - 1]!.createdAt, now) !== day;

              const voucher = win.voucherCode
                ? voucherBy.get(win.voucherCode)
                : undefined;
              // Three things can be true of a won code, and each wants its own
              // sentence — "còn dùng được" and "đã dùng" are not the same news.
              const code = voucher
                ? voucher.expiresAt && voucher.expiresAt < now
                  ? { text: "Đã hết hạn", tint: "border-white/10 bg-white/5 text-neutral-500" }
                  : voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses
                    ? { text: "Đã dùng", tint: "border-white/10 bg-white/5 text-neutral-500" }
                    : {
                        text: "Còn dùng được",
                        tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                      }
                : null;

              const parcel =
                win.kind !== "ITEM"
                  ? null
                  : win.status === "EXCHANGED"
                    ? {
                        text: `Đã đổi ${(win.pointsBack ?? 0).toLocaleString("vi-VN")} điểm`,
                        tint: "border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa]",
                      }
                    : win.status === "SENT"
                      ? {
                          text: "Shop đã gửi",
                          tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                        }
                      : win.address
                        ? {
                            text: "Chờ shop gửi",
                            tint: "border-sky-500/30 bg-sky-500/10 text-sky-400",
                          }
                        : {
                            text: "Chưa điền địa chỉ",
                            tint: "border-amber-500/30 bg-amber-500/10 text-amber-400",
                          };

              // Only a parcel nobody has answered about can still be traded
              // back, and only for what the shop has put on it.
              const offer =
                win.kind === "ITEM" && win.status === "PENDING" && !win.address
                  ? (prizes.find((p) => p.id === win.prizeId)?.exchangePoints ?? null)
                  : null;

              return (
                <div key={win.id} className="contents">
                  {newDay ? (
                    <div className="mt-3 flex items-center gap-3 first:mt-0">
                      <span className={`${LABEL} shrink-0`}>{day}</span>
                      <span aria-hidden className="h-px flex-1 bg-white/[0.07]" />
                    </div>
                  ) : null}

                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-l-2 border-white/[0.06] bg-white/[0.02] p-3.5 pl-3 transition-colors hover:border-y-white/[0.12] hover:border-r-white/[0.12] ${kind.rail}`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${kind.tile}`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[13.5px] font-bold text-white">
                          {win.label}
                        </span>
                        {code ? (
                          <span className={`${PILL} ${code.tint}`}>{code.text}</span>
                        ) : null}
                        {parcel ? (
                          <span className={`${PILL} ${parcel.tint}`}>{parcel.text}</span>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-neutral-500">
                        <span className="tabular-nums">{dayTime(win.createdAt)}</span>
                        {win.voucherCode ? (
                          <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono tracking-[0.15em] text-neutral-200">
                            {win.voucherCode}
                          </span>
                        ) : null}
                        {win.tracking ? (
                          <span className="inline-flex items-center gap-1.5 text-neutral-400">
                            <Truck className="h-3.5 w-3.5" />
                            <span className="font-mono tracking-wider">
                              {win.tracking}
                            </span>
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {/* Money and points are done — the figure is the whole
                        story. A parcel is not, so it gets its way onward
                        instead: somewhere to fill the address in, or the trade
                        for points if the winner has no use for it. */}
                    {win.kind === "ITEM" ? (
                      <span className="flex shrink-0 flex-wrap items-center gap-2">
                        {offer && offer > 0 ? (
                          <SpinExchangeButton
                            winId={win.id}
                            label={win.label}
                            points={offer}
                          />
                        ) : null}
                        <Link
                          href={`/vong-quay/qua/${win.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-[var(--menzu-violet)]/50 hover:text-white"
                        >
                          {win.address ? "Chi tiết" : "Điền địa chỉ"}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 text-[15px] font-black tabular-nums ${kind.value}`}
                      >
                        {win.kind === "BALANCE"
                          ? `+${formatVnd(win.amount)}đ`
                          : win.kind === "POINTS"
                            ? `+${formatVnd(win.amount)}`
                            : `-${win.amount}%`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 ? (
          <nav
            aria-label="Phân trang"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-[11px] font-semibold text-neutral-500">
              Hiển thị {shown.from}–{shown.to} / {total} phần thưởng
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {pageStrip(page, pages).map((n, i) =>
                n === GAP ? (
                  <span
                    key={`gap-${i}`}
                    aria-hidden
                    className="px-1 text-[12px] text-neutral-700"
                  >
                    {GAP}
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={n === 1 ? "/vong-quay/lich-su" : `/vong-quay/lich-su?trang=${n}`}
                    aria-label={`Trang ${n}`}
                    aria-current={n === page ? "page" : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors ${
                      n === page
                        ? "border-[var(--menzu-violet)]/60 bg-[var(--menzu-violet)]/15 text-[#a78bfa]"
                        : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {n}
                  </Link>
                ),
              )}
            </span>
          </nav>
        ) : null}
      </div>
    </SimplePage>
  );
}
