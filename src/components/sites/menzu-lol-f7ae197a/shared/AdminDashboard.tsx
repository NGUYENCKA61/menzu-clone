import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatVnd } from "./productData";

import { TX_STATE_LABELS, type TxState } from "@/lib/dashboard";
import { sentenceCase } from "@/lib/displayCase";

/** A figure and its label: today's four, the all-time four. */
export interface Figure {
  label: string;
  value: string;
}

/** One errand waiting on the shop, and the screen where it is done. */
export interface TodoItem {
  label: string;
  count: number;
  /** Said under the label only when it is a warning (a paid buyer waits). */
  warn?: string;
  /** A screen, or "#kho-key" for the restock list under the errands. */
  href: string;
}

/** One shelf to restock, under the errands. */
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

export interface TransactionRow {
  code: string;
  username: string;
  kind: string;
  amount: string;
  credit: boolean;
  time: string;
  state: TxState;
}

const STATE_TEXT: Record<TxState, string> = {
  SUCCESS: "text-emerald-400",
  PENDING: "text-amber-400",
  FAILED: "text-rose-400",
  // Grey, like every other withdrawn row in the shop: red is for something
  // that went wrong.
  CANCELLED: "text-neutral-500",
};

const H2 = "text-[16px] font-bold text-frost";

