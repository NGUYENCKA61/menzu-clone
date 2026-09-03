"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Info,
  KeyRound,
  Lock,
  MessageCircle,
  Receipt,
  RotateCcw,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { LoginHandover } from "@/lib/accountLogin";

import { lockScroll, trapTab, unlockScroll } from "./modalChrome";
import { formatVnd } from "./productData";

/**
 * Everything the receipt prints, already shaped for the screen: dates as
 * text, money as numbers, and the sign-in exactly as the order page decided
 * it. Plain data, because it crosses from the server page into this client
 * component.
 */
export interface OrderDetailData {
  code: string;
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
  keys: string[];
  keysPending: number;
  /** Software: the installer and the manual. Null hides that one button;
   *  null for both leaves the keys the full width they had before. */
  downloadUrl: string | null;
  docsUrl: string | null;
  /** Accounts: the sign-in, or the word that the shop hands it over itself. */
  login: LoginHandover;
  /**
   * Whether "Yêu cầu hoàn trả" is still live on this order — decided by the
   * page, which knows when it was bought and how long the window is.
   */
  canRefund: boolean;
  /** Why not, when it is not: shown on the dead button so the buyer learns
   *  the window existed rather than pressing a thing that ignores them. */
  refundBlockedReason: string | null;
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
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white";
const CELL =
  "border-t border-white/[0.06] px-4 py-4 text-sm text-neutral-200 sm:px-5";
/** One value with its copy button; the password variant starts masked. */
function HandoverBox({
  label,
  icon,
  value,
  secret = false,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  secret?: boolean;
}) {
  const [shown, setShown] = useState(!secret);
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
      // Refused clipboard: show the value and leave it selected, so one
      // Ctrl+C finishes what the button could not.
      setShown(true);
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
          className="min-w-0 max-w-full truncate font-mono text-sm font-bold tracking-wide text-white"
        >
          {shown ? value : "•".repeat(Math.min(Math.max(value.length, 8), 18))}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {secret ? (
            <button
              type="button"
              onClick={() => setShown((s) => !s)}
              className={GHOST_BTN}
              aria-label={shown ? `Ẩn ${name}` : `Hiện ${name}`}
            >
              {shown ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {shown ? "Ẩn" : "Hiện"}
            </button>
          ) : null}
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
  productName,
}: {
  downloadUrl: string | null;
  docsUrl: string | null;
  /** The tool's own name, so the row says what is being downloaded. */
  productName: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {downloadUrl ? (
        <FileRow
          icon={<Download className="h-3.5 w-3.5" />}
          tint="border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]"
          eyebrow="Link tải hack"
          title={productName}
          href={downloadUrl}
          action="Tải về"
          actionClass="bg-[var(--menzu-accent)] text-white hover:bg-[var(--menzu-accent-dark)]"
          arrow={<Download className="h-3 w-3 shrink-0" />}
        />
      ) : null}
      {docsUrl ? (
        <FileRow
          icon={<FileText className="h-3.5 w-3.5" />}
          tint="border-violet-500/25 bg-violet-500/15 text-violet-300"
          eyebrow="Tài liệu hướng dẫn"
          title="Cài đặt & sử dụng"
          href={docsUrl}
          action="Xem"
          actionClass="border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
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
 */
function FileRow({
  icon,
  tint,
  eyebrow,
  title,
  href,
  action,
  actionClass,
  arrow,
}: {
  icon: ReactNode;
  /** Border, fill and glyph colour for the square badge. */
  tint: string;
  eyebrow: string;
  title: string;
  href: string;
  action: string;
  actionClass: string;
  arrow: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${tint}`}
      >
        {icon}
      </span>
      {/* min-w-0 so a long tool name truncates instead of pushing the button
          off the card. */}
      <div className="min-w-0 flex-1">
        <span className={LABEL}>{eyebrow}</span>
        <p className="mt-0.5 truncate text-[13px] font-black text-white">{title}</p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[10px] font-black uppercase tracking-widest transition-colors ${actionClass}`}
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
      <span className={`${LABEL} mb-2.5`}>
        {icon}
        {label}
      </span>
      {children}
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
  refundHref = supportHref,
  children,
  className,
}: {
  order: OrderDetailData;
  supportHref: string;
  /**
   * Where "Yêu cầu hoàn trả" goes. Defaults to the support destination, which
   * is where the request is handled by hand today; the caller can point it at
   * a form of its own the day there is one, without this card knowing.
   */
  refundHref?: string;
  /**
   * The row that opens the receipt. Given, the whole row is the trigger and
   * a link inside it (the product) still goes where it points; absent, the
   * component draws its own "Xem đơn hàng" button.
   */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A drag that starts on a key and ends past the card's edge is a
  // selection, not a dismissal — only a press that began on the backdrop
  // closes.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = triggerRef.current;
    panel?.focus();
    lockScroll();

    const onKey = (event: KeyboardEvent) => {
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
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--menzu-accent)] px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          <Receipt className="h-3.5 w-3.5" />
          Xem đơn hàng
        </button>
      )}

      {open
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
              className="order-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-8"
            >
              <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`order-${order.code}-title`}
                className="order-modal-card relative max-h-[calc(100dvh-2rem)] w-full max-w-[1150px] overflow-y-auto rounded-2xl border border-white/10 bg-[#101114] shadow-[0_25px_80px_rgba(0,0,0,0.7)] outline-none sm:max-h-[calc(100dvh-4rem)]"
              >
                {/* HEADER */}
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1 h-5 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]"
                    />
                    <div>
                      <h2
                        id={`order-${order.code}-title`}
                        className="text-lg font-black uppercase tracking-wider text-white sm:text-xl"
                      >
                        Chi tiết đơn hàng
                      </h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        Thông tin sản phẩm và dữ liệu bàn giao của đơn hàng.
                      </p>
                    </div>
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
                      <span className="font-mono text-[15px] font-bold tracking-wide text-white">
                        {order.code}
                      </span>
                    </OverviewCell>
                    <OverviewCell
                      icon={<CalendarDays className={iconClass} />}
                      label="Ngày mua"
                      className="border-b border-white/[0.06] lg:border-b-0 lg:border-r"
                    >
                      <span className="text-[15px] font-bold tabular-nums text-white">
                        {order.date}
                      </span>
                    </OverviewCell>
                    <OverviewCell
                      icon={<Wallet className={iconClass} />}
                      label="Tổng thanh toán"
                      className="border-r border-white/[0.06]"
                    >
                      <span className="text-xl font-black tabular-nums text-white">
                        {formatVnd(order.total)}đ
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
                  <div className="overflow-x-auto">
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
                              className="whitespace-nowrap bg-white/[0.03] px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500 sm:px-5"
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
                                    sizes="84px"
                                    className="object-cover object-[85%_center]"
                                  />
                                ) : null}
                              </span>
                              {/* A table cell grows to fit its content, so the
                                  ellipsis only works against a ceiling. */}
                              <div className="min-w-0 max-w-[200px] md:max-w-[320px]">
                                <Link
                                  href={order.productHref}
                                  className="mb-1 block truncate text-sm font-black text-white transition-colors hover:text-[var(--menzu-accent)]"
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
                          <td className={CELL}>
                            {chip ? (
                              <span className="inline-flex whitespace-nowrap rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                                {chip}
                              </span>
                            ) : (
                              <span className="text-neutral-500">—</span>
                            )}
                          </td>
                          <td className={`${CELL} tabular-nums`}>
                            {order.quantity}
                          </td>
                          <td className={`${CELL} tabular-nums`}>
                            {formatVnd(unitPrice)}đ
                          </td>
                          <td className={`${CELL} tabular-nums`}>
                            <strong className="text-white">
                              {formatVnd(order.total)}đ
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* HANDOVER */}
                  <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--menzu-accent)]/10 blur-3xl"
                    />
                    {/* One line. The sentence under it — "Thông tin được cung
                        cấp sau khi thanh toán" — was telling a reader who is
                        looking straight at their key that they will get it
                        once they pay. */}
                    <div className="relative mb-4 flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)]">
                        <KeyRound className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">
                        Thông tin đăng nhập / bàn giao
                      </h3>
                    </div>

                    <div className="relative">
                      {order.isPool ? (
                        // Each key is one sign-in; shown as the pair it is,
                        // not as a key, with the password behind a reveal
                        // like the single account's.
                        <div className="flex flex-col gap-4">
                          {order.keys.length > 0 ? (
                            <div className="flex flex-col gap-4">
                              {order.keys.map((key, index) => {
                                const at = key.indexOf("|");
                                const username = at < 0 ? key : key.slice(0, at);
                                const password = at < 0 ? "" : key.slice(at + 1);
                                return (
                                  // One row per sign-in: name and password side
                                  // by side, as the single account shows its
                                  // own, with the ordinal above when there are
                                  // several.
                                  // No card around the pair: the two boxes are
                                  // cards already, and a frame around them was
                                  // a box inside a box.
                                  <div key={`${index}-${key}`}>
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
                                        secret
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          {order.keysPending > 0 ? (
                            <p className="text-xs font-semibold text-amber-400">
                              {order.keysPending} tài khoản đang được chuẩn bị — shop
                              sẽ giao trong ít phút, sẽ hiện ngay tại đây.
                            </p>
                          ) : null}
                          {order.keys.length === 0 && order.keysPending === 0 ? (
                            <p className="text-xs text-neutral-400">
                              Đơn này chưa có tài khoản để hiển thị.
                            </p>
                          ) : null}
                        </div>
                      ) : order.isSoftware ? (
                        // With files to offer, the keys take the left half and
                        // the download rows the right — the card is one hand-
                        // over, and the empty space beside a single key is
                        // where they belong. Top-aligned so the shorter side
                        // does not stretch.
                        <div
                          className={`grid gap-4 ${
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
                                  <HandoverBox
                                    key={`${index}-${key}`}
                                    icon={<KeyRound className="h-3 w-3" />}
                                    label={
                                      order.keys.length > 1
                                        ? `Key ${index + 1}`
                                        : "Key"
                                    }
                                    value={key}
                                  />
                                ))}
                              </div>
                            ) : null}
                            {order.keysPending > 0 ? (
                              <p className="text-xs font-semibold text-amber-400">
                                {order.keysPending} key đang được chuẩn bị —
                                shop sẽ giao trong ít phút, key sẽ hiện ngay tại
                                đây.
                              </p>
                            ) : null}
                            {order.keys.length === 0 &&
                            order.keysPending === 0 ? (
                              <p className="text-xs text-neutral-400">
                                Đơn này chưa có key để hiển thị.
                              </p>
                            ) : null}
                          </div>
                          {hasFiles ? (
                            <DownloadCard
                              downloadUrl={order.downloadUrl}
                              docsUrl={order.docsUrl}
                              productName={order.productName}
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
                              secret
                            />
                          </div>
                          {order.login.login.note ? (
                            <p className="whitespace-pre-line break-words rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-neutral-300">
                              {order.login.login.note}
                            </p>
                          ) : null}
                        </div>
                      ) : order.login.state === "manual" ? (
                        <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          <p className="text-xs leading-relaxed text-neutral-300">
                            Tài khoản này được bàn giao trực tiếp — liên hệ shop
                            kèm mã đơn{" "}
                            <strong className="font-mono text-white">
                              {order.code}
                            </strong>{" "}
                            để nhận thông tin đăng nhập.
                          </p>
                        </div>
                      ) : order.paid ? (
                        // Paid, yet no handover: the shop has since put this
                        // account back on the shelf and handed it to a later
                        // buyer. "Shows once paid" would be a lie next to the
                        // green chip.
                        <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          <p className="text-xs leading-relaxed text-neutral-300">
                            Tài khoản này đã được shop bàn giao lại — liên hệ
                            shop kèm mã đơn{" "}
                            <strong className="font-mono text-white">
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
                          Đơn đã được hoàn tiền — dữ liệu bàn giao không còn
                          hiển thị.
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400">
                          Dữ liệu bàn giao hiện khi đơn đã thanh toán.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* NOTE */}
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:px-6">
                  <span className="text-xs text-neutral-500">
                    Cần hỗ trợ về đơn hàng này? Gửi kèm mã đơn{" "}
                    <span className="font-mono font-bold text-neutral-300">
                      {order.code}
                    </span>
                  </span>
                  {/* Two ways out of this card, and the quieter one first:
                      asking for money back is the rarer errand, so it gets the
                      outline while "liên hệ hỗ trợ" keeps the filled button.
                      Only offered on a paid order — there is nothing to refund
                      on one that was never charged or was refunded already. */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {order.paid ? (
                      order.canRefund ? (
                        <Link
                          href={refundHref}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)]"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Yêu cầu hoàn trả
                        </Link>
                      ) : (
                        // Left in place, dead, with the reason on it: removed
                        // entirely and a buyer past the window would go looking
                        // for a button that was never there.
                        <span
                          aria-disabled
                          title={order.refundBlockedReason ?? undefined}
                          className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-600"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Yêu cầu hoàn trả
                        </span>
                      )
                    ) : null}
                    <Link
                      href={supportHref}
                      className="group inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Liên hệ hỗ trợ
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
