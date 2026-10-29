import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  Clock,
  Eye,
  KeyRound,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { AdminChrome } from "@/components/sites/menzu-lol-f7ae197a/admin/AdminChrome";
import { Chip, Pager, type ChipTone } from "@/components/sites/menzu-lol-f7ae197a/admin/kit";
import { AdminOrderFilters } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOrderFilters";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { currentOrderIdOf, loginHandover } from "@/lib/accountLogin";
import { getAdmin } from "@/lib/admin";
import { dayStamp } from "@/lib/dayGroups";
import { db } from "@/lib/db";
import { sentenceCase } from "@/lib/displayCase";
import {
  hasOrderFilters,
  ORDER_STATUS_LABELS,
  ORDERS_PER_PAGE,
  parseOrderFilters,
  type OrderStatus,
} from "@/lib/orders";
import { productHref } from "@/lib/routes";
import { pageCount, pageRange, parsePage } from "@/lib/paging";
import { orderWhere } from "@/lib/orderStore";
import { startOfDayVn } from "@/lib/time";

export const metadata: Metadata = { title: "Đơn hàng | Quản trị" };
export const dynamic = "force-dynamic";

// The last column stays in view while the rest scrolls: with the sidebar a
// 1024 laptop has 732px for a 1012px table and the buttons were the first
// thing to go. Same surface as the card so the rows slide under it.
const STICKY_ACTIONS =
  "sticky right-0 z-10 bg-white border-l border-zinc-100 shadow-[-10px_0_14px_-10px_rgba(24,24,27,0.08)]";

const STATUS_TONE: Record<string, ChipTone> = {
  PAID: "emerald",
  PENDING: "amber",
  CANCELLED: "red",
  REFUNDED: "violet",
};

/**
 * Whether an account order's buyer has taken the sign-in through the
 * receipt's "Lấy thông tin", and when: what the desk checks first on a
 * warranty claim (the owner, 08/10/2026). Paid account orders only.
 */
