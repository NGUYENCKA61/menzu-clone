import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  KeyRound,
  Landmark,
  ShoppingBag,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";

import { formatVnd } from "./productData";

import { linePoints, TX_STATE_LABELS, type TxState } from "@/lib/dashboard";
import { sentenceCase } from "@/lib/displayCase";

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

/** One errand waiting on the shop, and the screen where it is done. */
export interface TodoItem {
  label: string;
  count: number;
  /** What is counted, in a few words. */
  sub: string;
  /** Tints the sub-line amber: a paid buyer is already waiting. */
  subWarn?: boolean;
  /** A screen, or "#kho-key" for the restock list under the cards. */
  href: string;
  icon: LucideIcon;
}

/** One shelf to restock, under the to-do cards. */
export interface RestockLine {
  id: string;
  name: string;
  /** Null on an "acc random" listing, which has only the one shelf. */
  tier: string | null;
  /** "key", or "tài khoản" on an "acc random" listing. */
  word: string;
  left: number;
  waitingOrders: number;
  href: string;
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

const CARD = "rounded-[14px] border border-line bg-raise/40";
const CAP = "text-[13px] font-medium text-mist";

const STATE_TINT: Record<TxState, string> = {
  SUCCESS: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  FAILED: "border-rose-500/25 bg-rose-500/10 text-rose-400",
  // Grey, like every other withdrawn row in the shop: red is for something
  // that went wrong.
  CANCELLED: "border-white/10 bg-white/5 text-neutral-400",
};

const STATE_TEXT: Record<TxState, string> = {
  SUCCESS: "text-emerald-400",
  PENDING: "text-amber-400",
  FAILED: "text-rose-400",
  CANCELLED: "text-neutral-400",
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
        <span aria-hidden className="text-[13px] font-semibold text-neutral-500">
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
  todo,
  restock,
  todayStats,
  totals,
  chart,
  activity,
  transactions,
}: {
  todo: TodoItem[];
  restock: { lines: RestockLine[]; more: number };
  todayStats: StatItem[];
  totals: StatItem[];
  chart: ChartPoint[];
  activity: ActivityItem[];
  transactions: TransactionRow[];
}) {
  return (
    // LAB (Launcher, the owner 16/10/2026: "Thiết kế lại"): what the shop
    // must do first and how today is going sit on the first screen; the
    // figures that only change slowly move down. Same data as before.
    <div className="flex flex-col gap-6">
      <TodayStrip stats={todayStats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ActionInbox todo={todo} />
          {restock.lines.length > 0 ? <RestockList {...restock} /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <RevenueChart points={chart} />
          <ActivityFeed items={activity} />
        </div>
      </div>

      <section aria-label="Thống kê" className="flex flex-col gap-3">
        <h2 className="text-[17px] font-black text-frost">Tổng từ trước đến nay</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {totals.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <TransactionTable rows={transactions} />
    </div>
  );
}
/** Today's four figures as one strip, the first (revenue) the largest. */
function TodayStrip({ stats }: { stats: StatItem[] }) {
  return (
    <section aria-label="Hôm nay" className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-[17px] font-black text-frost">Hôm nay</h2>
        <span className="text-[13px] text-dim">00:00–23:59 giờ Việt Nam</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr] xl:divide-x xl:divide-line">
        {stats.map(({ label, value, sub, tone, icon: Icon }, index) => {
          const idle = value === "0" || value === "0đ";
          return (
            <div key={label} className="flex min-w-0 flex-col gap-2 px-5 py-4">
              <span className="flex items-center gap-2 text-[13px] font-medium text-mist">
                <Icon size={14} aria-hidden className="shrink-0" />
                {label}
              </span>
              <span
                className={`break-all font-black leading-none tabular-nums ${
                  index === 0 ? "text-[30px] sm:text-[36px]" : "text-[22px] sm:text-[26px]"
                } ${idle ? "text-neutral-600" : "text-frost"}`}
              >
                {value}
              </span>
              <span
                className={`text-[13px] ${
                  tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-dim"
                }`}
              >
                {sub}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The errands as an inbox: what is waiting gets a row with its count, the
 * rest folds into one quiet line of links, so the eye lands on work.
 */
function ActionInbox({ todo }: { todo: TodoItem[] }) {
  const open = todo.filter((item) => item.count > 0);
  const quiet = todo.filter((item) => item.count === 0);
  const waiting = open.reduce((sum, item) => sum + item.count, 0);
  return (
    <section aria-label="Việc cần xử lý" className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[17px] font-black text-frost">Việc cần xử lý</h2>
        <span
          className={`rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
            waiting > 0 ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.06] text-mist"
          }`}
        >
          {waiting > 0 ? `${waiting} việc đang chờ` : "Không có việc chờ"}
        </span>
      </div>
      {open.length > 0 ? (
        <ul className="divide-y divide-line">
          {open.map((item) => (
            <li key={item.label}>
              <TodoRow {...item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[14px] text-mist">Không còn việc nào đang chờ.</p>
      )}
      {quiet.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-line bg-black/20 px-5 py-3 text-[13px] text-dim">
          <span>Không có việc:</span>
          {quiet.map((item, index) => (
            <span key={item.label}>
              {item.href.startsWith("#") ? (
                <a href={item.href} className="text-mist underline-offset-4 hover:text-frost hover:underline">
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className="text-mist underline-offset-4 hover:text-frost hover:underline">
                  {item.label}
                </Link>
              )}
              {index < quiet.length - 1 ? "," : ""}
            </span>
          ))}
        </p>
      ) : null}
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
        className={`min-w-0 break-all text-[20px] font-black leading-none tabular-nums sm:text-[26px] ${
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

/** One waiting errand as an inbox row, opening the screen where it is done. */
function TodoRow({ label, count, sub, subWarn, href, icon: Icon }: TodoItem) {
  const className = "group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]";
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-amber-500/25 bg-amber-500/10 text-amber-400">
        <Icon size={17} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-frost">{label}</span>
        <span className={`truncate text-[13px] ${subWarn ? "font-semibold text-amber-400" : "text-mist"}`}>{sub}</span>
      </span>
      <span className="shrink-0 text-[26px] font-black leading-none tabular-nums text-frost">{count}</span>
      <ChevronRight
        size={16}
        aria-hidden
        className="shrink-0 text-neutral-600 transition-colors group-hover:text-white"
      />
    </>
  );
  return href.startsWith("#") ? (
    <a href={href} className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
/**
 * The shelves behind the restock card, each opening the page where keys (or
 * an "acc random" listing's sign-ins) are pasted in. Only drawn when there is
 * one; the card says how many in all, the list the first few.
 */
function RestockList({ lines, more }: { lines: RestockLine[]; more: number }) {
  return (
    <div id="kho-key" className={`${CARD} scroll-mt-20 overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <h3 className={CAP}>Gói sắp hết hàng</h3>
        <span className="text-[13px] text-dim">Bấm vào gói để nhập thêm</span>
      </div>
      <ul className="border-t border-white/[0.06]">
        {lines.map((line) => (
          <li key={line.id} className="border-b border-white/[0.04] last:border-0">
            <Link
              href={line.href}
              className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/[0.02]"
            >
              <KeyRound size={13} aria-hidden className="shrink-0 text-neutral-500" />
              {/* The tier on a line of its own: product names here run to a
                  hundred characters, and on one line the truncation ate the
                  tier, which is the part that says which shelf is empty. */}
              <span className="min-w-0 flex-1">
                <span title={line.name} className="block truncate text-[14px] font-medium text-frost">{sentenceCase(line.name)}</span>
                {line.tier ? (
                  <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
                    Gói {line.tier}
                  </span>
                ) : null}
              </span>
              {line.waitingOrders > 0 ? (
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-amber-400">
                  {line.waitingOrders} đơn chờ giao
                </span>
              ) : null}
              <span
                className={`shrink-0 text-[11px] font-bold tabular-nums ${
                  line.left === 0 ? "text-rose-400" : "text-amber-400"
                }`}
              >
                {line.left === 0 ? `Hết ${line.word}` : `Còn ${line.left} ${line.word}`}
              </span>
              <ChevronRight
                size={14}
                aria-hidden
                className="shrink-0 text-neutral-600 transition-colors group-hover:text-white"
              />
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <p className="border-t border-white/[0.06] px-5 py-2.5 text-[11px] text-neutral-500">
          Và {more} gói khác
        </p>
      ) : null}
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
        <span className="text-[12px] font-bold text-neutral-600">
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
                    {item.amount ?? "-"}
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
          className="press -mr-2 rounded-lg px-2 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* On a phone the 760px table showed the code and half a name; the sum
          and the state were 400px to the right. Two-line rows instead. */}
      <ul className="border-t border-white/[0.06] sm:hidden">
        {rows.length === 0 ? (
          <li className="px-5 py-12 text-center text-neutral-500">Chưa có giao dịch nào.</li>
        ) : (
          rows.map((row) => {
            const KindIcon = KIND_ICON[row.kind];
            return (
              <li key={row.code} className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0">
                <Avatar username={row.username} avatarUrl={row.avatarUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold text-white">{row.username}</span>
                    <span className={`shrink-0 text-[13px] font-bold tabular-nums ${row.credit ? "text-emerald-400" : "text-white"}`}>{row.amount}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      {KindIcon ? <KindIcon size={12} className="shrink-0" /> : null}
                      {row.kind} · {row.time}
                    </span>
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[12px] font-semibold ${STATE_TINT[row.state]}`}>
                      {TX_STATE_LABELS[row.state]}
                    </span>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="hidden w-full overflow-x-auto sm:block">
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
                        className={`inline-block rounded-md border px-2 py-1 text-[12px] font-semibold whitespace-nowrap ${STATE_TINT[row.state]}`}
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
