"use client";

import { ChevronRight, ShoppingBag } from "lucide-react";
import { sentenceCase } from "@/lib/displayCase";
import Image from "next/image";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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
 * The card itself is the account area's lighter inner card (white at 2%),
 * as the receipt's blocks and the other account pages draw theirs — menzu's
 * darker card was the one surface out of step.
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

/** "280.000đ", the way every price on the site is written. */
function money(value: number): string {
  return `${formatVnd(value)}đ`;
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

/*
 * LAB TRIAL (the owner, 20/10/2026: "mỗi cái thử 6s đi chạy", then "10s"):
 * the order-card ideas from the review, side by side in time. /orders?thu=xoay
 * shows each for 10 seconds with a badge naming it; ?thu=<id> pins one.
 * Development only: a production build always draws the first, today's card.
 */
type CardLook = {
  id: string;
  name: string;
  card: string;
  thumb: string;
  title: string;
  price: string;
  chip: string;
  button: string;
  chevron?: boolean;
  /** A ">" after the words Chi tiết. */
  arrow?: boolean;
  /** The picture's classes when they differ from the default. */
  img?: string;
};
const CHIP_RAISE = "rounded-md border border-line-strong bg-raise px-2 py-0.5 text-[12px] font-medium text-frost/90";
const CHIP_NEUTRAL = "rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[12px] font-medium text-frost/90";
const BUTTON_RAISE = "flex h-9 shrink-0 items-center whitespace-nowrap rounded-[10px] bg-raise px-3.5 text-[13px] font-semibold text-frost ring-1 ring-inset ring-line transition-colors group-hover:ring-line-strong";
const BUTTON_LIT = "flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] bg-white/[0.08] pl-3.5 pr-2.5 text-[13px] font-semibold text-frost ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-white/[0.12] group-hover:ring-white/20";
const BUTTON_RAISE_LIT = "flex h-9 shrink-0 items-center whitespace-nowrap rounded-[10px] bg-raise px-3.5 text-[13px] font-semibold text-frost ring-1 ring-inset ring-line transition-colors group-hover:bg-white/10 group-hover:ring-white/20";
const BUTTON_RAISE_LIT_ARROW = "flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] bg-raise pl-3.5 pr-2.5 text-[13px] font-semibold text-frost ring-1 ring-inset ring-line transition-colors group-hover:bg-white/10 group-hover:ring-white/20";
const BUTTON_WHITE = "flex h-9 shrink-0 items-center whitespace-nowrap rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-black transition-colors group-hover:bg-neutral-200";
const LOOKS: CardLook[] = [
  { id: "4", name: "Đang dùng: thẻ 3 dòng", card: "border-white/10 hover:border-line-strong", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE },
  { id: "1+2", name: "Viền 15%, nút Chi tiết sáng có mũi tên", card: "border-white/15 hover:border-white/25 hover:bg-white/[0.02]", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_NEUTRAL, button: BUTTON_LIT },
  { id: "3", name: "Tô nền thẻ 3%", card: "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE },
  { id: "6", name: "Mũi tên thay nút Chi tiết", card: "border-white/10 hover:border-line-strong", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE, chevron: true },
  { id: "8", name: "Thẻ tối hơn khung", card: "border-white/10 bg-black/30 hover:border-white/20", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE },
  { id: "9", name: "Ảnh, tên, giá to hơn", card: "border-white/10 hover:border-line-strong", thumb: "sm:w-[168px]", title: "sm:text-[18px]", price: "text-[19px]", chip: CHIP_RAISE, button: BUTTON_RAISE },
  { id: "12", name: "Hiệu ứng khi rê chuột", card: "border-white/10 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE_LIT, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "17", name: "Hiệu ứng khi rê chuột, Chi tiết có dấu >", card: "border-white/10 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE_LIT_ARROW, arrow: true, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "19", name: "Như 17, nền thẻ 2%", card: "border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE_LIT_ARROW, arrow: true, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "18", name: "Như 17, nền thẻ 1%", card: "border-white/10 bg-white/[0.01] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE_LIT_ARROW, arrow: true, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "20", name: "Như 17, nền thẻ 3%", card: "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE_LIT_ARROW, arrow: true, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "15", name: "Hiệu ứng khi rê chuột, nút Chi tiết trắng", card: "border-white/10 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03] motion-reduce:hover:translate-y-0", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_WHITE, img: "object-cover brightness-[.92] transition-[filter,transform] duration-300 group-hover:scale-[1.04] group-hover:brightness-110 motion-reduce:group-hover:scale-100" },
  { id: "10", name: "Viền 20%", card: "border-white/20 hover:border-white/30", thumb: "sm:w-36", title: "sm:text-[17px]", price: "text-[17px]", chip: CHIP_RAISE, button: BUTTON_RAISE },
];

export function OrdersList({ orders }: { orders: OrderCardView[] }) {
  // LAB TRIAL: see LOOKS above.
  const params = useSearchParams();
  const thu = process.env.NODE_ENV === "production" ? null : params.get("thu");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (thu !== "xoay") return;
    const timer = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, [thu]);
  const pinned = thu && thu !== "xoay" ? LOOKS.findIndex((l) => l.id === thu) : -1;
  // The card the page draws without ?thu: today's card with a hover look, on
  // trial (the owner, 20/10/2026: "làm hiệu ứng khi rê thử"). The white Chi
  // tiết (look 15) was tried, then parked in the review page. Look 17 adds a
  // ">" after Chi tiết ("thêm dấu > sau chi tiết đi"); look 19 gives the card
  // a 2% fill on trial (after 1% was turned down, "2% đi"), look 20 a 3% one
  // that the hover lifts to 5% ("3%"), then look 18's 1% ("1%"), and in the
  // end no fill: look 17, the live card ("0%").
  const fallback = Math.max(0, LOOKS.findIndex((l) => l.id === "17"));
  const look = thu === "xoay" ? LOOKS[tick % LOOKS.length]! : LOOKS[pinned >= 0 ? pinned : fallback]!;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Opens on the page holding the order ?don= asked for, under the default
  // newest-first order: its receipt only opens if its card is drawn, and the
  // warranty page's breadcrumb now links an order of any age here (the owner,
  // 13/10/2026, UI consistency review). Page one when nothing was asked.
  const [page, setPage] = useState(() => {
    const at = [...orders].sort(SORTS.newest).findIndex((order) => order.autoOpen);
    return at < 0 ? 0 : Math.floor(at / PAGE_SIZE);
  });
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
      className="scroll-mt-28 w-full bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-[20px] p-4 sm:p-8 lg:p-10 relative min-h-[750px]"
    >
      {/* LAB TRIAL: which card idea is showing, while ?thu is set. */}
      {thu ? (
        <div className="fixed bottom-4 left-4 z-[95] rounded-xl border border-white/15 bg-black/85 px-3.5 py-2 text-[13px] font-semibold text-white shadow-xl">
          Hướng {look.id}: {look.name}
          {thu === "xoay" ? ` · ${(tick % LOOKS.length) + 1}/${LOOKS.length}, đổi sau 10 giây` : ""}
        </div>
      ) : null}
      <div className="flex flex-col gap-6 relative z-10">
        <div className="mb-2 relative z-10">
          <h1 className="mb-2 flex items-center gap-3 text-[24px] font-black leading-tight text-frost sm:text-[30px]">
            <ShoppingBag size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
            Lịch sử mua hàng
          </h1>
          <p className="text-[14px] leading-relaxed text-mist sm:text-[15px]">
            Bấm vào đơn để xem key hoặc tài khoản đăng nhập.
          </p>
        </div>

        {orders.length === 0 ? (
          // A buyer with no orders at all is not a search that missed.
          <div className="p-8 text-center border border-white/10 rounded-2xl">
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
                <div className="p-8 text-center border border-white/10 rounded-2xl">
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
                        <span className="lab-figure shrink-0 text-[15px] font-semibold text-frost">
                          {run.group}
                        </span>
                        <span aria-hidden className="h-px flex-1 bg-line" />
                        <span className="shrink-0 text-[13px] text-dim">
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
                          // Reviews are off for now (30/09/2026: "tạm thời xóa bỏ cái
                          // đánh giá đi"). To bring the receipt's button back:
                          // reviewHref={order.review?.href ?? null}
                          reviewHref={null}
                          className={`group flex cursor-pointer flex-col gap-3 rounded-2xl border p-3.5 outline-none transition-[color,background-color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 sm:flex-row sm:items-center sm:gap-5 sm:p-4 ${look.card}`}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-5">
                            {/* menzu's 16:9 picture at 144px (theirs is 192),
                                so the art is not cropped; the site's 96×64 on a
                                phone, beside the text rather than across it. */}
                            <div className={`lab-notch-sm relative aspect-[3/2] w-24 shrink-0 overflow-hidden border border-line bg-raise sm:aspect-video ${look.thumb}`}>
                              {order.imageUrl ? (
                                <Image
                                  src={order.imageUrl}
                                  alt={order.title}
                                  fill
                                  sizes="(min-width: 640px) 288px, 192px"
                                  className={look.img ?? "object-cover brightness-[.92] transition-[filter] duration-200 group-hover:brightness-110"}
                                />
                              ) : null}
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              {/* One line, cut with an ellipsis: two lines of the
                                  shelf's capitals per card made the list a wall
                                  (the owner, 16/10/2026: "có nên đổi qua dấu ...",
                                  "... được rồi"). The whole name sits in the tooltip
                                  and on the order's own page. */}
                              <h3
                                title={order.title}
                                className={`truncate font-display text-[15px] font-semibold leading-snug text-frost transition-colors group-hover:text-white ${look.title}`}
                              >
                                {sentenceCase(order.title)}
                              </h3>
                              {/* Three lines, one job each (trial, the owner,
                                  20/10/2026: "có nên cho mã đơn hoặc ngày xuống
                                  dưới mỗi cái đứng riêng", then "thử xem"): the
                                  name; the chips, the tier (a tool) or rank (an
                                  account, "cái gói 1 ngày có nên card bo như cũ")
                                  beside the status when there is one; then the
                                  code and the time. Under a day's heading only the
                                  time (it had been left off on 02/10/2026, "bỏ cái
                                  thời gian thử"; back so a day of 18 orders tells
                                  them apart); a price sort drops the headings, so
                                  the whole stamp shows there. Three lines fill the
                                  picture's height, so an order under warranty is
                                  no taller than one without. "Đánh giá" lives in
                                  the receipt (30/09/2026). */}
                              {order.chip || order.badge ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  {order.chip ? (
                                    <span className={look.chip}>
                                      {order.chip}
                                      {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                                    </span>
                                  ) : null}
                                  {order.badge ? (
                                    <span
                                      className={`${order.badge.tone} rounded-md border px-2 py-0.5 text-[12px] font-semibold`}
                                    >
                                      {order.badge.label}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              <p className="text-[13px] tabular-nums text-mist">
                                <span className="whitespace-nowrap">
                                  <span className="text-dim">Mã đơn</span> {order.detail.code}
                                </span>
                                {" · "}
                                <span className="whitespace-nowrap">
                                  {byDay ? order.clock : order.stamp}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* menzu's price column behind a hairline — beside the
                              card from sm up, under it on a phone. */}
                          <div className={`flex shrink-0 items-center justify-between gap-3 border-t border-white/5 pt-3 sm:border-t-0 sm:border-l sm:border-line sm:pt-0 sm:pl-5 ${look.chevron ? "sm:gap-4" : "sm:flex-col sm:items-end sm:justify-center sm:gap-2.5"}`}>
                            {/* White, not menzu's green: what was paid, said
                                plainly. No "GIÁ MUA" over it — it is plainly
                                the price. */}
                            <p
                              className={`lab-figure ${look.price} font-bold ${
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
                            {look.chevron ? (
                              <ChevronRight
                                size={20}
                                aria-hidden
                                className="shrink-0 text-dim transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-frost"
                              />
                            ) : (
                              <span className={look.button}>
                                Chi tiết
                                {look.arrow || look.button === BUTTON_LIT ? <ChevronRight size={14} aria-hidden /> : null}
                              </span>
                            )}
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
