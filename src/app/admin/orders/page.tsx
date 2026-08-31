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
  Repeat,
  ShoppingBag,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AdminOrderFilters } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOrderFilters";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { currentOrderIdOf, loginHandover, tagOf } from "@/lib/accountLogin";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  hasOrderFilters,
  ORDER_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  ORDERS_PER_PAGE,
  parseOrderFilters,
  type OrderMethod,
  type OrderStatus,
} from "@/lib/orders";
import { productHref } from "@/lib/routes";
import { GAP, pageCount, pageRange, pageStrip, parsePage } from "@/lib/paging";
import { orderWhere } from "@/lib/orderStore";
import { startOfDayVn } from "@/lib/time";

export const metadata: Metadata = { title: "Đơn hàng | Quản trị" };
export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/30",
  REFUNDED: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
};

/** The little glyph beside each payment method. */
const METHOD_ICON: Record<string, LucideIcon> = {
  BUY_NOW: Zap,
  DEPOSIT: Wallet,
  TRADE_IN: Repeat,
  PAY_LATER: Clock,
};

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
          slug: true,
          productType: true,
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
          tags: { select: { label: true }, take: 1 },
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

  return (
    <AdminShell
      title="Đơn hàng"
      subtitle="Quản lý toàn bộ đơn hàng trên hệ thống"
      username={admin.username}
      aside={
        <span className="text-[13px] text-neutral-500 tabular-nums">
          {matching.toLocaleString("vi-VN")} đơn hàng
          {filtered ? " khớp bộ lọc" : ""}
        </span>
      }
    >
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng đơn hàng"
          value={totalOrders.toLocaleString("vi-VN")}
          sub="toàn bộ đơn đã tạo"
          icon={ShoppingBag}
          tint="border-indigo-500/25 bg-indigo-500/10 text-indigo-400"
        />
        <StatCard
          label="Đã thanh toán"
          value={String(paidAgg._count)}
          sub={`${formatVnd(Number(paidAgg._sum.total ?? 0))}đ doanh thu`}
          icon={CircleDollarSign}
          tint="border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Chờ xử lý"
          value={String(pendingCount)}
          sub="đơn chưa thanh toán xong"
          icon={Clock}
          tint="border-amber-500/25 bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Hôm nay"
          value={String(todayAgg._count)}
          sub={`${formatVnd(Number(todayAgg._sum.total ?? 0))}đ đã thanh toán`}
          icon={CalendarDays}
          tint="border-violet-500/25 bg-violet-500/10 text-violet-400"
        />
      </div>

      <div className="mb-5">
        <AdminOrderFilters filters={filters} />
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e0e11]">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {[
                "Mã đơn & Thời gian",
                "Khách hàng",
                "Sản phẩm",
                "Hình thức",
                "Giá gốc & Giảm",
                "Thành tiền",
                "Trạng thái",
                "",
              ].map((h, index) => (
                <th
                  key={h || `actions-${index}`}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center text-neutral-400">
                  {filtered
                    ? "Không có đơn nào khớp bộ lọc"
                    : "Chưa có đơn hàng nào"}
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const MethodIcon = METHOD_ICON[o.method];
                const discounted = o.discountPct > 0 || o.voucher !== null;
                const login = loginHandover(o, {
                  ...o.product,
                  currentOrderId: currentOrderIdOf(o.product),
                  tag: tagOf(o.product),
                });
                return (
                <tr
                  key={o.code}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.015]"
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-black text-white">{o.code}</span>
                      <span className="mt-0.5 text-[11px] text-neutral-500 tabular-nums">
                        {o.createdAt.toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {/* Straight to the customer's own page — the moderation
                        trail an order question usually needs next. */}
                    <Link
                      href={`/admin/users/${o.user.uid}`}
                      className="group flex items-center gap-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900">
                        {o.user.avatarUrl ? (
                          <Image
                            src={o.user.avatarUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="text-[11px] font-black uppercase text-neutral-500"
                          >
                            {o.user.username.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-neutral-200 group-hover:text-rose-400 transition-colors">
                          {o.user.username}
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">
                          UID {o.user.uid}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono text-xs font-bold text-white">
                        #{o.product.code}
                      </span>
                      {/* How the account reached its buyer: by itself (NFA
                          with a sign-in on the row) or by the shop's hand.
                          Neither is a to-do — the buyer gets in touch. */}
                      {login.state === "ready" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <KeyRound size={10} />
                          Đã giao TK tự động
                        </span>
                      ) : login.state === "manual" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                          <KeyRound size={10} />
                          Bàn giao tay
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                      {MethodIcon ? <MethodIcon size={13} className="shrink-0 text-neutral-500" /> : null}
                      {ORDER_METHOD_LABELS[o.method as OrderMethod] ?? o.method}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {discounted ? (
                      <div className="flex flex-col">
                        <span className="text-[11px] text-neutral-500 line-through tabular-nums">
                          {formatVnd(Number(o.listPrice))}đ
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                          −{String(o.discountPct).replace(".", ",")}%
                          {o.voucher ? (
                            <span className="rounded border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                              {o.voucher.code}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-black text-rose-500 tabular-nums whitespace-nowrap">
                    {formatVnd(Number(o.total))}đ
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                        STATUS_CLASS[o.status] ??
                        "text-neutral-400 bg-white/5 border-white/10"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {/* Goes to the account that was sold. There is no separate
                        order-detail screen, and every field an order has is
                        already on this row — what the admin cannot see from
                        here is the product itself. */}
                    <Link
                      href={productHref(o.product.category.slug, o.product.slug)}
                      title={`Xem sản phẩm #${o.product.code}`}
                      aria-label={`Xem sản phẩm #${o.product.code}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-400 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
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
        <p className="text-[12px] text-neutral-500 tabular-nums">
          {matching === 0
            ? "Không có đơn nào"
            : `Hiển thị ${range.from}–${range.to} / ${matching.toLocaleString("vi-VN")} đơn hàng`}
        </p>

        {totalPages > 1 ? (
          <nav aria-label="Phân trang đơn hàng" className="flex items-center gap-1.5">
            <PageLink
              href={pageHref(page - 1)}
              disabled={page === 1}
              label="Trang trước"
            >
              ‹
            </PageLink>

            {pageStrip(page, totalPages).map((n, index) =>
              n === GAP ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden
                  className="px-1 text-[12px] text-neutral-700"
                >
                  {GAP}
                </span>
              ) : (
                <PageLink key={n} href={pageHref(n)} current={n === page} label={`Trang ${n}`}>
                  {n}
                </PageLink>
              ),
            )}

            <PageLink
              href={pageHref(page + 1)}
              disabled={page === totalPages}
              label="Trang sau"
            >
              ›
            </PageLink>
          </nav>
        ) : null}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
}) {
  const idle = value === "0" || value === "0đ";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}>
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
      <span className="text-[11px] text-neutral-500">{sub}</span>
    </div>
  );
}

function PageLink({
  href,
  children,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const shape =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors";

  // Rendered as a span rather than a disabled link, so the arrow at either end
  // is not something a keyboard can tab onto and press to no effect.
  if (disabled) {
    return (
      <span
        aria-hidden
        className={`${shape} border-white/[0.06] text-neutral-700 cursor-default`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${shape} ${
        current
          ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
          : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
