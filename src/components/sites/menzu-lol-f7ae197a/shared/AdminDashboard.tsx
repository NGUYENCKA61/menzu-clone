import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  Landmark,
  ShoppingBag,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";

import { formatVnd } from "./productData";

import { linePoints, TX_STATE_LABELS, type TxState } from "@/lib/dashboard";

export interface StatItem {
  label: string;
  value: string;
  sub: string;
  /** Tints the sub-line when it is a comparison rather than a description. */
  tone?: "up" | "down";
  /** The little badge in the card's corner; page picks it per figure. */
  icon: LucideIcon;
  /** Chip classes for the badge — border, background and text share a hue. */
  tint: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  username: string;
  avatarUrl: string | null;
  what: string;
  /** Null for something that happened without money moving. */
  amount: string | null;
  credit: boolean;
  state: TxState;
  ago: string;
}

export interface TransactionRow {
  code: string;
  username: string;
  avatarUrl: string | null;
  kind: string;
  amount: string;
  credit: boolean;
  time: string;
  state: TxState;
}

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11]";
const CAP = "text-[10px] font-black uppercase tracking-widest text-neutral-500";

const STATE_TINT: Record<TxState, string> = {
  SUCCESS: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  FAILED: "border-rose-500/25 bg-rose-500/10 text-rose-400",
};

const STATE_TEXT: Record<TxState, string> = {
  SUCCESS: "text-emerald-400",
  PENDING: "text-amber-400",
  FAILED: "text-rose-400",
};

/** The icon a ledger row wears, keyed on the label the page already builds. */
const KIND_ICON: Record<string, LucideIcon> = {
  "Nạp thẻ": CreditCard,
  "Nạp bank": Landmark,
  "Đơn hàng": ShoppingBag,
  "Đăng ký tài khoản": UserRoundPlus,
};

/** 32px face with the site's initial fallback — the same face language as the
 *  users table, so the two screens read as one product. */
