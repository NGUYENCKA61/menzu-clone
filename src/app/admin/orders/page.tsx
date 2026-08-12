import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminOrderFilters } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOrderFilters";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
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
import { pageCount, pageRange, pageWindow, parsePage } from "@/lib/paging";
import { orderWhere } from "@/lib/orderStore";

export const metadata: Metadata = { title: "Menzu Admin | Đơn hàng" };
export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/30",
  REFUNDED: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
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
  const matching = await db.order.count({ where });
  const totalPages = pageCount(matching, ORDERS_PER_PAGE);
  const page = parsePage(typeof raw.page === "string" ? raw.page : undefined, totalPages);
  const range = pageRange(page, ORDERS_PER_PAGE, matching);

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ORDERS_PER_PAGE,
    take: ORDERS_PER_PAGE,
    include: {
      user: { select: { username: true, uid: true } },
      product: { select: { code: true } },
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
              orders.map((o) => (
                <tr key={o.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">{o.code}</span>
                      <span className="text-[11px] text-neutral-500">
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
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-200">
                        {o.user.username}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        UID {o.user.uid}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-white">
                    #{o.product.code}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">
                    {ORDER_METHOD_LABELS[o.method as OrderMethod] ?? o.method}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-neutral-500 line-through">
                        {formatVnd(Number(o.listPrice))}đ
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        −{o.discountPct}%
                        {o.voucher ? ` · ${o.voucher.code}` : ""}
                      </span>
                    </div>
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
                      href={`/account/${o.product.code}`}
                      title={`Xem sản phẩm #${o.product.code}`}
                      className="inline-flex h-8 items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))
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

            {pageWindow(page, totalPages).map((n: number) => (
              <PageLink key={n} href={pageHref(n)} current={n === page} label={`Trang ${n}`}>
                {n}
              </PageLink>
            ))}

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
