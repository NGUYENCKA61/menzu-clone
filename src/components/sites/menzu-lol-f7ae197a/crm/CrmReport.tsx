"use client";

import { ArrowDownRight, ArrowUpRight, Bot } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatVnd } from "./format";

/**
 * Báo cáo: the week at a glance, fourteen days drawn, the chat desk's own
 * score, and the customers carrying the month. Numbers are server-fetched
 * once per load; this screen only draws.
 *
 * Charts are single-series bars, hand-rolled SVG: revenue in the shop's
 * red, sign-ups in sky (the pair passes the palette validator on this
 * surface), thin marks with rounded tops anchored to the baseline, a hover
 * tooltip per bar, and the same numbers as a table behind "Xem bảng số".
 */

interface ReportDay {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  newUsers: number;
}

export interface CrmReportData {
  days: ReportDay[];
  week: {
    revenue: number;
    orders: number;
    newUsers: number;
    prevRevenue: number;
    prevOrders: number;
    prevNewUsers: number;
  };
  chat: { needAdmin: number; bot: number; done: number; doneByBotAlone: number };
  topCustomers: { uid: number; username: string; total: number; orders: number }[];
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <span className="text-[11px] text-zinc-400">không đổi</span>;
  if (prev === 0) return <span className="text-[11px] font-semibold text-emerald-600">mới có</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <span className="text-[11px] text-zinc-400">bằng tuần trước</span>;
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}
    >
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}% so với tuần trước
    </span>
  );
}