function Avatar({
  username,
  avatarUrl,
  size = 32,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden className="text-[11px] font-black uppercase text-neutral-500">
          {username.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

/**
 * The admin overview.
 *
 * A server component: nothing here reacts to a click, and rendering the
 * figures on the server means the timestamps are formatted once, in the shop's
 * timezone, instead of being sent as instants for a browser to disagree about.
 */
export function AdminDashboard({
  todayStats,
  totals,
  chart,
  activity,
  transactions,
}: {
  todayStats: StatItem[];
  totals: StatItem[];
  chart: ChartPoint[];
  activity: ActivityItem[];
  transactions: TransactionRow[];
}) {
  return (
    <div className="flex flex-col gap-7">
      <Section title="Hôm nay" note="00:00–23:59 giờ Việt Nam">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {todayStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </Section>

      <Section title="Thống kê">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {totals.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <RevenueChart points={chart} />
        <ActivityFeed items={activity} />
      </div>

      <TransactionTable rows={transactions} />
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-black uppercase tracking-widest text-white whitespace-nowrap">
          {title}
        </h2>
        <div className="flex-1 h-px bg-white/[0.08]" />
        {note ? <span className="text-[11px] text-neutral-600">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, sub, tone, icon: Icon, tint }: StatItem) {
  // A quiet day should look quiet: zeros step back so real figures stand out.
  const idle = value === "0" || value === "0đ";

  return (
    <div className={`${CARD} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-3">
        <span className={CAP}>{label}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}
        >
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          idle ? "text-neutral-600" : "text-white"
        }`}
      >
        {value}
      </span>
      <span
        className={`text-[11px] ${
          tone === "up"
            ? "text-emerald-400"
            : tone === "down"
              ? "text-rose-400"
              : "text-neutral-500"
        }`}
      >
        {sub}
      </span>
    </div>
  );
}

/** How many faint horizontal rules sit behind the line. */
const GRID_LINES = 4;
const CHART_W = 640;
const CHART_H = 220;

function RevenueChart({ points }: { points: ChartPoint[] }) {
  const values = points.map((p) => p.value);
  const peak = Math.max(0, ...values);
  const line = linePoints(values, CHART_W, CHART_H);
  const coords = line
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number]);
  const last = coords.at(-1) ?? null;

  return (
    <div className={`${CARD} p-5 flex flex-col`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={CAP}>Doanh thu 7 ngày</h3>
        {peak > 0 ? (
          <span className="text-[11px] font-bold text-neutral-500 tabular-nums">
            Cao nhất <span className="text-rose-400">{formatVnd(peak)}đ</span>
          </span>
        ) : null}
      </div>

      {peak === 0 ? (
        // A flat line at zero reads as a broken chart rather than a quiet week.
        <p className="flex-1 flex items-center justify-center py-14 text-sm text-neutral-500">
          Chưa có đơn nào được thanh toán trong 7 ngày qua.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Doanh thu 7 ngày, cao nhất ${formatVnd(peak)}đ`}
            className="mt-4 w-full h-[220px]"
          >
            <defs>
              {/* The wash under the line — what turns a wire into a chart. */}
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
              const y = (CHART_H / GRID_LINES) * i;
              return (
                <line
                  key={i}
                  x1="0"
                  x2={CHART_W}
                  y1={y}
                  y2={y}
                  stroke="rgb(255 255 255 / 0.05)"
                  strokeWidth="1"
                />
              );
            })}

            <polygon
              points={`0,${CHART_H} ${line} ${CHART_W},${CHART_H}`}
              fill="url(#rev-fill)"
            />

            <polyline
              points={line}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              // The viewBox is stretched to the card's width, which would
              // stretch the stroke with it and leave a line thicker on one
              // axis than the other.
              vectorEffect="non-scaling-stroke"
            />

            {/* One dot per day, so a reader can count the week off the line. */}
            {coords.map(([x, y], index) => (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={3}
                fill="#0e0e11"
                stroke="#f43f5e"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {last ? <circle cx={last[0]} cy={last[1]} r="4.5" fill="#f43f5e" /> : null}
          </svg>

          <div className="mt-2 flex justify-between">
            {points.map((point, index) => (
              <span key={`${point.label}-${index}`} className="text-[10px] text-neutral-600">
                {point.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className={`${CARD} p-5 flex flex-col`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={CAP}>Hoạt động gần đây</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
          Mới nhất
        </span>
      </div>

      {items.length === 0 ? (
        <p className="flex-1 flex items-center justify-center py-14 text-sm text-neutral-500">
          Chưa có hoạt động nào.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {items.map((item) => {
            const KindIcon = KIND_ICON[item.what];
            return (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar username={item.username} avatarUrl={item.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {item.username}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      {KindIcon ? <KindIcon size={11} className="shrink-0" /> : null}
                      {item.what}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-[13px] font-bold tabular-nums ${
                      item.amount === null
                        ? "text-neutral-600"
                        : item.credit
                          ? "text-emerald-400"
                          : "text-white"
                    }`}
                  >
                    {item.amount ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    <span className={STATE_TEXT[item.state]}>
                      {TX_STATE_LABELS[item.state]}
                    </span>
                    <span className="text-neutral-600"> · {item.ago}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h3 className={CAP}>Giao dịch gần đây</h3>
        <Link
          href="/admin/operations"
          className="text-[11px] font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          Xem tất cả →
        </Link>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-y border-white/[0.06]">
              {["Mã giao dịch", "Khách hàng", "Loại", "Số tiền", "Thời gian", "Trạng thái"].map(
                (head) => (
                  <th key={head} className={`px-5 py-3 whitespace-nowrap ${CAP}`}>
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                  Chưa có giao dịch nào.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const KindIcon = KIND_ICON[row.kind];
                return (
                  <tr
                    key={row.code}
                    className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.015]"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-neutral-300 whitespace-nowrap">
                      #{row.code}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-2.5">
                        <Avatar username={row.username} avatarUrl={row.avatarUrl} size={24} />
                        <span className="text-[13px] text-white">{row.username}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-[13px] text-neutral-400">
                        {KindIcon ? <KindIcon size={13} className="shrink-0" /> : null}
                        {row.kind}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-3 text-[13px] font-bold tabular-nums whitespace-nowrap ${
                        row.credit ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {row.amount}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-neutral-500 tabular-nums whitespace-nowrap">
                      {row.time}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${STATE_TINT[row.state]}`}
                      >
                        {TX_STATE_LABELS[row.state]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
