"use client";

import { ChevronRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useMemo, useRef, useState } from "react";

import {
  FilterDate,
  FilterSelect,
  ListPager,
  ListToolbar,
  normalise,
  scrollPanelTop,
} from "./AccountListChrome";
import { OrderDetailModal, type OrderDetailData } from "./OrderDetailModal";
import { OrderReviewTag } from "./OrderReview";
import { formatVnd } from "./productData";

export interface OrderCardView {
  /** What the receipt shows when the card is pressed. */
  detail: OrderDetailData;
  /** Open this one's receipt on arrival (`?don=<mã đơn>`). */
  autoOpen: boolean;
  supportHref: string;
  refundHref: string;
  /** The product's name for a tool, "#CODE" for an account. */
  title: string;
  /** The tier bought (a tool) or the rank (an account), when there is one. */
  chip: string | null;
  isSoftware: boolean;
  quantity: number;
  imageUrl: string | null;
  /** "15:48 - 28/09/2026", written on the server in the shop's clock. */
  stamp: string;
  /** "2026-09-28", the shop-clock day the date filters compare. */
  day: string;
  /** Milliseconds, for the oldest-first sort. */
  at: number;
  total: number;
  /** PAID · PENDING · CANCELLED · REFUNDED */
  status: string;
  /**
   * The pill: the order's state, or the answer the buyer is waiting on.
   * None on a paid order with nothing pending — that is every order.
   */
  badge: { label: string; tone: string } | null;
  /** Where "Đánh giá" leads, while the order is one worth asking about. */
  review: { href: string; reviewed: boolean } | null;
  /** Order code, product code, name and rank: what a buyer has to hand. */
  haystack: string[];
}

/*
 * menzu's /orders, measured off the live page: the panel with its title, the
 * search box and "Bộ Lọc" (sort, status, from/to), one card per order with
 * its picture, code, time, status pill, price and a white "Chi tiết", and
 * the pager. menzu's indigo is the shop's accent; its green is money paid.
 * The card opens this shop's own receipt rather than a page of its own, and
 * keeps the review tag and the refund and warranty states menzu does not
 * have.
 */

const PAGE_SIZE = 10;

const SORTS: Record<string, (a: OrderCardView, b: OrderCardView) => number> = {
  newest: (a, b) => b.at - a.at,
  oldest: (a, b) => a.at - b.at,
  price_high: (a, b) => b.total - a.total,
  price_low: (a, b) => a.total - b.total,
};

function money(value: number): string {
  return `${formatVnd(value)} ₫`;
}

