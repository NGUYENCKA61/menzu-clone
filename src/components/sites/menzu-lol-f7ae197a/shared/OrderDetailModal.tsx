"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Hash,
  Info,
  KeyRound,
  Landmark,
  Lock,
  MessageCircle,
  Package,
  Receipt,
  ShieldCheck,
  Star,
  TriangleAlert,
  User,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { REVEAL_STEPS, type LoginHandover } from "@/lib/accountLogin";
import { warrantyButton, type WarrantyStatus } from "@/lib/warrantyRequests";

import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { useOverlayPresence } from "./useOverlayPresence";
import { formatVnd } from "./productData";

/**
 * Everything the receipt prints, already shaped for the screen: dates as
 * text, money as numbers, and the sign-in exactly as the order page decided
 * it. Plain data, because it crosses from the server page into this client
 * component.
 */
/**
 * One key as the receipt shows it.
 *
 * No expiry line, on purpose: a key's clock starts when the customer
 * activates it, not when they buy it, so a date computed from the sale would
 * be wrong for every key bought and kept for later.
 */
export interface OrderKeyView {
  value: string;
}

export interface OrderDetailData {
  id: string;
  code: string;
  /** The buyer already reviewed this purchase. */
  reviewed: boolean;
  /** The status pill's text and colours, decided by the page. */
  statusLabel: string;
  statusClass: string;
  /** Settled — the one status under which a handover can exist at all. */
  paid: boolean;
  /** Paid once and given back. Not the same as never paid, and the card says
   *  so where it would otherwise claim the handover is still coming. */
  refunded: boolean;
  /** "28/08/2026" — formatted by the page so both agree on the locale. */
  date: string;
  /** "14:32", the shop clock — the list shows it, so the receipt does too. */
  time?: string;
  total: number;
  /**
   * What the line was worth before any cut: the tier price for software,
   * the crossed-out shelf price for an account — which the shop may leave
   * at zero, or below the asking price, so it is only trusted when it is
   * above what was paid.
   */
  listPrice: number;
  quantity: number;
  productName: string;
  productCode: string;
  productHref: string;
  categoryName: string;
  imageUrl: string | null;
  isSoftware: boolean;
  /** An "acc random" order: every key is a sign-in, "user|pass". */
  isPool: boolean;
  packageLabel: string | null;
  productRank: string;
  /** Software: the licence keys handed over, and how many are still owed. */
  keys: OrderKeyView[];
  keysPending: number;
  /** Software: the installer and the manual. Null hides that one button;
   *  null for both leaves the keys the full width they had before. */
  downloadUrl: string | null;
  docsUrl: string | null;
  /** Accounts: the sign-in, or the word that the shop hands it over itself. */
  login: LoginHandover;
  /** Accounts: a sign-in waiting behind "Lấy thông tin", not yet taken. */
  loginLocked: boolean;
  /** When the buyer took it, "15:48 08/10/2026"; null before. */
  loginRevealedAt: string | null;
  /**
   * The order's newest warranty ticket, or null. The footer's one button
   * follows it (warrantyButton): "Yêu cầu bảo hành", then "Xem trạng thái",
   * or "Nhập số tài khoản" while a bank refund waits on the buyer.
   */
  warranty: { status: WarrantyStatus; needsBank: boolean } | null;
}

/*
 * Every class below is one the account area already speaks — the ledger
 * rows, the "Đơn hàng của bạn" frame, the wallet buttons — so the receipt
 * reads as a page of this site rather than a sketch pasted over it. Two
 * radii (xl for blocks, 2xl for the card), one label style, the row's own
 * status chip, and the primary/ghost button pair from the account pages.
 */
const LABEL =
  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-500";
const GHOST_BTN =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white";
const CELL =
  "border-t border-white/[0.06] px-4 py-4 text-sm text-neutral-200 sm:px-5";
/** "280.000đ", like the /orders list, /transactions and every price on the site. */
function money(value: number): string {
  return `${formatVnd(value)}đ`;
}
/**
 * One value with its copy button. A password reads in the clear like the
 * rest (the owner, 09/10/2026: "phần mật khẩu khỏi ẩn mà cho hiện luôn"): the
 * buyer took it on camera through "Lấy thông tin", so a mask and a "Hiện"
 * button only stood between them and typing it in.
 */