/** One single-series bar chart: thin rounded-top bars, hover tooltip. */
function Bars({
  days,
  pick,
  color,
  money,
}: {
  days: ReportDay[];
  pick: (d: ReportDay) => number;
  color: string;
  money?: boolean;
}) {
  const [tip, setTip] = useState<number | null>(null);
  const width = 560;
  const height = 150;
  const pad = 6;
  const barGap = 6;
  const barWidth = (width - pad * 2 - barGap * (days.length - 1)) / days.length;
  const max = Math.max(1, ...days.map(pick));
  const radius = Math.min(4, barWidth / 2);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="w-full"
        role="img"
        aria-label="Biểu đồ cột 14 ngày"
      >
        <line x1={pad} x2={width - pad} y1={height} y2={height} stroke="#e4e4e7" strokeWidth="1" />
        {days.map((day, index) => {
          const value = pick(day);
          const barHeight = Math.max(value > 0 ? 3 : 0, (value / max) * (height - 12));
          const x = pad + index * (barWidth + barGap);
          const y = height - barHeight;
          return (
            <g key={day.key}>
              {/* The visible mark: rounded at the data end, square on the baseline. */}
              {barHeight > 0 ? (
                <path
                  d={`M${x},${height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + barWidth - radius} Q${x + barWidth},${y} ${x + barWidth},${y + radius} V${height} Z`}
                  fill={color}
                  opacity={tip === null || tip === index ? 1 : 0.45}
                />
              ) : null}
              {/* The hit target, taller than the mark. */}
              <rect
                x={x - barGap / 2}
                y={0}
                width={barWidth + barGap}
                height={height}
                fill="transparent"
                onMouseEnter={() => setTip(index)}
                onMouseLeave={() => setTip(null)}
              />
              {index % 2 === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={height + 15}
                  textAnchor="middle"
                  className="fill-zinc-400"
                  fontSize="10"
                >
                  {day.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {tip !== null ? (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11.5px] shadow-md"
          style={{ left: `${(tip / days.length) * 100}%` }}
        >
          <span className="font-semibold">{days[tip]!.label}</span>
          {": "}
          <span className="tabular-nums">
            {money ? `${formatVnd(pick(days[tip]!))}đ` : pick(days[tip]!)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NumberTable({ days }: { days: ReportDay[] }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[12px] font-semibold text-zinc-500">
        Xem bảng số
      </summary>
      <table className="mt-2 w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase text-zinc-400">
            <th className="py-1 font-semibold">Ngày</th>
            <th className="py-1 text-right font-semibold">Doanh thu</th>
            <th className="py-1 text-right font-semibold">Đơn</th>
            <th className="py-1 text-right font-semibold">Khách mới</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.key} className="border-t border-zinc-100">
              <td className="py-1">{day.label}</td>
              <td className="py-1 text-right tabular-nums">{formatVnd(day.revenue)}đ</td>
              <td className="py-1 text-right tabular-nums">{day.orders}</td>
              <td className="py-1 text-right tabular-nums">{day.newUsers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function CrmReport({ data }: { data: CrmReportData }) {
  const { week, chat } = data;
  const botShare =
    chat.done > 0 ? Math.round((chat.doneByBotAlone / chat.done) * 100) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-4 px-4 py-5 lg:px-8">
        <div>
          <h1 className="text-[19px] font-bold">Báo cáo</h1>
          <p className="text-[12.5px] text-zinc-500">
            Mười bốn ngày gần nhất, tính theo giờ Việt Nam. Doanh thu là đơn đã
            thanh toán.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Doanh thu 7 ngày
            </p>
            <p className="text-xl font-black tabular-nums">{formatVnd(week.revenue)}đ</p>
            <Delta now={week.revenue} prev={week.prevRevenue} />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Đơn 7 ngày
            </p>
            <p className="text-xl font-black tabular-nums">{week.orders}</p>
            <Delta now={week.orders} prev={week.prevOrders} />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Khách mới 7 ngày
            </p>
            <p className="text-xl font-black tabular-nums">{week.newUsers}</p>
            <Delta now={week.newUsers} prev={week.prevNewUsers} />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Chat cần xử lý
            </p>
            <p className="text-xl font-black tabular-nums">{chat.needAdmin}</p>
            <Link href="/crm" className="text-[11px] font-semibold text-red-700 hover:underline">
              Mở hộp thư
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-[14px] font-bold">Doanh thu theo ngày</h2>
          <Bars days={data.days} pick={(d) => d.revenue} color="#dc2626" money />
          <NumberTable days={data.days} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-[14px] font-bold">Khách đăng ký mới theo ngày</h2>
            <Bars days={data.days} pick={(d) => d.newUsers} color="#0284c7" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-[14px] font-bold">Bàn chat</h2>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-[15px] font-black tabular-nums">
                  {botShare === null ? "Chưa có số" : `${botShare}%`}
                </p>
                <p className="text-[11.5px] text-zinc-500">
                  hội thoại xong mà bot tự lo, không cần bạn
                  ({chat.doneByBotAlone}/{chat.done})
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="font-semibold text-amber-800">Cần xử lý</span>
                <span className="font-bold tabular-nums text-amber-800">{chat.needAdmin}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                <span className="font-semibold text-zinc-600">Bot đang trả lời</span>
                <span className="font-bold tabular-nums text-zinc-600">{chat.bot}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="font-semibold text-emerald-700">Đã xong</span>
                <span className="font-bold tabular-nums text-emerald-700">{chat.done}</span>
              </li>
            </ul>
            <p className="text-[11.5px] text-zinc-400">
              Muốn bot tự lo nhiều hơn: dạy nó trong mục Sổ tay bot.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-[14px] font-bold">Khách mua nhiều nhất 30 ngày</h2>
          {data.topCustomers.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-zinc-500">Chưa có đơn nào trong 30 ngày.</p>
          ) : (
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase text-zinc-400">
                  <th className="py-1.5 font-semibold">Khách</th>
                  <th className="py-1.5 text-right font-semibold">Đơn</th>
                  <th className="py-1.5 text-right font-semibold">Tổng mua</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer) => (
                  <tr key={customer.uid} className="border-t border-zinc-100">
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${customer.uid}`}
                        className="font-semibold hover:text-red-700"
                      >
                        {customer.username}
                      </Link>
                      <span className="ml-1.5 text-[11px] text-zinc-400">UID {customer.uid}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{customer.orders}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {formatVnd(customer.total)}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