export function OrdersList({ orders }: { orders: OrderCardView[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = normalise(query.trim());
    return orders
      .filter(
        (order) =>
          (!needle || order.haystack.some((value) => normalise(value).includes(needle))) &&
          (status === "ALL" ||
            (status === "COMPLETED" ? order.status === "PAID" : order.status === status)) &&
          (!from || order.day >= from) &&
          (!to || order.day <= to),
      )
      .sort(SORTS[sort] ?? SORTS.newest);
  }, [orders, query, sort, status, from, to]);

  const filtering = sort !== "newest" || status !== "ALL" || Boolean(from) || Boolean(to);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamped rather than reset by effect: a narrowing filter shrinks pageCount
  // and the view just follows.
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Every filter change starts reading from the first page.
  const refilter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(0);
  };

  return (
    <div
      ref={top}
      className="scroll-mt-28 w-full bg-[#111111] border border-white/5 rounded-2xl sm:rounded-[24px] p-4 sm:p-8 lg:p-10 relative min-h-[750px]"
    >
      <div className="flex flex-col gap-6 relative z-10">
        <div className="mb-2 relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <ShoppingBag size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
            Lịch sử mua hàng
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Danh sách các đơn bạn đã thanh toán, kèm key hoặc tài khoản đăng nhập.
          </p>
        </div>

        {orders.length === 0 ? (
          // A buyer with no orders at all is not a search that missed.
          <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-neutral-400 text-sm">Chưa có đơn hàng nào.</p>
            <p className="mt-1 text-neutral-500 text-xs">Bạn chưa mua sản phẩm nào trên hệ thống.</p>
            <Link
              href="/categories"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-neutral-200"
            >
              Mua ngay
            </Link>
          </div>
        ) : (
          <>
            <ListToolbar
              tone="accent"
              query={query}
              onQuery={refilter(setQuery)}
              placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
              filtering={filtering}
              onClear={() => {
                setSort("newest");
                setStatus("ALL");
                setFrom("");
                setTo("");
                setPage(0);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <FilterSelect
                  tone="accent"
                  label="Sắp xếp"
                  value={sort}
                  onChange={refilter(setSort)}
                  options={[
                    ["newest", "Mới nhất"],
                    ["oldest", "Cũ nhất"],
                    ["price_high", "Giá: Cao → Thấp"],
                    ["price_low", "Giá: Thấp → Cao"],
                  ]}
                />
                <FilterSelect
                  tone="accent"
                  label="Trạng thái"
                  value={status}
                  onChange={refilter(setStatus)}
                  options={[
                    ["ALL", "Tất cả"],
                    ["COMPLETED", "Hoàn thành"],
                    ["REFUNDED", "Đã hoàn tiền"],
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FilterDate tone="accent" label="Từ ngày" value={from} onChange={refilter(setFrom)} />
                <FilterDate tone="accent" label="Đến ngày" value={to} onChange={refilter(setTo)} />
              </div>
            </ListToolbar>

            <div className="flex flex-col gap-4">
              {visible.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-neutral-500 text-sm">Không tìm thấy đơn hàng nào khớp.</p>
                </div>
              ) : (
                visible.map((order) => {
                  const struck = order.status === "REFUNDED" || order.status === "CANCELLED";
                  return (
                    // The whole card is the receipt's trigger; the review tag
                    // inside it is a link of its own and goes where it points.
                    <OrderDetailModal
                      key={order.detail.code}
                      order={order.detail}
                      autoOpen={order.autoOpen}
                      supportHref={order.supportHref}
                      refundHref={order.refundHref}
                      className="bg-neutral-950/50 border border-white/10 rounded-2xl p-3.5 sm:p-5 hover:border-white/20 hover:bg-neutral-900 transition-all duration-300 group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60"
                    >
                      <div className="relative w-full sm:w-48 aspect-[16/10] sm:aspect-video rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5">
                        {order.imageUrl ? (
                          <Image
                            src={order.imageUrl}
                            alt={order.title}
                            fill
                            sizes="(min-width: 640px) 192px, 100vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : null}
                      </div>

                      <div className="flex-1 w-full min-w-0 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div className="flex flex-1 min-w-0 flex-col justify-center">
                          <h3 className="text-base sm:text-xl font-black text-white truncate group-hover:text-[var(--menzu-accent)] transition-colors leading-tight mb-1 sm:mb-2">
                            {order.title}
                          </h3>
                          <div className="hidden sm:flex flex-col gap-1.5 mb-3">
                            <p className="text-xs font-mono text-neutral-400 truncate flex items-center gap-2">
                              <span className="text-neutral-500">Mã đơn:</span>#{order.detail.code}
                            </p>
                            <p className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                              <span className="text-neutral-500">Thời gian:</span>
                              {order.stamp}
                            </p>
                            {order.chip ? (
                              <p className="text-xs font-mono text-neutral-400 truncate flex items-center gap-2">
                                <span className="text-neutral-500">{order.isSoftware ? "Gói:" : "Hạng:"}</span>
                                {order.chip}
                                {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                              </p>
                            ) : null}
                          </div>
                          {/* Kept on a phone too, unlike menzu's: the status
                              and the way to the review are the two things a
                              buyer comes back to this list for. */}
                          {order.badge || order.review ? (
                            <div className="flex items-center gap-2">
                              {order.badge ? (
                                <span
                                  className={`${order.badge.tone} px-2 py-1 rounded border uppercase tracking-widest font-black text-[9px] sm:text-[10px]`}
                                >
                                  {order.badge.label}
                                </span>
                              ) : null}
                              {order.review ? (
                                <OrderReviewTag href={order.review.href} reviewed={order.review.reviewed} />
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="w-full sm:w-auto flex flex-row items-center justify-between sm:flex-col sm:justify-center sm:items-end gap-2 sm:gap-4 sm:pl-6 sm:border-l border-white/10 shrink-0">
                          <div className="text-left sm:text-right min-w-0">
                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-0.5">
                              Giá mua
                            </p>
                            <p
                              className={`text-base sm:text-xl font-black truncate ${
                                struck ? "text-neutral-500 line-through" : "text-emerald-400"
                              }`}
                            >
                              {money(order.total)}
                            </p>
                          </div>
                          {/* Drawn as menzu's button; the card around it is
                              what opens the receipt. */}
                          <span className="shrink-0 px-4 py-2 sm:px-6 sm:py-3 bg-white text-black font-black uppercase tracking-wide text-xs sm:text-sm rounded-xl group-hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                            Chi tiết
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
                          </span>
                        </div>
                      </div>
                    </OrderDetailModal>
                  );
                })
              )}
            </div>

            <ListPager
              page={current}
              pageCount={pageCount}
              onSelect={(next) => {
                setPage(next);
                scrollPanelTop(top.current);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
