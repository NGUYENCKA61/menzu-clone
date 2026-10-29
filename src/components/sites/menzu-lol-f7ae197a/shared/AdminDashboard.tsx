import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatVnd } from "../admin/format";
import { Card, CardHead, TD, TH, TR } from "../admin/kit";

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
  SUCCESS: "text-emerald-600",
  PENDING: "text-amber-600",
  FAILED: "text-rose-600",
  // Grey, like every other withdrawn row in the shop: red is for something
  // that went wrong.
  CANCELLED: "text-zinc-400",
};

/** "500k", "1,2tr": a bar's label has a seventh of the width to sit in. */
function shortVnd(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toString().replace(".", ",")}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}đ`;
}

/**
 * The admin overview, rebuilt white on 30/10/2026 (the owner: "đập đi xây
 * lại… chuyên nghiệp như cái crm"). White cards on the grey canvas: today's
 * four figures, then the errand list first on a phone — it is the reason the
 * owner opens this screen — with the money charts beside them on a desktop.
 * A server component: nothing here reacts to a click.
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
    <div className="flex flex-col gap-4">
      <Figures figures={today} size="large" />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* What waits on the shop — first on a phone, beside the money on a desktop. */}
        <div className="flex min-w-0 flex-col gap-4">
          <Errands todo={todo} />
          {restock.lines.length > 0 ? <Restock {...restock} /> : null}
          <Card>
            <CardHead title="Từ trước đến nay" />
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              {totals.map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[12.5px] text-zinc-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-[17px] font-bold leading-tight tabular-nums text-zinc-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Revenue points={chart} weekChange={weekChange} />
          <Transactions rows={transactions} />
        </div>
      </div>
    </div>
  );
}

function Figures({ figures, size }: { figures: Figure[]; size: "large" | "small" }) {
  return (
    <section aria-label="Hôm nay" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {figures.map(({ label, value }) => {
        // A quiet day should look quiet: zeros step back.
        const idle = value === "0" || value === "0đ";
        return (
          <div key={label} className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-[12.5px] text-zinc-500">{label}</p>
            <p
              className={`mt-1 break-words font-bold leading-tight tabular-nums ${
                size === "large" ? "text-[21px] sm:text-[23px]" : "text-[17px]"
              } ${idle ? "text-zinc-400" : "text-zinc-900"}`}
            >
              {value}
            </p>
          </div>
        );
      })}
    </section>
  );
}

/** What waits on the shop: a row per errand with work, the rest one line. */
function Errands({ todo }: { todo: TodoItem[] }) {
  const open = todo.filter((item) => item.count > 0);
  const quiet = todo.filter((item) => item.count === 0);
  return (
    <Card>
      <CardHead title="Cần xử lý" />
      {open.length > 0 ? (
        <ul className="-mx-4 mt-2 sm:-mx-5">
          {open.map((item) => (
            <li key={item.label} className="border-b border-zinc-100 last:border-0">
              <ErrandLink {...item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13.5px] text-zinc-500">Không có việc nào đang chờ.</p>
      )}
      {quiet.length > 0 ? (
        <p className={`text-[12.5px] leading-relaxed text-zinc-400 ${open.length > 0 ? "mt-3" : "mt-2"}`}>
          Đang trống:{" "}
          {quiet.map((item, index) => (
            <span key={item.label}>
              <Link
                href={item.href}
                className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
              >
                {item.label}
              </Link>
              {index < quiet.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      ) : null}
    </Card>
  );
}

function ErrandLink({ label, count, warn, href }: TodoItem) {
  const className =
    "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 sm:px-5";
  const body = (
    <>
      <span className="w-9 shrink-0 text-[18px] font-bold tabular-nums text-zinc-900">{count}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-zinc-800">{label}</span>
        {warn ? (
          <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-amber-600">
            {warn}
          </span>
        ) : null}
      </span>
      <ChevronRight
        size={15}
        aria-hidden
        className="shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-600"
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
 * The shelves behind "Gói sắp hết hàng", each opening the page where keys
 * (or an "acc random" listing's sign-ins) are pasted in.
 */
function Restock({ lines, more }: { lines: RestockLine[]; more: number }) {
  return (
    <Card className="scroll-mt-20" >
      <div id="kho-key">
        <CardHead title="Gói sắp hết hàng" hint="Bấm vào gói để nhập thêm" />
      </div>
      <ul className="-mx-4 mt-2 sm:-mx-5">
        {lines.map((line) => (
          <li key={line.id} className="border-b border-zinc-100 last:border-0">
            <Link
              href={line.href}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50 sm:px-5"
            >
              {/* The tier on a line of its own: product names run to a hundred
                  characters, and on one line the truncation ate the tier. */}
              <span className="min-w-0 flex-1">
                <span title={line.name} className="block truncate text-[13.5px] text-zinc-800">
                  {sentenceCase(line.name)}
                </span>
                {line.tier ? (
                  <span className="block truncate text-[12.5px] text-zinc-500">Gói {line.tier}</span>
                ) : null}
              </span>
              {line.waitingOrders > 0 ? (
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-amber-600">
                  {line.waitingOrders} đơn chờ giao
                </span>
              ) : null}
              <span
                className={`shrink-0 text-[12.5px] font-semibold tabular-nums ${
                  line.left === 0 ? "text-rose-600" : "text-amber-600"
                }`}
              >
                {line.left === 0 ? `Hết ${line.word}` : `Còn ${line.left} ${line.word}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="mt-2 text-[12.5px] text-zinc-400">Và {more} gói khác</p> : null}
    </Card>
  );
}

