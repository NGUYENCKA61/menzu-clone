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
  /** "Hôm nay", "Hôm qua" or "28/09/2026": the day heading it sits under. */
  group: string;
  /** "15:48": the time alone, for a card under its day's heading. */
  clock: string;
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
  /** Where "Đánh giá" leads — in the receipt — while the order is one worth asking about. */
  review: { href: string; reviewed: boolean } | null;
  /** Order code, product code, name and rank: what a buyer has to hand. */
  haystack: string[];
}

/*
 * The panel, the search box, "Bộ Lọc" (sort, status, from/to) and the pager
 * are menzu's /orders, measured off the live page, as on /transactions. The
 * cards are this shop's own again (30/09/2026 — the owner's capture of the
 * old list: "sắp lại thời gian theo kiểu này", then "đồng bộ về kích cỡ"):
 * grouped under one line per day while the list reads in time order.
 *
 * The card is menzu's layout at the site's sizes (the owner: "còn cách nào
 * theo style menzu mà vẫn đồng bộ không", then "thử đi"), toned down after
 * "nhìn nó có rối hay AI quá không" → "thử b": the 16:9 picture at 144px,
 * the name 16px on two lines, one quiet line of facts in the page's own
 * font, and the price column behind a hairline — the price in white and an
 * outline "Chi tiết". menzu's white button, green price, "GIÁ MUA" label and
 * mono facts made three loud colours and a row of capitals on every card.
 * 1bba475 is the louder version, c6bdb46 the compact card. The whole card
 * opens the receipt, which stays untouched.
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

/**
 * The visible cards cut into runs of one day — in time order only: sorted by
 * price the days interleave, and a heading over every card would be noise.
 * Cut per page, so a day split across two pages gets its heading on each.
 */
function dayRuns(cards: OrderCardView[], byDay: boolean) {
  const runs: { group: string | null; cards: OrderCardView[] }[] = [];
  for (const card of cards) {
    const group = byDay ? card.group : null;
    const last = runs[runs.length - 1];
    if (last && last.group === group) last.cards.push(card);
    else runs.push({ group, cards: [card] });
  }
  return runs;
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
  // Days head the list only while it reads in time order.
  const byDay = sort === "newest" || sort === "oldest";
  // A day's count is the whole day's, not the part of it on this page.
  const perDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of filtered) counts.set(order.group, (counts.get(order.group) ?? 0) + 1);
    return counts;
  }, [filtered]);

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
            Bấm vào đơn để xem key hoặc tài khoản đăng nhập.
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
              placeholder="Tìm mã đơn, tên sản phẩm…"
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

            <div className="flex flex-col gap-5">
              {visible.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-neutral-500 text-sm">Không tìm thấy đơn hàng nào khớp.</p>
                </div>
              ) : (
                dayRuns(visible, byDay).map((run) => (
                  <div
                    key={`${run.group ?? "all"}-${run.cards[0]!.detail.code}`}
                    className="flex flex-col gap-3"
                  >
                    {run.group ? (
                      // The day once, over its orders: the same date on every
                      // card was the noisiest thing on the page.
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {run.group}
                        </span>
                        <span aria-hidden className="h-px flex-1 bg-white/[0.07]" />
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                          {perDay.get(run.group) ?? run.cards.length} đơn hàng
                        </span>
                      </div>
                    ) : null}
                    {run.cards.map((order) => {
                      const struck = order.status === "REFUNDED" || order.status === "CANCELLED";
                      return (
                        // The whole card is the receipt's trigger; the review
                        // tag inside it is a link of its own and goes where it
                        // points.
                        <OrderDetailModal
                          key={order.detail.code}
                          order={order.detail}
                          autoOpen={order.autoOpen}
                          supportHref={order.supportHref}
                          refundHref={order.refundHref}
                          reviewHref={order.review?.href ?? null}
                          className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-3.5 outline-none transition-colors hover:border-white/20 hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 sm:flex-row sm:items-center sm:gap-5 sm:p-4"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-5">
                            {/* menzu's 16:9 picture at 144px (theirs is 192),
                                so the art is not cropped; the site's 96×64 on a
                                phone, beside the text rather than across it. */}
                            <div className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-neutral-900 sm:aspect-video sm:w-36 sm:rounded-xl">
                              {order.imageUrl ? (
                                <Image
                                  src={order.imageUrl}
                                  alt={order.title}
                                  fill
                                  sizes="(min-width: 640px) 288px, 192px"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : null}
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              {/* 16px on up to two lines, where menzu's 20px on
                                  one cut the long names short. */}
                              <h3 className="line-clamp-2 text-sm font-black leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)] sm:text-base">
                                {order.title}
                              </h3>
                              {/* The facts on one quiet line in the page's own
                                  font. The time alone under its day's heading,
                                  the whole stamp when a price sort drops the
                                  headings. Each fact holds together, so a
                                  narrow card breaks the line at a " · ", never
                                  between "Gói" and "30 ngày". */}
                              <p className="text-[11px] tabular-nums text-neutral-400 sm:text-xs">
                                <span className="whitespace-nowrap">
                                  <span className="text-neutral-500">Mã đơn</span> {order.detail.code}
                                </span>
                                {" · "}
                                <span className="whitespace-nowrap">
                                  {byDay ? order.clock : order.stamp}
                                </span>
                                {order.chip ? (
                                  <>
                                    {" · "}
                                    <span className="whitespace-nowrap">
                                      <span className="text-neutral-500">{order.isSoftware ? "Gói" : "Hạng"}</span>{" "}
                                      {order.chip}
                                      {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                              {/* The status, only when there is something to
                                  know. "Đánh giá" moved into the receipt
                                  (30/09/2026: "bỏ cái đánh giá ngoài card đi"). */}
                              {order.badge ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span
                                    className={`${order.badge.tone} rounded border px-2 py-1 text-[9px] font-black uppercase tracking-widest sm:text-[10px]`}
                                  >
                                    {order.badge.label}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* menzu's price column behind a hairline — beside the
                              card from sm up, under it on a phone. */}
                          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/5 pt-3 sm:flex-col sm:items-end sm:justify-center sm:gap-2.5 sm:border-t-0 sm:border-l sm:border-white/10 sm:pt-0 sm:pl-5">
                            {/* White, not menzu's green: what was paid, said
                                plainly. No "GIÁ MUA" over it — it is plainly
                                the price. */}
                            <p
                              className={`text-base font-black tabular-nums ${
                                struck ? "text-neutral-500 line-through" : "text-white"
                              }`}
                            >
                              {money(order.total)}
                            </p>
                            {/* menzu's white button as a tint of it: clearer
                                than the outline it replaced ("thử cách 2"), far
                                quieter than solid white, which on every card
                                out-shouted the names. The card around it is
                                what opens the receipt. */}
                            <span className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-white/10 px-3 text-xs font-bold text-white transition-colors group-hover:bg-white/20 sm:h-9 sm:px-3.5">
                              Chi tiết
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          </div>
                        </OrderDetailModal>
                      );
                    })}
                  </div>
                ))
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