function HandoverBox({
  label,
  icon,
  value,
}: {
  label: string;
  icon: ReactNode;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Refused clipboard: leave the value selected, so one Ctrl+C finishes
      // what the button could not.
      requestAnimationFrame(() => {
        const node = valueRef.current;
        const selection = window.getSelection();
        if (!node || !selection) return;
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      });
    }
  }

  const name = label.toLowerCase();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12]">
      <span className={`${LABEL} mb-2`}>
        {icon}
        {label}
      </span>
      {/* Value above the buttons on a phone; the pair would otherwise leave
          the value a few characters of room. */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span
          ref={valueRef}
          // Wrapped, not cut: a long key read "…5T8W3…" on a phone, and the
          // buyer could copy it but not read it through (the owner, 09/10/2026).
          className="min-w-0 max-w-full break-all font-mono text-sm font-bold tracking-wide text-white"
        >
          {value}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? `Đã chép ${name}` : `Sao chép ${name}`}
            className={`${GHOST_BTN} ${
              copied
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                : ""
            }`}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
          <span role="status" className="sr-only">
            {copied ? `Đã sao chép ${name}` : ""}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * The tool and its manual, in the half of the handover block the keys leave
 * empty.
 *
 * A one-key order left that side blank, and the two things a buyer needs after
 * paying — the key and the installer — were a scroll apart, the second one on
 * a product page they had to navigate back to. The block itself does not
 * change size: the keys move into the left column of a grid that was already
 * two columns wide when an order had two keys.
 *
 * Either link may be missing, and when both are the card is not drawn at all,
 * so a shop that has uploaded neither sees exactly what it saw before.
 */
function DownloadCard({
  downloadUrl,
  docsUrl,
}: {
  downloadUrl: string | null;
  docsUrl: string | null;
}) {
  // No square tile: a small glyph sits in each label, as "KEY" wears its key
  // (the owner, 09/10/2026: "đổi sang icon nhỏ bỏ trên link tải hack, tài
  // liệu cũng vậy"), after red, amber, violet and grey tiles were tried. The
  // download row's name is a short fixed one: the tool's full name sits in
  // "Sản phẩm đã mua" just above, and here it only repeated itself, cut short.
  return (
    <div className="flex flex-col gap-2.5">
      {downloadUrl ? (
        <FileRow
          // The three label glyphs in the accent red, the labels' words still
          // grey (the owner, 09/10/2026: "đổi màu 3 icon thử").
          icon={<Download className="h-3 w-3 text-[var(--menzu-accent)]" />}
          eyebrow="Link tải hack"
          // The owner's words for it (09/10/2026: "Bộ cài đặt mới nhất" →
          // "Loader mới nhất" → "Bản Loader mới nhất").
          title="Bản Loader mới nhất"
          href={downloadUrl}
          action="Tải về"
          // Grey like "Sao chép", on trial (the owner, 09/10/2026: orange,
          // amber, orange, silver, white, then "màu xám giống sao chép thử").
          actionClass="border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
          arrow={<Download className="h-3 w-3 shrink-0" />}
        />
      ) : null}
      {docsUrl ? (
        <FileRow
          icon={<FileText className="h-3 w-3 text-[var(--menzu-accent)]" />}
          eyebrow="Tài liệu hướng dẫn"
          // The owner's words (09/10/2026: "cài đặt & sử dụng -> Thiết lập &
          // sử dụng chi tiết").
          title="Thiết lập & sử dụng chi tiết"
          href={docsUrl}
          action="Xem ngay"
          // Grey like "Sao chép" and "Tải về" (the owner, 09/10/2026: violet,
          // orange, white, then "màu xám giống sao chép thử").
          actionClass="border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
          // The arrow again after an eye was tried (the owner, 09/10/2026: "con
          // mắt thành mũi tên như cũ"); the label became "Xem ngay".
          arrow={<ArrowRight className="h-3 w-3 shrink-0" />}
        />
      ) : null}
    </div>
  );
}

/**
 * One downloadable thing: what it is, what it is called, and the way to it.
 *
 * Two lines rather than three. The third was a sentence that said nothing the
 * eyebrow had not already said — "Hướng dẫn chi tiết sản phẩm" under "Tài liệu
 * hướng dẫn" — and it cost the whole handover block thirty pixels of height.
 * The glyph rides in the label, and the 16px inset matches the key box's.
 */