/** "500k", "1,2tr": a bar's label has a seventh of the width to sit in. */
function shortVnd(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toString().replace(".", ",")}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}đ`;
}

/**
 * The admin overview.
 *
 * LAB (the owner, 16/10/2026: "làm lại sao cho bớt AI bớt rối thử"): one
 * column read top to bottom, no icon badges, no card around every block,
 * each fact said once. The activity feed went: it repeated the transactions
 * below it (new sign-ups are counted under "Hôm nay" and listed in Người
 * dùng). A server component: nothing here reacts to a click.
 */
export function AdminDashboard({
  todo,
  restock,
  today,
  totals,
  chart,
  weekChange,
  transactions,
}: {
  todo: TodoItem[];
  restock: { lines: RestockLine[]; more: number };
  today: Figure[];
  totals: Figure[];
  chart: ChartPoint[];
  /** This week against the seven days before it; null with nothing to compare. */
  weekChange: { text: string; up: boolean } | null;
  transactions: TransactionRow[];
}) {
  return (
    <div className="flex max-w-[1080px] flex-col gap-10">
      <Figures title="Hôm nay" figures={today} size="large" />
      <Errands todo={todo} />
      {restock.lines.length > 0 ? <Restock {...restock} /> : null}
      <Revenue points={chart} weekChange={weekChange} />
      <Transactions rows={transactions} />
      <Figures title="Từ trước đến nay" figures={totals} size="small" />
    </div>
  );
}

function Figures({
  title,
  figures,
  size,
}: {
  title: string;
  figures: Figure[];
  size: "large" | "small";
}) {
  return (
    <section aria-label={title}>
      <h2 className={H2}>{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-4 sm:grid-cols-4">
        {figures.map(({ label, value }) => {
          // A quiet day should look quiet: zeros step back.
          const idle = value === "0" || value === "0đ";
          return (
            <div key={label} className="min-w-0">
              <dt className="text-[13px] text-mist">{label}</dt>
              <dd
                className={`mt-1 break-words font-bold leading-tight tabular-nums ${
                  size === "large" ? "text-[24px]" : "text-[17px]"
                } ${idle ? "text-neutral-600" : "text-frost"}`}
              >
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** What waits on the shop: a row per errand with work, the rest one line. */
function Errands({ todo }: { todo: TodoItem[] }) {
  const open = todo.filter((item) => item.count > 0);
  const quiet = todo.filter((item) => item.count === 0);
  return (
    <section aria-label="Cần xử lý">
      <h2 className={H2}>Cần xử lý</h2>
      {open.length > 0 ? (
        <ul className="mt-3 overflow-hidden rounded-[12px] border border-line">
          {open.map((item) => (
            <li key={item.label} className="border-b border-line last:border-0">
              <ErrandLink {...item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-line pt-4 text-[14px] text-mist">
          Không có việc nào đang chờ.
        </p>
      )}
      {quiet.length > 0 ? (
        <p className="mt-3 text-[13px] text-dim">
          Đang trống:{" "}
          {quiet.map((item, index) => (
            <span key={item.label}>
              <Link href={item.href} className="text-mist underline-offset-4 hover:text-frost hover:underline">
                {item.label}
              </Link>
              {index < quiet.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

function ErrandLink({ label, count, warn, href }: TodoItem) {
  const className = "group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]";
  const body = (
    <>
      <span className="w-12 shrink-0 text-[20px] font-bold tabular-nums text-frost">{count}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-frost">{label}</span>
        {warn ? (
          <span className="mt-0.5 block truncate text-[13px] font-semibold text-amber-400">{warn}</span>
        ) : null}
      </span>
      <ChevronRight
        size={16}
        aria-hidden
        className="shrink-0 text-neutral-600 transition-colors group-hover:text-frost"
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
 * The shelves behind "Kho sắp hết hàng", each opening the page where keys
 * (or an "acc random" listing's sign-ins) are pasted in.
 */
function Restock({ lines, more }: { lines: RestockLine[]; more: number }) {
  return (
    <section id="kho-key" aria-label="Gói sắp hết hàng" className="scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={H2}>Gói sắp hết hàng</h2>
        <span className="text-[13px] text-dim">Bấm vào gói để nhập thêm</span>
      </div>
      <ul className="mt-3 border-t border-line">
        {lines.map((line) => (
          <li key={line.id} className="border-b border-line">
            <Link
              href={line.href}
              className="group -mx-3 flex items-center gap-4 rounded-[8px] px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              {/* The tier on a line of its own: product names run to a hundred
                  characters, and on one line the truncation ate the tier. */}
              <span className="min-w-0 flex-1">
                <span title={line.name} className="block truncate text-[14px] text-frost">
                  {sentenceCase(line.name)}
                </span>
                {line.tier ? (
                  <span className="block truncate text-[13px] text-dim">Gói {line.tier}</span>
                ) : null}
              </span>
              {line.waitingOrders > 0 ? (
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-amber-400">
                  {line.waitingOrders} đơn chờ giao
                </span>
              ) : null}
              <span
                className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                  line.left === 0 ? "text-rose-400" : "text-amber-400"
                }`}
              >
                {line.left === 0 ? `Hết ${line.word}` : `Còn ${line.left} ${line.word}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="mt-2 text-[13px] text-dim">Và {more} gói khác</p> : null}
    </section>
  );
}

const BAR_H = 120;
const SLOT_W = 100;
const BAR_W = 44;

/** Seven plain bars; today's is the light one. */
function Revenue({
  points,
  weekChange,
}: {
  points: ChartPoint[];
  weekChange: { text: string; up: boolean } | null;
}) {
  const peak = Math.max(0, ...points.map((point) => point.value));
  return (
    <section aria-label="Doanh thu 7 ngày">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={H2}>Doanh thu 7 ngày</h2>
        {weekChange ? (
          <span className="text-[13px] text-dim">
            So với 7 ngày trước đó{" "}
            <span className={`font-semibold ${weekChange.up ? "text-emerald-400" : "text-rose-400"}`}>
              {weekChange.text}
            </span>
          </span>
        ) : null}
      </div>
      {peak === 0 ? (
        <p className="mt-3 border-t border-line pt-4 text-[14px] text-mist">
          Chưa có đơn nào được thanh toán trong 7 ngày qua.
        </p>
      ) : (
        <div className="mt-3 border-t border-line pt-4">
          <div className="grid grid-cols-7 gap-1 text-center">
            {points.map((point, index) => (
              <span
                key={`v-${point.label}-${index}`}
                title={`${formatVnd(point.value)}đ`}
                className="truncate text-[12px] tabular-nums text-dim"
              >
                {point.value > 0 ? shortVnd(point.value) : ""}
              </span>
            ))}
          </div>
          <svg
            viewBox={`0 0 ${SLOT_W * points.length} ${BAR_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Doanh thu 7 ngày, cao nhất ${formatVnd(peak)}đ`}
            className="mt-1 block h-[120px] w-full"
          >
            {points.map((point, index) => {
              const h = point.value > 0 ? Math.max(3, Math.round((point.value / peak) * BAR_H)) : 2;
              const today = index === points.length - 1;
              return (
                <rect
                  key={`b-${point.label}-${index}`}
                  x={index * SLOT_W + (SLOT_W - BAR_W) / 2}
                  y={BAR_H - h}
                  width={BAR_W}
                  height={h}
                  rx={3}
                  fill={point.value > 0 ? (today ? "#f5f5f5" : "#5c5c66") : "#2f2f36"}
                />
              );
            })}
          </svg>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {points.map((point, index) => (
              <span
                key={`l-${point.label}-${index}`}
                className={`text-[12px] ${index === points.length - 1 ? "font-semibold text-frost" : "text-dim"}`}
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Transactions({ rows }: { rows: TransactionRow[] }) {
  return (
    <section aria-label="Giao dịch gần đây">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={H2}>Giao dịch gần đây</h2>
        <Link href="/admin/operations" className="text-[13px] font-semibold text-mist hover:text-frost">
          Xem tất cả
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 border-t border-line pt-4 text-[14px] text-mist">Chưa có giao dịch nào.</p>
      ) : (
        <>
          {/* Phones: two lines per row, the sum and the state on the right. */}
          <ul className="mt-3 border-t border-line sm:hidden">
            {rows.map((row) => (
              <li key={row.code} className="flex items-start justify-between gap-3 border-b border-line py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-frost">{row.username}</span>
                  <span className="block text-[13px] text-dim">
                    {row.kind}, {row.time}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-[14px] font-semibold tabular-nums ${
                      row.credit ? "text-emerald-400" : "text-frost"
                    }`}
                  >
                    {row.amount}
                  </span>
                  <span className={`block text-[13px] ${STATE_TEXT[row.state]}`}>
                    {TX_STATE_LABELS[row.state]}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[620px] text-left text-[14px]">
              <thead>
                <tr className="border-y border-line text-[13px] text-dim">
                  <th className="py-2.5 pr-4 font-medium">Mã</th>
                  <th className="py-2.5 pr-4 font-medium">Khách</th>
                  <th className="py-2.5 pr-4 font-medium">Loại</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Số tiền</th>
                  <th className="py-2.5 pl-6 pr-4 font-medium">Giờ</th>
                  <th className="py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className="border-b border-line">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[13px] text-mist">{row.code}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-frost">{row.username}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-mist">{row.kind}</td>
                    <td
                      className={`whitespace-nowrap py-2.5 pr-4 text-right font-semibold tabular-nums ${
                        row.credit ? "text-emerald-400" : "text-frost"
                      }`}
                    >
                      {row.amount}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-6 pr-4 tabular-nums text-dim">{row.time}</td>
                    <td className={`whitespace-nowrap py-2.5 ${STATE_TEXT[row.state]}`}>
                      {TX_STATE_LABELS[row.state]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