const BAR_H = 120;
const SLOT_W = 100;
const BAR_W = 44;

/** Seven ink bars on white; today's is the darkest. */
function Revenue({
  points,
  weekChange,
}: {
  points: ChartPoint[];
  weekChange: { text: string; up: boolean } | null;
}) {
  const peak = Math.max(0, ...points.map((point) => point.value));
  return (
    <Card>
      <CardHead
        title="Doanh thu 7 ngày"
        aside={
          weekChange ? (
            <span className="text-[12.5px] text-zinc-500">
              So với 7 ngày trước{" "}
              <span
                className={`font-semibold ${weekChange.up ? "text-emerald-600" : "text-rose-600"}`}
              >
                {weekChange.text}
              </span>
            </span>
          ) : undefined
        }
      />
      {peak === 0 ? (
        <p className="mt-3 text-[13.5px] text-zinc-500">
          Chưa có đơn nào được thanh toán trong 7 ngày qua.
        </p>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1 text-center">
            {points.map((point, index) => (
              <span
                key={`v-${point.label}-${index}`}
                title={`${formatVnd(point.value)}đ`}
                className="truncate text-[11.5px] tabular-nums text-zinc-500"
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
                  fill={point.value > 0 ? (today ? "#18181b" : "#a1a1aa") : "#e4e4e7"}
                />
              );
            })}
          </svg>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {points.map((point, index) => (
              <span
                key={`l-${point.label}-${index}`}
                className={`text-[11.5px] ${
                  index === points.length - 1 ? "font-semibold text-zinc-900" : "text-zinc-500"
                }`}
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Transactions({ rows }: { rows: TransactionRow[] }) {
  return (
    <Card>
      <CardHead
        title="Giao dịch gần đây"
        aside={
          <Link
            href="/admin/operations"
            className="text-[12.5px] font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Xem tất cả
          </Link>
        }
      />

      {rows.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-zinc-500">Chưa có giao dịch nào.</p>
      ) : (
        <>
          {/* Phones: two lines per row, the sum and the state on the right. */}
          <ul className="-mx-4 mt-2 sm:hidden">
            {rows.map((row) => (
              <li
                key={row.code}
                className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-zinc-800">
                    {row.username}
                  </span>
                  <span className="block text-[12.5px] text-zinc-500">
                    {row.kind}, {row.time}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-[13.5px] font-semibold tabular-nums ${
                      row.credit ? "text-emerald-600" : "text-zinc-900"
                    }`}
                  >
                    {row.amount}
                  </span>
                  <span className={`block text-[12.5px] ${STATE_TEXT[row.state]}`}>
                    {TX_STATE_LABELS[row.state]}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className={TH}>Mã</th>
                  <th className={TH}>Khách</th>
                  <th className={TH}>Loại</th>
                  <th className={`${TH} text-right`}>Số tiền</th>
                  <th className={`${TH} pl-4`}>Giờ</th>
                  <th className={TH}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className={TR}>
                    <td className={`${TD} whitespace-nowrap font-mono text-[12.5px] text-zinc-500`}>
                      {row.code}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-medium text-zinc-800`}>
                      {row.username}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-zinc-500`}>{row.kind}</td>
                    <td
                      className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums ${
                        row.credit ? "text-emerald-600" : "text-zinc-900"
                      }`}
                    >
                      {row.amount}
                    </td>
                    <td className={`${TD} whitespace-nowrap pl-4 tabular-nums text-zinc-500`}>
                      {row.time}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-medium ${STATE_TEXT[row.state]}`}>
                      {TX_STATE_LABELS[row.state]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