function FileRow({
  icon,
  eyebrow,
  title,
  href,
  action,
  actionClass,
  arrow,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  href: string;
  action: string;
  actionClass: string;
  arrow: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.12]">
      {/* min-w-0 so a long name truncates instead of pushing the button off
          the card. */}
      <div className="min-w-0 flex-1">
        <span className={LABEL}>
          {icon}
          {eyebrow}
        </span>
        <p className="mt-1 truncate text-sm font-bold text-white">{title}</p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-colors ${actionClass}`}
      >
        {action}
        {arrow}
      </a>
    </div>
  );
}

function OverviewCell({
  icon,
  label,
  className = "",
  children,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`p-4 sm:p-5 ${className}`}>
      <span className={`${LABEL} mb-1.5`}>
        {icon}
        {label}
      </span>
      {/* One line box for every value, sized on the total's 20px: the code,
          the date, the total and the status chip then share a baseline
          rather than a top edge, where the bigger total sat 3px low (the
          owner, 03/10/2026: "có cần căn lại cho ngay" → "thử đi"). Only the
          size is set, so what sits inside keeps its own leading; the label's
          margin gives back the 4px the taller line adds. */}
      <div className="text-[20px]">{children}</div>
    </div>
  );
}

/**
 * "Chi tiết đơn hàng": the receipt for one order, opened over the list.
 *
 * Built to the shop's reference sketch — a card over a blurred backdrop
 * with a header, a four-cell overview, the product line as a table, the
 * handover block (sign-in for an account, keys for a tool) and a support
 * footer. The trigger is the "XEM ĐƠN HÀNG" button this component draws;
 * the card lives in the same component so the list page stays a server
 * component and hands over nothing but data.
 *
 * Esc and a click on the backdrop close it; focus moves into the card on
 * open, cycles inside it, and returns to the button on close; the page
 * behind it does not scroll while it is up. The card is portalled to
 * `document.body`: the account frame's `<main>` is its own stacking
 * context, and an overlay rendered inside it sat under the site header no
 * matter its z-index.
 */
export function OrderDetailModal({
  order,
  supportHref,
  reviewHref = null,
  autoOpen = false,
  children,
  className,
}: {
  order: OrderDetailData;
  supportHref: string;
  /**
   * Open on mount — the receipt this page was asked for by name, as when a
   * buyer follows an order code from the checkout receipt. There is no
   * trigger to hand focus back to in that case, and the close path already
   * copes with an opener that was never pressed.
   */
  autoOpen?: boolean;
  /**
   * Where "Đánh giá" leads, while the order is one worth asking about — paid,
   * with no refund or warranty report open. Null or absent: no review here.
   * It lived on the list's card until the owner moved it in (30/09/2026:
   * "bỏ cái đánh giá ngoài card đi").
   */
  reviewHref?: string | null;
  /**
   * The row that opens the receipt. Given, the whole row is the trigger and
   * a link inside it (the product) still goes where it points; absent, the
   * component draws its own "Xem đơn hàng" button.
   */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(autoOpen);
  // "Lấy thông tin": the popup over the receipt that hands an account's
  // sign-in over once the buyer confirms they are recording the screen.
  // While it is up, the receipt's own keys stand aside.
  const [revealOpen, setRevealOpen] = useState(false);
  const revealOpenRef = useRef(false);
  useEffect(() => {
    revealOpenRef.current = revealOpen;
  }, [revealOpen]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A drag that starts on a key and ends past the card's edge is a
  // selection, not a dismissal — only a press that began on the backdrop
  // closes.
  const pressedBackdrop = useRef(false);
  const { mounted, leaving } = useOverlayPresence(open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = triggerRef.current;
    panel?.focus();
    lockScroll();

    const onKey = (event: KeyboardEvent) => {
      // The "Lấy thông tin" popup on top handles its own Escape and Tab.
      if (revealOpenRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "Tab" && panel) trapTab(panel, event);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      opener?.focus();
    };
  }, [open]);

  // The crossed-out shelf price is only a discount when it is above what
  // was paid; the receipt otherwise prices the line at what it cost.
  const base = Math.max(order.listPrice, order.total);
  const unitPrice =
    order.quantity > 0 ? Math.round(base / order.quantity) : base;
  const iconClass = "h-3.5 w-3.5";
  // The row's own rule: a tier for a tool, a rank for an account, nothing
  // when the shop typed neither.
  const chip = order.packageLabel ?? (order.productRank || null);
  /** Whether the shop has given this buyer anything to download at all. */
  const hasFiles = Boolean(order.downloadUrl || order.docsUrl);

  const setTrigger = (node: HTMLElement | null) => {
    triggerRef.current = node;
  };

  // A review is asked for until it is given; after that one quiet line.
  const askReview = reviewHref !== null && !order.reviewed;
  // One way forward (the owner, 01/10/2026): report the order for warranty,
  // then follow the ticket — the shop decides a refund, the buyer never asks
  // for one. Red where the next step is the buyer's (sending the report,
  // giving a bank account), an outline where they only watch.
  const warrantyAction = warrantyButton(order.warranty);
  // "Xem trạng thái" wears the eye, the site's "open and look" (the ledger's
  // eye opens a top-up's invoice): the ticket's state is already named in the
  // receipt's own status cell, and a clock / turning arrow / tick that changed
  // under an unchanging label said it a second time, less clearly (the
  // owner, 07/10/2026: "thay icon con mắt cho xem trạng thái" → "đổi").
  const WarrantyIcon =
    warrantyAction.kind === "request" ? Wrench : warrantyAction.kind === "bank" ? Landmark : Eye;
  // A refunded or unpaid order with no ticket has nothing to report or follow.
  const showWarranty = order.paid || order.warranty !== null;

  return (
    <>
      {children ? (
        <div
          ref={setTrigger}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => {
            // A press on the product link is a visit to the product.
            if ((event.target as HTMLElement).closest("a, button")) return;
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={className}
        >
          {children}
        </div>
      ) : (
        <button
          ref={setTrigger}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--menzu-accent)] px-4 text-xs font-bold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          <Receipt className="h-3.5 w-3.5" />
          Xem đơn hàng
        </button>
      )}

      {mounted
        ? createPortal(
            <div
              role="presentation"
              onPointerDown={(event) => {
                pressedBackdrop.current = event.target === event.currentTarget;
              }}
              onClick={(event) => {
                if (
                  event.target === event.currentTarget &&
                  pressedBackdrop.current
                )
                  setOpen(false);
              }}
              // order-sheet: below sm the stylesheet turns this into a bottom
              // sheet — the backdrop sits the card on the screen's foot, the
              // card loses its lower corners, and it rises from below rather
              // than lifting from the middle. On a phone the card fills the
              // screen bar 16px, so a desktop dialog's grammar read as a
              // page that popped.
              className={`order-modal-backdrop order-sheet fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-8${leaving ? " order-modal-backdrop-out" : ""}`}
              inert={leaving}
            >
              <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`order-${order.code}-title`}
                className={`order-modal-card relative max-h-[calc(100dvh-2rem)] w-full max-w-[1150px] overflow-y-auto rounded-2xl border border-white/10 bg-[#101114] shadow-[0_25px_80px_rgba(0,0,0,0.7)] outline-none sm:max-h-[calc(100dvh-4rem)]${leaving ? " order-modal-card-out" : ""}`}
              >
                {/* The sheet's grip, phone only: says "this slides" before
                    anything is read, and gives the thumb a place to rest. */}
                <span
                  aria-hidden
                  className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-white/15 sm:hidden"
                />

                {/* HEADER */}
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
                  {/* The Package mark (the owner's pick over Receipt), in the
                      accent like every account page title's icon, in place of
                      the red bar the storefront's sections use. */}
                  <div>
                    <h2
                      id={`order-${order.code}-title`}
                      className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-white sm:text-xl"
                    >
                      <Package className="h-5 w-5 shrink-0 text-[var(--menzu-accent)]" aria-hidden />
                      Chi tiết đơn hàng
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Thông tin sản phẩm và dữ liệu bàn giao của đơn hàng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Đóng"
                    className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  </button>
                </div>

                {/* BODY */}
                <div className="p-5 sm:p-6">
                  {/* OVERVIEW — two by two until the four cells have room
                      for their labels on one line. */}
                  <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
                    <OverviewCell
                      icon={<Hash className={iconClass} />}
                      label="Mã đơn hàng"
                      className="border-b border-r border-white/[0.06] lg:border-b-0"
                    >
                      <span className="text-[15px] font-bold tabular-nums text-white">
                        {order.code}
                      </span>
                    </OverviewCell>
                    <OverviewCell
                      icon={<CalendarDays className={iconClass} />}
                      label="Ngày mua"
                      className="border-b border-white/[0.06] lg:border-b-0 lg:border-r"
                    >
                      {/* The time behind its own clock, beside the day (the
                          owner, 02/10/2026: "giờ cho icon đồng hồ đi"); the
                          list's cards dropped it, the receipt keeps it. */}
                      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-bold tabular-nums text-white">
                          {order.date}
                        </span>
                        {order.time ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-neutral-400">
                            <Clock className="h-3 w-3 shrink-0" aria-hidden />
                            {order.time}
                          </span>
                        ) : null}
                      </span>
                    </OverviewCell>
                    <OverviewCell
                      icon={<Wallet className={iconClass} />}
                      label="Tổng thanh toán"
                      className="border-r border-white/[0.06]"
                    >
                      <span className="text-xl font-black tabular-nums text-white">
                        {money(order.total)}
                      </span>
                    </OverviewCell>
                    <OverviewCell
                      icon={<ShieldCheck className={iconClass} />}
                      label="Trạng thái"
                    >
                      {/* The list row's chip, verbatim — the same order wears
                          the same badge on both sides of the button. */}
                      <span
                        className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${order.statusClass}`}
                      >
                        {order.statusLabel}
                      </span>
                    </OverviewCell>
                  </div>

                  {/* PRODUCT */}
                  <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">
                    Sản phẩm đã mua
                  </h3>
                  {/* Below sm, one card instead of the table: five columns
                      in a 390px sheet meant a 640px table scrolling sideways
                      inside a sheet that itself scrolls, and a reader saw the
                      first column alone. */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 lg:hidden">
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
                        {order.imageUrl ? (
                          <Image
                            src={order.imageUrl}
                            alt=""
                            fill
                            sizes="144px"
                            className="object-cover object-[85%_center]"
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={order.productHref}
                          className="line-clamp-2 text-sm font-black leading-snug text-white"
                        >
                          {order.isSoftware ? order.productName : `#${order.productCode}`}
                        </Link>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-neutral-500">
                          {chip ? (
                            <span className="inline-flex shrink-0 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                              {chip}
                            </span>
                          ) : null}
                          <span className="truncate">{order.categoryName}</span>
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-[11px]">
                      <div>
                        <dt className="text-neutral-500">Số lượng</dt>
                        <dd className="mt-0.5 font-bold tabular-nums text-neutral-200">{order.quantity}</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Đơn giá</dt>
                        <dd className="mt-0.5 font-bold tabular-nums text-neutral-200">{money(unitPrice)}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-neutral-500">Thành tiền</dt>
                        <dd className="mt-0.5 font-black tabular-nums text-white">{money(order.total)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* The table only from lg: at 768 it was 887px in a 654px box and the
                      three money columns sat off the right edge with no
                      scrollbar to say so; the card above already carries them. */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-white/10">
                      <thead>
                        <tr>
                          {[
                            "Sản phẩm",
                            "Gói dịch vụ",
                            "Số lượng",
                            "Đơn giá",
                            "Thành tiền",
                          ].map((head) => (
                            <th
                              key={head}
                              // The quantity is a single digit under a long
                              // heading; centred, it sits under the word
                              // instead of looking pushed to its left edge
                              // (the owner, 02/10/2026: "số lượng 1 cái đó có
                              // hơi bị lệch không" → "làm 1").
                              className={`whitespace-nowrap bg-white/[0.03] px-4 py-3 ${head === "Số lượng" ? "text-center" : "text-left"} text-[10px] font-black uppercase tracking-widest text-neutral-500 sm:px-5`}
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="transition-colors hover:bg-white/[0.02]">
                          <td className={CELL}>
                            <div className="flex items-center gap-4">
                              <span className="relative h-14 w-[84px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                                {order.imageUrl ? (
                                  <Image
                                    src={order.imageUrl}
                                    alt=""
                                    fill
                                    sizes="168px"
                                    className="object-cover object-[85%_center]"
                                  />
                                ) : null}
                              </span>
                              {/* A table cell grows to fit its content, so the
                                  ellipsis only works against a ceiling. */}
                              <div className="min-w-0 max-w-[200px] lg:max-w-[260px] xl:max-w-[320px]">
                                <Link
                                  href={order.productHref}
                                  className="mb-1 line-clamp-2 text-base font-black leading-snug text-white transition-colors hover:text-[var(--menzu-accent)]"
                                >
                                  {order.isSoftware
                                    ? order.productName
                                    : `#${order.productCode}`}
                                </Link>
                                <div className="truncate text-[11px] font-semibold text-neutral-500">
                                  Danh mục{" "}
                                  <span className="text-neutral-300">
                                    {order.categoryName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Plain text like its neighbours, under the
                              column's own heading: as a 9px capped chip it was
                              the one boxed cell in the row (trial, the owner,
                              02/10/2026: "nhìn nó AI quá" → "thử đi"). The
                              list's cards keep their chip. */}
                          <td className={CELL}>
                            {chip ? (
                              <span className="whitespace-nowrap">{chip}</span>
                            ) : (
                              <span className="text-neutral-500">-</span>
                            )}
                          </td>
                          <td className={`${CELL} text-center tabular-nums`}>
                            {order.quantity}
                          </td>
                          <td className={`${CELL} tabular-nums`}>
                            {money(unitPrice)}
                          </td>
                          <td className={`${CELL} tabular-nums`}>
                            <strong className="text-white">
                              {money(order.total)}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* HANDOVER */}
                  {/* The heading stands outside, exactly as "Sản phẩm đã mua"
                      stands above its table: plain text, no tile. The frame
                      around the cards stays (the owner, 09/10/2026: "bỏ thông
                      tin chi tiết sản phẩm ra ngoài card đi", "rồi bỏ card
                      bao luôn", then "thêm lại khung lồng"). */}
                  <div className="mt-6">
                    {/* A tool hands over keys and files, not a sign-in, so its
                        heading is its own (the owner, 09/10/2026: "Key & tải
                        về", then "Thông tin sản phẩm", "/ bàn giao" tried and
                        dropped, and at last "Thông tin chi tiết sản phẩm"). */}
                    <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">
                      {order.isSoftware ? "Thông tin chi tiết sản phẩm" : "Thông tin đăng nhập / bàn giao"}
                    </h3>
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                    <div className="relative">
                      {order.loginLocked ? (
                        // An account's sign-in not yet taken: the "Lấy thông
                        // tin" card, a random listing's and a single account's
                        // alike (the owner, 08/10/2026, after menzu).
                        <LockedLogin onTake={() => setRevealOpen(true)} />
                      ) : order.isPool ? (
                        // Each key is one sign-in; shown as the pair it is,
                        // not as a key, the password in the clear like the
                        // single account's.
                        <div className="flex flex-col gap-4">
                          {order.keys.length > 0 ? (
                            <div className="flex flex-col gap-4">
                              {order.keys.map((key, index) => {
                                const at = key.value.indexOf("|");
                                const username = at < 0 ? key.value : key.value.slice(0, at);
                                const password = at < 0 ? "" : key.value.slice(at + 1);
                                return (
                                  // One row per sign-in: name and password side
                                  // by side, as the single account shows its
                                  // own, with the ordinal above when there are
                                  // several.
                                  // No card around the pair: the two boxes are
                                  // cards already, and a frame around them was
                                  // a box inside a box.
                                  <div key={`${index}-${key.value}`}>
                                    {order.keys.length > 1 ? (
                                      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        Tài khoản {index + 1}
                                      </span>
                                    ) : null}
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                      <HandoverBox
                                        icon={<User className="h-3 w-3" />}
                                        label="Tài khoản"
                                        value={username}
                                      />
                                      <HandoverBox
                                        icon={<Lock className="h-3 w-3" />}
                                        label="Mật khẩu"
                                        value={password}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          {order.keysPending > 0 ? (
                            <p className="text-xs font-semibold text-amber-400">
                              {order.keysPending} tài khoản đang được chuẩn bị, shop
                              sẽ giao trong ít phút, sẽ hiện ngay tại đây.
                            </p>
                          ) : null}
                          {order.keys.length === 0 && order.keysPending === 0 ? (
                            <p className="text-xs text-neutral-400">
                              {order.refunded
                                ? "Đơn đã được hoàn tiền, thông tin đăng nhập đã thu hồi."
                                : "Đơn này chưa có tài khoản để hiển thị."}
                            </p>
                          ) : null}
                          {order.keys.length > 0 && order.loginRevealedAt ? (
                            <RevealedLine at={order.loginRevealedAt} />
                          ) : null}
                        </div>
                      ) : order.isSoftware ? (
                        // With files to offer, the keys take the left half and
                        // the download rows the right — the card is one hand-
                        // over, and the empty space beside a single key is
                        // where they belong. Top-aligned so the shorter side
                        // does not stretch.
                        <div
                          // grid-cols-1 spelled out: an implicit track is
                          // sized by its content, and the download row's
                          // one-line name pushed the block 160px past the
                          // card on a phone; minmax(0, 1fr) is what lets the
                          // name truncate instead.
                          className={`grid grid-cols-1 gap-4 ${
                            hasFiles ? "lg:grid-cols-2 lg:items-start" : ""
                          }`}
                        >
                          <div className="flex flex-col gap-4">
                            {order.keys.length > 0 ? (
                              <div
                                className={`grid gap-4 ${
                                  hasFiles
                                    ? "grid-cols-1"
                                    : "grid-cols-1 lg:grid-cols-2"
                                }`}
                              >
                                {order.keys.map((key, index) => (
                                  <div
                                    key={`${index}-${key.value}`}
                                    className="flex flex-col gap-1.5"
                                  >
                                    <HandoverBox
                                      icon={<KeyRound className="h-3 w-3 text-[var(--menzu-accent)]" />}
                                      label={
                                        order.keys.length > 1
                                          ? `Key ${index + 1}`
                                          : "Key"
                                      }
                                      value={key.value}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {order.keysPending > 0 ? (
                              <p className="text-xs font-semibold text-amber-400">
                                {order.keysPending} key đang được chuẩn bị, shop sẽ giao trong ít phút, key sẽ hiện ngay tại
                                đây.
                              </p>
                            ) : null}
                            {order.keys.length === 0 &&
                            order.keysPending === 0 ? (
                              <p className="text-xs text-neutral-400">
                                {order.refunded
                                  ? "Đơn đã được hoàn tiền, key đã thu hồi."
                                  : "Đơn này chưa có key để hiển thị."}
                              </p>
                            ) : null}
                          </div>
                          {hasFiles ? (
                            <DownloadCard
                              downloadUrl={order.downloadUrl}
                              docsUrl={order.docsUrl}
                            />
                          ) : null}
                        </div>
                      ) : order.login.state === "ready" ? (
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <HandoverBox
                              icon={<User className="h-3 w-3" />}
                              label="Tài khoản"
                              value={order.login.login.username}
                            />
                            <HandoverBox
                              icon={<Lock className="h-3 w-3" />}
                              label="Mật khẩu"
                              value={order.login.login.password}
                            />
                          </div>
                          {order.login.login.note ? (
                            <p className="whitespace-pre-line break-words rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-neutral-300">
                              {order.login.login.note}
                            </p>
                          ) : null}
                          {order.loginRevealedAt ? (
                            <RevealedLine at={order.loginRevealedAt} />
                          ) : null}
                        </div>
                      ) : order.login.state === "pending" ? (
                        // Sold before the shop typed the sign-in. No "liên hệ
                        // shop" any more: every account hands itself over
                        // (the owner, 08/10/2026: "loại bỏ cái bàn giao trực
                        // tiếp đi"), so this one is on its way, worded as a
                        // random listing's sign-ins still on their way are.
                        <p className="text-xs font-semibold text-amber-400">
                          Thông tin đăng nhập đang được chuẩn bị, shop sẽ giao trong ít
                          phút, sẽ hiện ngay tại đây.
                        </p>
                      ) : order.paid ? (
                        // Paid, yet no handover: the shop has since put this
                        // account back on the shelf and handed it to a later
                        // buyer. "Shows once paid" would be a lie next to the
                        // green chip.
                        <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          <p className="text-xs leading-relaxed text-neutral-300">
                            Tài khoản này đã được shop bàn giao lại, liên hệ
                            shop kèm mã đơn{" "}
                            <strong className="text-white">
                              {order.code}
                            </strong>{" "}
                            nếu cần hỗ trợ.
                          </p>
                        </div>
                      ) : order.refunded ? (
                        // "Shows once paid" would be a lie here: this one WAS
                        // paid, and the shop gave the money back. Saying so is
                        // the difference between a withdrawn order and an
                        // order the site appears to have lost.
                        <p className="text-xs text-neutral-400">
                          Đơn đã được hoàn tiền, dữ liệu bàn giao không còn
                          hiển thị.
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400">
                          Dữ liệu bàn giao hiện khi đơn đã thanh toán.
                        </p>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* NOTE */}
                  {/* Red on purpose: the owner wants this reminder as the
                      sheet's one accent ("đỏ cho có điểm nhấn"), after a grey
                      version was tried in 4bd4ac0. */}
                  <div className="mt-4 flex items-start gap-3 rounded-r-xl border-l-[3px] border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/5 px-4 py-3.5 text-xs leading-relaxed text-neutral-400">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--menzu-accent)]" />
                    <span>
                      Vui lòng lưu lại mã đơn hàng để được hỗ trợ khi cần thiết.
                      Không chia sẻ thông tin tài khoản hoặc dữ liệu bàn giao
                      cho người khác.
                    </span>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
                  {/* The owner's own words (02/10/2026), where "Cần hỗ trợ về
                      đơn hàng này? Gửi kèm mã đơn …" stood, less the "Hãy"
                      the ask first opened with ("bỏ chữ Hãy đi"). The ask, a
                      step brighter than the question and with no underline
                      ("bỏ dấu gạch dưới đi"), whitens under the pointer and
                      leads straight to the order's own review page, where the
                      form is ("bấm, đánh giá mã đơn … thì nhảy tới trang viết
                      đánh giá luôn đi"; it opened a popup before). Not
                      /feedback/submit: a review written there belongs to no
                      order, and this one would go on asking. The question
                      itself one step up from neutral-500, readable at 12px yet
                      still below the ask (trial, "có cần tăng sáng" → "thử đi").
                      Once reviewed, no question: "Xem đánh giá mã đơn …" alone,
                      a link straight to the shop's review page ("nếu đã đánh
                      giá rồi thì … chỉ hiện xem đánh giá mã đơn", "trang này
                      đi … /feedback"). */}
                  <span className="text-xs text-neutral-400">
                    {order.reviewed ? (
                      <Link
                        href="/feedback"
                        className="text-neutral-300 transition-colors hover:text-white"
                      >
                        Xem đánh giá mã đơn <span className="font-bold">{order.code}</span>
                        {/* The filled amber star a given review wears on the
                            list's tag (the owner, 03/10/2026: "chắc thêm icon
                            sao vàng bên phải quá"). */}
                        <Star
                          className="ml-1 inline h-3 w-3 fill-current align-[-2px] text-amber-400"
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      <>
                        Bạn thấy sao về sản phẩm này?{" "}
                        <Link
                          href={`/orders/${order.code}/danh-gia`}
                          className="text-neutral-300 transition-colors hover:text-white"
                        >
                          Đánh giá mã đơn <span className="font-bold">{order.code}</span>
                        </Link>
                      </>
                    )}
                  </span>
                  {/* The warranty button, and the review beside it when that
                      is switched on. On a phone they share a row, or the one
                      button fills it. */}
                  <div className="flex w-full flex-col gap-2 sm:w-auto">
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2.5">
                      {showWarranty ? (
                        <Link
                          href={supportHref}
                          className={`press group inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold sm:h-10 sm:px-5${
                            askReview ? "" : " col-span-2"
                          } ${
                            warrantyAction.kind === "status"
                              ? "border border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white"
                              : "bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
                          }`}
                        >
                          <WarrantyIcon className="h-4 w-4" />
                          {warrantyAction.label}
                        </Link>
                      ) : null}
                      {askReview ? (
                        <Link
                          href={reviewHref}
                          className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-neutral-300 hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)] sm:h-10"
                        >
                          <Star className="h-4 w-4" />
                          Đánh giá
                        </Link>
                      ) : null}
                    </div>
                    {reviewHref && order.reviewed ? (
                      <p className="text-[11px] leading-snug text-neutral-500">
                        <Star
                          className="mr-1 inline h-3 w-3 fill-current align-[-2px] text-amber-400"
                          aria-hidden
                        />
                        Bạn đã đánh giá đơn này.
                      </p>
                    ) : null}
                    {!showWarranty ? (
                      <p className="text-[11px] leading-snug text-neutral-500">
                        <Wrench className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                        {order.refunded
                          ? "Đơn đã được hoàn tiền nên không còn bảo hành."
                          : "Chỉ đơn đã thanh toán mới yêu cầu bảo hành được."}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Phone only: a way out at the foot of the sheet, where the
                    thumb already is. The cross in the top corner stays for
                    the desk, where it is the nearest control to the pointer
                    that opened the card. */}
                <div className="border-t border-white/[0.06] px-5 py-3 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="press h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-neutral-300"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {revealOpen && mounted
        ? createPortal(
            <LoginRevealDialog code={order.code} onClose={() => setRevealOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * An account's sign-in not yet taken, as menzu's "Nhận thông tin đăng nhập"
 * card has it (the owner, 08/10/2026): the warning that the take must be
 * filmed, and the one button that opens the steps. Without menzu's "Web
 * Riot": the buyer is asked to sign in to the game itself ("bỏ cái nút web
 * riot đi yêu cầu người dùng đăng nhập vào game thôi"). The compact A and B
 * layouts were tried and dropped for this one ("Sửa lại như này đi", with a
 * picture of this card).
 */
function LockedLogin({ onTake }: { onTake: () => void }) {
  return (
    // No key tile of its own: the section heading right above already wears
    // the red key, and two keys stacked said the same thing twice (the
    // owner, 09/10/2026: keep the red one, "rồi làm đi").
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center sm:px-6">
      <div>
        <p className="text-sm font-black uppercase tracking-wider text-white">
          Nhận thông tin đăng nhập
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-neutral-400">
          Tài khoản này chưa được nhận. Khi bạn bấm nhận, hệ thống sẽ mở khóa thông tin, vui
          lòng tự bảo mật tài khoản.
        </p>
      </div>
      <div className="w-full max-w-md rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-left">
        <p className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-red-400">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          Bắt buộc quay video
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-300">
          Quay màn hình liên tục từ lúc bấm lấy thông tin đến khi đăng nhập thành công vào
          game. Shop từ chối hỗ trợ bảo hành nếu thiếu video này.
        </p>
      </div>
      <button
        type="button"
        onClick={onTake}
        // Sentence case, 12px bold, 44px on a phone and 40 from sm: the
        // lettering of "Yêu cầu bảo hành" and the popup's buttons, in the
        // card's own amber (the owner, 09/10/2026: "làm nút lấy thông tin
        // trước"). The card's title stays in capitals; it is a heading.
        className="press inline-flex h-11 items-center justify-center rounded-xl bg-amber-500 px-8 text-xs font-bold text-neutral-950 transition-colors hover:bg-amber-400 sm:h-10"
      >
        Lấy thông tin
      </button>
    </div>
  );
}

/** Under a sign-in once taken: when, for the buyer's own record. */
function RevealedLine({ at }: { at: string }) {
  return <p className="text-[11px] text-neutral-500">Đã nhận thông tin lúc {at}.</p>;
}

/**
 * The steps before an account's sign-in is shown, menzu's "Bắt buộc quay màn
 * hình" (the owner, 08/10/2026): film from here, take the sign-in, sign in to
 * the game. The confirm button stays off until the buyer switches on "Xác
 * nhận đang quay màn hình". On success the route stamps the moment and the
 * receipt refreshes with the sign-in in it.
 */
function LoginRevealDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedBackdrop = useRef(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const opener = document.activeElement as HTMLElement | null;
    panel?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && panel) trapTab(panel, event);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  async function take() {
    if (!recording || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/reveal-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, recording: true }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Chưa mở được thông tin, thử lại sau.");
        setBusy(false);
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Chưa mở được thông tin, thử lại sau.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-6"
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-reveal-title"
        tabIndex={-1}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#121216] p-5 shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-150 sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span
            id="login-reveal-title"
            className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-[13px] font-black text-red-400"
          >
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Bắt buộc quay màn hình
          </span>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
            Thực hiện đúng quy trình để được hỗ trợ bảo hành ngay nếu tài khoản phát sinh lỗi.
          </p>
        </div>

        <ol className="mt-5 divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
          {REVEAL_STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-[10px] font-black text-amber-400">
                {index + 1}
              </span>
              <p className="text-[13px] leading-relaxed text-neutral-300">
                <strong className="text-white">{step.title}:</strong> {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-[12px] leading-relaxed text-neutral-300">
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span>
              <strong className="text-red-400">Bắt buộc 1 video liền mạch:</strong> quay liên tục
              từ lúc lấy mật khẩu đến khi đăng nhập xong vào game.
            </span>
          </p>
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span>
              Video ngắt quãng, quay 2 lượt hoặc cắt ghép sẽ{" "}
              <strong className="text-red-400">bị từ chối bảo hành</strong>.
            </span>
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={recording}
          onClick={() => setRecording((on) => !on)}
          className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span>
            <span className="block text-[13px] font-bold text-white">
              Xác nhận đang quay màn hình
            </span>
            <span className="mt-0.5 block text-[11px] text-neutral-400">
              Tôi cam kết đang quay video và đồng ý với điều khoản trên.
            </span>
          </span>
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              recording ? "bg-[var(--menzu-accent)]" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                recording ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        {error ? (
          <p role="alert" className="mt-3 text-[12px] font-semibold text-[var(--menzu-accent)]">
            {error}
          </p>
        ) : null}

        {/* The confirm gets the wider share: its label is the long one. On a
            phone the two stack, confirm on top. Both in the receipt's own
            button dress, the outline and the red of its footer, so the
            whole "Lấy thông tin" flow reads alike. */}
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-4 sm:grid sm:grid-cols-[2fr_3fr]">
          <button
            type="button"
            onClick={onClose}
            className="press h-11 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white sm:h-10"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={take}
            disabled={!recording || busy}
            className="press h-11 rounded-xl bg-[var(--menzu-accent)] px-4 text-xs font-bold text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-neutral-500 sm:h-10"
          >
            {busy ? "Đang mở…" : "Xác nhận lấy thông tin"}
          </button>
        </div>
      </div>
    </div>
  );
}