function RevealNote({
  order,
}: {
  order: { status: string; loginRevealedAt: Date | null; product: { productType: string } };
}) {
  if (order.status !== "PAID" || order.product.productType !== "ACCOUNT_GAME") return null;
  return order.loginRevealedAt ? (
    <span className="text-[10.5px] font-semibold text-zinc-400">
      Khách mở TK lúc {dayStamp(order.loginRevealedAt)}
    </span>
  ) : (
    <span className="text-[10.5px] font-semibold text-amber-600">Khách chưa mở TK</span>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdmin();
  if (!admin) notFound();

  const raw = await searchParams;
  const filters = parseOrderFilters({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    method: typeof raw.method === "string" ? raw.method : undefined,
    day: typeof raw.day === "string" ? raw.day : undefined,
  });
  const where = orderWhere(filters);
  const filtered = hasOrderFilters(filters);

  // Counted first, because the page number has to be clamped against
  // something that exists: ?page=999 on a three-page list should land on the
  // last page, not on an empty table that reads as "no orders".
  // The four cards across the top always describe the whole shop, never the
  // filtered view — a total that changes when you search is not a total.
  const since = startOfDayVn();
  const [matching, totalOrders, paidAgg, pendingCount, todayAgg] = await Promise.all([
    db.order.count({ where }),
    db.order.count(),
    db.order.aggregate({ _count: true, _sum: { total: true }, where: { status: "PAID" } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({
      _count: true,
      _sum: { total: true },
      where: { status: "PAID", createdAt: { gte: since } },
    }),
  ]);
  const totalPages = pageCount(matching, ORDERS_PER_PAGE);
  const page = parsePage(typeof raw.page === "string" ? raw.page : undefined, totalPages);
  const range = pageRange(page, ORDERS_PER_PAGE, matching);

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ORDERS_PER_PAGE,
    take: ORDERS_PER_PAGE,
    include: {
      user: { select: { username: true, uid: true, avatarUrl: true } },
      product: {
        select: {
          code: true,
          name: true,
          slug: true,
          productType: true,
          accountPool: true,
          category: { select: { slug: true } },
          // Only to say whether a sign-in went out with the order; the values
          // themselves are not printed on this list.
          loginUsername: true,
          loginPassword: true,
          loginNote: true,
          // The latest sale of the account — an earlier order of a re-listed
          // account wears no badge, since the row is somebody else's now.
          orders: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
      voucher: { select: { code: true } },
    },
  });

  /** A link to another page, carrying whatever filters are on. */
  function pageHref(target: number): string {
    const next = new URLSearchParams();
    if (filters.q) next.set("q", filters.q);
    if (filters.status) next.set("status", filters.status);
    if (filters.method) next.set("method", filters.method);
    if (filters.day) next.set("day", filters.day);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }

  // What both layouts below need per row, computed once: the card list on a
  // phone and the table from sm up read the same array.
  const rows = orders.map((o) => ({
    o,
    discounted: o.discountPct > 0 || o.voucher !== null,
    login: loginHandover(o, {
      ...o.product,
      currentOrderId: currentOrderIdOf(o.product),
    }),
  }));

  return (
    <AdminChrome
      title="Đơn hàng"
      subtitle="Quản lý toàn bộ đơn hàng trên hệ thống"
      username={admin.username}
      aside={
        <span className="text-[13px] tabular-nums text-zinc-500">
          {matching.toLocaleString("vi-VN")} đơn hàng
          {filtered ? " khớp bộ lọc" : ""}
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Tổng đơn hàng"
          value={totalOrders.toLocaleString("vi-VN")}
          sub="toàn bộ đơn đã tạo"
          icon={ShoppingBag}
        />
        <StatCard
          label="Đã thanh toán"
          value={String(paidAgg._count)}
          sub={`${formatVnd(Number(paidAgg._sum.total ?? 0))}đ doanh thu`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Chờ xử lý"
          value={String(pendingCount)}
          sub="đơn chưa thanh toán xong"
          icon={Clock}
        />
        <StatCard
          label="Hôm nay"
          value={String(todayAgg._count)}
          sub={`${formatVnd(Number(todayAgg._sum.total ?? 0))}đ đã thanh toán`}
          icon={CalendarDays}
        />
      </div>

      <div className="mb-4">
        <AdminOrderFilters filters={filters} />
      </div>

      {/* On a phone the table was 1.012px wide in a 348px scroller: the owner
          saw the code and the customer, and "Thành tiền" and "Trạng thái" sat
          350-570px to the right. One card per order instead, with the four
          things a phone visit is for — who, what, how much, paid or not. */}
      <div className="admin-list flex flex-col gap-2 sm:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center text-zinc-500">
            {filtered ? "Không có đơn nào khớp bộ lọc" : "Chưa có đơn hàng nào"}
          </p>
        ) : (
          rows.map(({ o, discounted, login }) => (
            <article key={o.code} className="rounded-xl border border-zinc-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-zinc-900">{o.code}</span>
                  <span className="block text-[11px] tabular-nums text-zinc-400">
                    {dayStamp(o.createdAt)}
                  </span>
                </div>
                <Chip tone={STATUS_TONE[o.status] ?? "zinc"}>
                  {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                </Chip>
              </div>
              <Link href={`/admin/users/${o.user.uid}`} className="mt-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                  {o.user.avatarUrl ? (
                    <Image
                      src={o.user.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden className="text-[13px] font-semibold text-zinc-500">
                      {o.user.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-zinc-800">{o.user.username}</span>
                  <span className="text-[11px] tabular-nums text-zinc-400">UID {o.user.uid}</span>
                </span>
              </Link>
              <p
                title={o.product.name ?? o.product.code}
                className="mt-3 truncate text-[13px] font-semibold text-zinc-800"
              >
                {sentenceCase(o.product.name ?? o.product.code)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-mono text-[11px] text-zinc-400">#{o.product.code}</span>
                {login.state === "ready" ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
                    <KeyRound size={10} /> Đã giao TK tự động
                  </span>
                ) : login.state === "pending" ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-600">
                    <KeyRound size={10} /> Chưa nhập TK
                  </span>
                ) : null}
                <RevealNote order={o} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                <div className="flex flex-col">
                  {discounted ? (
                    <span className="text-[11px] tabular-nums text-zinc-400 line-through">
                      {formatVnd(Number(o.listPrice))}đ
                    </span>
                  ) : null}
                  <span className="text-base font-bold tabular-nums text-zinc-900">
                    {formatVnd(Number(o.total))}đ
                  </span>
                </div>
                <Link
                  href={productHref(o.product.category.slug, o.product.slug)}
                  className="press inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Eye size={14} /> Xem sản phẩm
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="admin-list hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200">
              {[
                "Mã đơn & Thời gian",
                "Khách hàng",
                "Sản phẩm",
                "Thành tiền",
                "Trạng thái",
                "",
              ].map((h, index) => (
                <th
                  key={h || `actions-${index}`}
                  className={`whitespace-nowrap px-5 py-3 text-left text-[12.5px] font-semibold text-zinc-500 ${
                    index === 5 ? STICKY_ACTIONS : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-zinc-500">
                  {filtered ? "Không có đơn nào khớp bộ lọc" : "Chưa có đơn hàng nào"}
                </td>
              </tr>
            ) : (
              rows.map(({ o, discounted, login }) => {
                return (
                  <tr
                    key={o.code}
                    className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/70"
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-zinc-900">{o.code}</span>
                        <span className="mt-0.5 text-[11px] tabular-nums text-zinc-400">
                          {dayStamp(o.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {/* Straight to the customer's own page — the moderation
                          trail an order question usually needs next. */}
                      <Link href={`/admin/users/${o.user.uid}`} className="group flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                          {o.user.avatarUrl ? (
                            <Image
                              src={o.user.avatarUrl}
                              alt=""
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span aria-hidden className="text-[13px] font-semibold text-zinc-500">
                              {o.user.username.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-bold text-zinc-800 underline-offset-4 transition-colors group-hover:text-zinc-900 group-hover:underline">
                            {o.user.username}
                          </span>
                          <span className="text-[11px] tabular-nums text-zinc-400">
                            UID {o.user.uid}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex max-w-[280px] flex-col items-start gap-1">
                        <span
                          title={o.product.name ?? o.product.code}
                          className="w-full truncate text-[13px] font-semibold text-zinc-800"
                        >
                          {sentenceCase(o.product.name ?? o.product.code)}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          #{o.product.code}
                        </span>
                        {/* Whether the account's sign-in went out with the
                            order. Every account hands it over by itself now
                            (no more in-person handover, the owner 08/10/2026),
                            so one sold before the shop typed its sign-in is
                            the desk's to-do: the buyer is told it is coming. */}
                        {login.state === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
                            <KeyRound size={10} />
                            Đã giao TK tự động
                          </span>
                        ) : login.state === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-600">
                            <KeyRound size={10} />
                            Chưa nhập TK
                          </span>
                        ) : null}
                        <RevealNote order={o} />
                      </div>
                    </td>
                    {/* One money cell: the strike-through list price and the
                        voucher only step in on the rare discounted order. */}
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex flex-col">
                        {discounted ? (
                          <span className="text-[11px] tabular-nums text-zinc-400 line-through">
                            {formatVnd(Number(o.listPrice))}đ
                          </span>
                        ) : null}
                        <span className="text-sm font-bold tabular-nums text-zinc-900">
                          {formatVnd(Number(o.total))}đ
                        </span>
                        {discounted ? (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                            −{String(o.discountPct).replace(".", ",")}%
                            {o.voucher ? (
                              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700">
                                {o.voucher.code}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Chip tone={STATUS_TONE[o.status] ?? "zinc"}>
                        {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                      </Chip>
                    </td>
                    <td className={`px-5 py-3 text-right ${STICKY_ACTIONS}`}>
                      {/* Goes to the account that was sold. There is no separate
                          order-detail screen, and every field an order has is
                          already on this row — what the admin cannot see from
                          here is the product itself. */}
                      <Link
                        href={productHref(o.product.category.slug, o.product.slug)}
                        title={`Xem sản phẩm #${o.product.code}`}
                        aria-label={`Xem sản phẩm #${o.product.code}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <Eye size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12px] tabular-nums text-zinc-500">
          {matching === 0
            ? "Không có đơn nào"
            : `Hiển thị ${range.from}–${range.to} / ${matching.toLocaleString("vi-VN")} đơn hàng`}
        </p>
        <Pager page={page} totalPages={totalPages} hrefOf={pageHref} label="Phân trang đơn hàng" />
      </div>
    </AdminChrome>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
}) {
  const idle = value === "0" || value === "0đ";
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-zinc-500">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`min-w-0 break-all text-[20px] font-bold leading-none tabular-nums sm:text-[24px] ${
          idle ? "text-zinc-400" : "text-zinc-900"
        }`}
      >
        {value}
      </span>
      <span className="text-[11.5px] text-zinc-400">{sub}</span>
    </div>
  );
}
