"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  Check,
  KeyRound,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";

import { agencyCutFor } from "@/lib/agency";
import {
  formatTierPercent,
  tierDiscountFor,
  type MemberTierValue,
} from "@/lib/memberTiers";

import { formatVnd } from "./productData";

export interface CartLine {
  id: string;
  code: string;
  /** /{category-slug}/{product-slug} — where the line's product lives. */
  href: string;
  name: string;
  packageLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

/** What the shopper's own account brings to the price. */
export interface CartViewer {
  balance: number;
  /** Null when the tier earns nothing off, so nothing is promised. */
  tier: MemberTierValue | null;
  tierLabel: string;
  tierPercent: number;
  /** An agency's negotiated percent; 0 for everyone else. */
  agencyPercent: number;
}

/**
 * What the receipt shows once the basket is paid. Snapshotted in checkout()
 * the moment the server says yes: the refresh that follows empties `lines`,
 * so everything the receipt says about the goods has to be kept here.
 */
interface CheckoutReceipt {
  orderCodes: string[];
  /** The basket as it was paid — name, tier, count, price, picture. */
  lines: CartLine[];
  listTotal: number;
  agencyCut: number;
  agencyPercent: number;
  tierCut: number;
  tierLabel: string;
  tierPercent: number;
  voucherCut: number;
  /** The code that earned voucherCut; null when none was typed. */
  voucherCode: string | null;
  /** What the wallet paid. */
  total: number;
  /** What the wallet holds now. */
  balance: number;
  /** Epoch ms when the server answered — the receipt's timestamp. */
  paidAt: number;
}

/* Colour on this page carries meaning rather than decoration: the shop's red
   marks what a shopper acts on and what they will be charged, emerald marks
   money coming back off the price, and everything structural stays neutral.
   Two colours, one job each — a basket where every figure shouted would be
   the same grey wall in brighter paint. */
const STEP_BUTTON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 transition-colors hover:border-[var(--menzu-accent)]/40 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)] disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.03] disabled:hover:text-neutral-300";
const LABEL =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500";

/* The receipt prints top to bottom: each band rises into place a beat after
   the one above it (receipt-in, in globals.css). Written out in full because
   Tailwind reads class strings, not templates; stilled for readers who asked
   for less motion. */
const BAND_IN = {
  head: "motion-reduce:animate-none animate-[receipt-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]",
  lines:
    "motion-reduce:animate-none animate-[receipt-in_0.45s_cubic-bezier(0.22,1,0.36,1)_90ms_both]",
  sums: "motion-reduce:animate-none animate-[receipt-in_0.45s_cubic-bezier(0.22,1,0.36,1)_180ms_both]",
  foot: "motion-reduce:animate-none animate-[receipt-in_0.45s_cubic-bezier(0.22,1,0.36,1)_270ms_both]",
} as const;

/** "21:14 · 06/09/2026" — the clock and the date a paper receipt prints. */
function formatPaidAt(ms: number): string {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())} · ${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** The server's figure where it gave one, the basket's own quote otherwise. */
function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

/** One line of the summary: a name on the left, a figure on the right. */
function SumRow({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <span className="text-neutral-400">{label}</span>
      <span
        className={`shrink-0 tabular-nums ${
          tone === "ok" ? "font-bold text-emerald-400" : "font-semibold text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** One purchased line, as the basket showed it, with the controls gone. */
function ReceiptLine({ line }: { line: CartLine }) {
  return (
    <li className="flex items-center gap-3 py-3 sm:gap-4">
      {/* The name below is the line's link; the picture is the same door
          without a second name for screen readers to read out. */}
      <Link
        href={line.href}
        aria-hidden
        tabIndex={-1}
        className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt=""
            fill
            sizes="144px"
            className="object-cover object-[85%_center]"
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={line.href}
          className="block truncate text-sm font-black text-white transition-colors hover:text-[var(--menzu-accent)]"
        >
          {line.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Neutral here, not the accent: nothing on a receipt is left to
              act on, so the chip only tells one line from the next. */}
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
            {line.packageLabel}
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-neutral-500">
            ×{line.quantity} · {formatVnd(line.unitPrice)}đ / bản
          </span>
        </div>
      </div>
      <span className="shrink-0 text-right text-sm font-black tabular-nums text-white">
        {formatVnd(line.unitPrice * line.quantity)}đ
      </span>
    </li>
  );
}

/** Nothing in the basket — and, signed out, no basket to look at yet. */
export function CartEmpty({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-5">
        <ShoppingCart size={26} className="text-neutral-600" />
      </div>

      <p className="text-xl font-bold text-white mb-2">Giỏ hàng của bạn đang trống</p>
      <p className="text-sm text-neutral-400 max-w-[460px] leading-relaxed">
        {signedIn
          ? "Chọn một phần mềm và thêm gói bạn muốn vào giỏ. Tài khoản game thì mua thẳng trên trang sản phẩm."
          : "Hãy đăng nhập để xem giỏ hàng của bạn."}
      </p>

      <Link
        href={signedIn ? "/categories" : "/login?next=/cart"}
        className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
      >
        {signedIn ? "Quay lại cửa hàng" : "Đăng nhập"}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

/**
 * The basket: its lines on the left, what they cost on the right.
 *
 * The summary is its own column and sticks while the list scrolls, because
 * the figure a shopper is deciding on should not be the thing they have to
 * scroll to find. Below `lg` the two stack and the summary follows the lines,
 * which is the order they are read in on a phone.
 *
 * Quantities are written straight through to the server rather than kept in
 * local state and saved at the end: the same cart is reachable from another
 * tab and from the phone, and a total that disagreed between two open windows
 * would be worse than the extra request.
 *
 * Every figure here is computed with the very functions the checkout uses, so
 * the quote and the charge cannot drift. The server prices it again anyway —
 * this column is a promise, not an authority.
 */
export function CartView({
  lines,
  viewer,
}: {
  lines: CartLine[];
  viewer: CartViewer;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CheckoutReceipt | null>(null);

  const [voucher, setVoucher] = useState("");
  const [applied, setApplied] = useState<{ cut: number; total: number } | null>(
    null,
  );
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const receiptRef = useRef<HTMLElement>(null);

  /* The press that pays is usually made from the summary, half a screen down,
     and the basket it replaces was taller than the receipt — so without this
     the buyer is left staring at whatever happens to be under their scroll
     position. The page is put where the receipt is instead: no animation, no
     travel, the card is simply already there. Laid out before the browser
     paints, so the wrong position is never on screen to flicker away from.
     A receipt taller than the screen gets its head just under the fixed
     chrome, because the tick and the two figures are what should be landed
     on. */
  useLayoutEffect(() => {
    if (!done) return;
    const node = receiptRef.current;
    if (!node) return;
    // The site's fixed header, plus a little air above the card.
    const CHROME = 116;
    const box = node.getBoundingClientRect();
    const room = window.innerHeight - CHROME;
    const target =
      box.height < room
        ? window.scrollY + box.top - CHROME - (room - box.height) / 2
        : window.scrollY + box.top - CHROME;
    window.scrollTo({ top: Math.max(0, target), behavior: "instant" });
  }, [done]);
  const listTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  // Wholesale beats the tier and does not stack with a code, exactly as the
  // checkout decides it.
  const agencyCut =
    viewer.agencyPercent > 0
      ? Number(agencyCutFor(BigInt(listTotal), viewer.agencyPercent))
      : 0;
  const tierCut =
    agencyCut === 0 && viewer.tier
      ? Number(tierDiscountFor(BigInt(listTotal), viewer.tier))
      : 0;
  const voucherCut = applied?.cut ?? 0;
  const payable = listTotal - agencyCut - tierCut - voucherCut;
  const shortfall = Math.max(0, payable - viewer.balance);

  /** A quote belongs to the basket it was fetched for. */
  function dropQuote() {
    setApplied(null);
    setVoucherError(null);
  }

  async function send(
    method: "PATCH" | "DELETE",
    body: Record<string, unknown> | null,
    query = "",
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cart${query}`, {
        method,
        ...(body
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Thao tác thất bại");
        return;
      }
      // The basket changed, so any quote against the old one is gone with it.
      dropQuote();
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  async function applyVoucher() {
    if (!voucher.trim() || checking) return;
    setChecking(true);
    setVoucherError(null);
    setApplied(null);
    try {
      const res = await fetch("/api/vouchers/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: voucher.trim(), cart: true }),
      });
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        cut?: number;
        total?: number;
      };
      if (!res.ok || data.cut === undefined || data.total === undefined) {
        setVoucherError(data.error ?? "Không kiểm tra được mã");
        return;
      }
      setApplied({ cut: data.cut, total: data.total });
    } catch {
      setVoucherError("Không kết nối được máy chủ");
    } finally {
      setChecking(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Sent whether or not "Áp dụng" was pressed: the server prices it by
        // the same rules, so a typed-but-unchecked code still counts.
        body: JSON.stringify({ voucher: voucher.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        shortfall?: number;
        orderCodes?: string[];
        total?: number;
        listTotal?: number;
        agencyCut?: number;
        tierCut?: number;
        voucherCut?: number;
        balance?: number;
      };
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      if (!res.ok) {
        setError(
          typeof data.shortfall === "number"
            ? `${data.error} — cần nạp thêm ${formatVnd(data.shortfall)}đ`
            : (data.error ?? "Không thể thanh toán"),
        );
        return;
      }
      // The server's figures where it gave them, the basket's own quote
      // where it did not. The goods and the account's percentages come from
      // the props, which the refresh below is about to empty.
      setDone({
        orderCodes: data.orderCodes ?? [],
        lines,
        listTotal: numberOr(data.listTotal, listTotal),
        agencyCut: numberOr(data.agencyCut, agencyCut),
        agencyPercent: viewer.agencyPercent,
        tierCut: numberOr(data.tierCut, tierCut),
        tierLabel: viewer.tierLabel,
        tierPercent: viewer.tierPercent,
        voucherCut: numberOr(data.voucherCut, voucherCut),
        voucherCode: voucher.trim() || null,
        total: numberOr(data.total, payable),
        balance: numberOr(data.balance, viewer.balance),
        paidAt: Date.now(),
      });
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const copies = done.lines.reduce((sum, l) => sum + l.quantity, 0);
    const orders = done.orderCodes.length;
    const saved = done.agencyCut + done.tierCut + done.voucherCut;
    // One order has its own warranty form; several are picked from the list.
    const warrantyHref =
      orders === 1 ? `/orders/${done.orderCodes[0]}/bao-hanh` : "/orders";

    return (
      /* One card, read top to bottom like the slip a till prints: who paid
         and when, what was bought, the tear line, what it cost, the codes,
         and what to do next. The frame is an inset ring rather than a
         border so the tear line's notches can punch clean through it. */
      <section
        ref={receiptRef}
        aria-label="Biên lai thanh toán"
        className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl bg-white/[0.02] inset-ring-1 inset-ring-white/10"
      >
        {/* HEAD */}
        <div
          className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${BAND_IN.head}`}
        >
          <div className="flex items-center gap-4">
            {/* The buy dialog's tick, minus its sparks: the badge pops in,
                the stroke draws itself, one ring ripples out. */}
            <span className="relative grid h-12 w-12 shrink-0 place-items-center">
              <span
                aria-hidden
                className="tick-ring absolute inset-0 rounded-full border-2 border-emerald-400/60"
              />
              <span className="tick-badge grid h-12 w-12 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.22)]">
                <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              </span>
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Thanh toán thành công
              </h2>
              {/* The two figures a buyer wants first, before the bands print. */}
              <p className="mt-0.5 text-[13px] text-neutral-400">
                Đã trừ ví{" "}
                <span className="font-bold tabular-nums text-white">{formatVnd(done.total)}đ</span>
                {" · "}còn{" "}
                <span className="font-bold tabular-nums text-white">{formatVnd(done.balance)}đ</span>{" "}
                trong ví
              </p>
            </div>
          </div>
          {/* A row under the title on a phone, a column at the far right
              on a desk — the stamp in a receipt's corner. */}
          <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.06] pt-3 sm:flex-col sm:items-end sm:gap-1 sm:border-0 sm:pt-0">
            <span className={`${LABEL} inline-flex items-center gap-1.5`}>
              <Receipt className="h-3 w-3" aria-hidden />
              {orders === 1 ? "Biên lai" : `Biên lai · ${orders} đơn`}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-neutral-300">
              {formatPaidAt(done.paidAt)}
            </span>
          </div>
        </div>

        {/* LINES */}
        {done.lines.length > 0 ? (
          <div
            className={`border-t border-white/[0.06] px-5 pb-2 pt-4 sm:px-6 ${BAND_IN.lines}`}
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className={LABEL}>
                {done.lines.length} sản phẩm · {copies} bản
              </span>
              <span className={LABEL}>Thành tiền</span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {done.lines.map((line) => (
                <ReceiptLine key={line.id} line={line} />
              ))}
            </ul>
          </div>
        ) : null}

        {/* TEAR LINE — the goods above, the money below. The two notches
            are page-coloured discs sitting on the card's edge; the card
            clips their outer halves, so what is left reads as a punch. */}
        <div aria-hidden className="relative mt-2 border-t border-dashed border-white/10">
          <span className="absolute -left-[9px] -top-[9px] h-[18px] w-[18px] rounded-full border border-white/10 bg-[var(--menzu-bg)]" />
          <span className="absolute -right-[9px] -top-[9px] h-[18px] w-[18px] rounded-full border border-white/10 bg-[var(--menzu-bg)]" />
        </div>

        {/* FIGURES — the same rows the basket quoted, now as what was
            charged. Only printed when something came off: a list price that
            equals the charge would be a row saying nothing. The sum is white
            because there is nothing left to press; the balance is the green
            the basket used once the wallet covered it. */}
        <div className={`px-5 py-5 sm:px-6 ${BAND_IN.sums}`}>
          {saved > 0 ? (
            <div className="space-y-2.5">
              <SumRow label="Tạm tính" value={`${formatVnd(done.listTotal)}đ`} />
              {done.agencyCut > 0 ? (
                <SumRow
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <BadgePercent className="h-3.5 w-3.5" />
                      Giá đại lý −{done.agencyPercent}%
                    </span>
                  }
                  value={`−${formatVnd(done.agencyCut)}đ`}
                  tone="ok"
                />
              ) : null}
              {done.tierCut > 0 ? (
                <SumRow
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <BadgePercent className="h-3.5 w-3.5" />
                      Hạng {done.tierLabel}
                      {done.tierPercent > 0 ? ` −${formatTierPercent(done.tierPercent)}%` : ""}
                    </span>
                  }
                  value={`−${formatVnd(done.tierCut)}đ`}
                  tone="ok"
                />
              ) : null}
              {done.voucherCut > 0 ? (
                <SumRow
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      {done.voucherCode ? (
                        <>
                          Mã{" "}
                          <span className="font-mono font-bold tracking-wider text-neutral-300">
                            {done.voucherCode}
                          </span>
                        </>
                      ) : (
                        "Mã giảm giá"
                      )}
                    </span>
                  }
                  value={`−${formatVnd(done.voucherCut)}đ`}
                  tone="ok"
                />
              ) : null}
            </div>
          ) : null}

          <div className={saved > 0 ? "mt-4 border-t border-white/10 pt-4" : ""}>
            <div className="flex items-baseline justify-between gap-4">
              <span className={LABEL}>Đã trừ ví</span>
              <span className="text-xl font-black tabular-nums text-white">
                {formatVnd(done.total)}đ
              </span>
            </div>
            {saved > 0 ? (
              <p className="mt-1 text-right text-[11px] font-semibold text-emerald-400">
                Tiết kiệm {formatVnd(saved)}đ so với giá niêm yết
              </p>
            ) : null}
            <div className="mt-2.5 flex items-baseline justify-between gap-4 text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-neutral-500">
                <Wallet className="h-3.5 w-3.5" />
                Số dư ví còn lại
              </span>
              <span className="font-semibold tabular-nums text-emerald-400">
                {formatVnd(done.balance)}đ
              </span>
            </div>
          </div>
        </div>

        {/* NEXT — where the keys are, and the two ways off this page. */}
        <div
          className={`border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:px-6 ${BAND_IN.foot}`}
        >
          {/* A div, not a p: the codes below are buttons, and a paragraph
              is no place to keep them. */}
          <div
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] font-semibold text-emerald-400"
          >
            <p className="flex items-start gap-2.5">
              <KeyRound className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
              {/* The orders are named in the sentence that says the keys are
                  in them — the code IS the order's name. The chips copy
                  rather than open; the red button below is the way in. */}
              <span>
                {copies === 1
                  ? "Key và link tải đã giao vào đơn"
                  : `${copies} key và link tải đã giao vào ${orders} đơn`}{" "}
                {done.orderCodes.map((code, index) => (
                  <span key={code}>
                    {index > 0 ? ", " : null}
                    <Link
                      href={`/orders?don=${code}`}
                      className="font-mono font-bold tracking-wider text-emerald-300 underline decoration-emerald-400/50 underline-offset-2 transition-colors hover:text-white hover:decoration-white"
                    >
                      {code}
                    </Link>
                  </span>
                ))}
                {" "}
                — bấm mã để mở đơn. Đọc hướng dẫn cài đặt trên trang tool trước
                khi chạy.
              </span>
            </p>
          </div>
          {/* One red button, the dominant object; the other door stays quiet. */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/orders"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 sm:flex-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--menzu-accent)]/25 transition-colors hover:bg-[var(--menzu-accent-dark)]"
            >
              <KeyRound className="h-4 w-4" aria-hidden />
              Lấy key trong đơn hàng
            </Link>
            <Link
              href="/categories"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Tiếp tục mua
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-500">
            Cần hỗ trợ?{" "}
            <Link
              href={warrantyHref}
              className="inline-flex items-center gap-1 font-semibold text-neutral-300 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Gửi bảo hành ngay trong đơn
            </Link>
          </p>
        </div>
      </section>
    );
  }

  // The empty state is drawn here, not by the page, on purpose: the success
  // card above is client state, and the refresh that follows a checkout
  // re-renders the page with an empty basket. Had the page swapped this
  // component out for its own "nothing here" view, the card would have gone
  // with it — the shopper paid and saw only an empty cart.
  if (lines.length === 0) return <CartEmpty signedIn />;

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* LINES */}
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={LABEL}>
            {lines.length} sản phẩm · {count} bản
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => send("DELETE", null, "?all=1")}
            className="text-[11px] font-bold text-neutral-500 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            Xoá hết
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li
              key={line.id}
              /* Two rows of three on a phone — picture, name and bin above,
                 stepper and total below — and one row of five on a desk. One
                 DOM for both; only where each cell lands changes. A single
                 flex row wrapped here before, and at phone width the name
                 was the thing squeezed to nothing. */
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-3.5 transition-colors hover:border-[var(--menzu-accent)]/25 sm:grid-cols-[auto_minmax(0,1fr)_auto_6rem_auto] sm:gap-4 sm:p-4"
            >
              <Link
                href={line.href}
                className="relative col-start-1 row-span-2 row-start-1 h-14 w-20 shrink-0 self-start overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors group-hover:border-[var(--menzu-accent)]/30 sm:row-span-1 sm:h-16 sm:w-24 sm:self-center"
              >
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="192px"
                    className="object-cover object-[85%_center]"
                  />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={line.href}
                  className="line-clamp-2 text-sm font-black leading-snug text-white transition-colors hover:text-[var(--menzu-accent)]"
                >
                  {line.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {/* The tier is what distinguishes one line from the next when
                      all three are the same tool, so it is the chip that gets
                      the colour. */}
                  <span className="whitespace-nowrap rounded-md border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                    {line.packageLabel}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-neutral-400">
                    {formatVnd(line.unitPrice)}đ / bản
                  </span>
                </div>
              </div>

              <div className="col-start-2 flex items-center gap-1.5 sm:col-start-3 sm:row-start-1">
                <button
                  type="button"
                  aria-label={`Giảm số lượng ${line.name}`}
                  disabled={busy || line.quantity <= 1}
                  onClick={() =>
                    send("PATCH", { id: line.id, quantity: line.quantity - 1 })
                  }
                  className={STEP_BUTTON}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-black tabular-nums text-white">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Tăng số lượng ${line.name}`}
                  disabled={busy || line.quantity >= 99}
                  onClick={() =>
                    send("PATCH", { id: line.id, quantity: line.quantity + 1 })
                  }
                  className={STEP_BUTTON}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Money the shopper will part with, in the colour every price
                  on this site is written in. */}
              <span className="col-start-3 justify-self-end text-right text-sm font-black tabular-nums text-[var(--menzu-accent)] sm:col-start-4 sm:row-start-1">
                {formatVnd(line.unitPrice * line.quantity)}đ
              </span>

              <button
                type="button"
                aria-label={`Xoá ${line.name}`}
                disabled={busy}
                onClick={() =>
                  send("DELETE", null, `?id=${encodeURIComponent(line.id)}`)
                }
                className="col-start-3 row-start-1 self-start justify-self-end rounded-lg p-2 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 sm:col-start-5 sm:self-center"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* SUMMARY */}
      <aside className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[var(--menzu-accent)]/[0.06] via-white/[0.02] to-white/[0.02] p-5 lg:sticky lg:top-28">
        {/* The one warm corner on the page, behind the figure it is here to
            draw the eye to. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--menzu-accent)]/10 blur-3xl"
        />
        {/* The same red bar the page's own title wears, so the summary reads
            as part of this page rather than a panel dropped onto it. */}
        <h2 className="relative flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-white">
          <span
            aria-hidden
            className="h-4 w-1 shrink-0 rounded-full bg-[var(--menzu-accent)]"
          />
          Tóm tắt đơn hàng
        </h2>

        {/* VOUCHER */}
        <div className="relative mt-4">
          <span className={`${LABEL} mb-2 flex items-center gap-1.5`}>
            <Ticket className="h-3 w-3 text-[var(--menzu-accent)]" />
            Mã giảm giá
          </span>
          <div className="flex gap-2">
            <input
              value={voucher}
              onChange={(event) => {
                setVoucher(event.target.value.toUpperCase());
                dropQuote();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyVoucher();
                }
              }}
              placeholder="Nhập mã"
              aria-label="Mã giảm giá"
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-950/60 px-3 font-mono text-[13px] font-bold uppercase tracking-wider text-white outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 focus:border-[var(--menzu-accent)]/60"
            />
            <button
              type="button"
              onClick={applyVoucher}
              disabled={checking || !voucher.trim()}
              className="h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {checking ? "Đang kiểm…" : "Áp dụng"}
            </button>
          </div>
          {voucherError ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-red-400">
              {voucherError}
            </p>
          ) : null}
          {applied ? (
            <p className="mt-2 text-[11px] font-semibold text-emerald-400">
              Đã áp dụng — giảm {formatVnd(applied.cut)}đ
            </p>
          ) : null}
        </div>

        {/* FIGURES */}
        <div className="relative mt-5 space-y-2.5 border-t border-white/[0.06] pt-4">
          <SumRow label="Tạm tính" value={`${formatVnd(listTotal)}đ`} />
          {agencyCut > 0 ? (
            <SumRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Giá đại lý −{viewer.agencyPercent}%
                </span>
              }
              value={`−${formatVnd(agencyCut)}đ`}
              tone="ok"
            />
          ) : null}
          {tierCut > 0 ? (
            <SumRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Hạng {viewer.tierLabel} −{formatTierPercent(viewer.tierPercent)}%
                </span>
              }
              value={`−${formatVnd(tierCut)}đ`}
              tone="ok"
            />
          ) : null}
          {voucherCut > 0 ? (
            <SumRow
              label="Mã giảm giá"
              value={`−${formatVnd(voucherCut)}đ`}
              tone="ok"
            />
          ) : null}
        </div>

        <div className="relative mt-4 border-t border-white/10 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className={LABEL}>Tổng thanh toán</span>
            {/* The figure the whole page is about. */}
            <span className="text-xl font-black tabular-nums text-[var(--menzu-accent)]">
              {formatVnd(payable)}đ
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-4 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <Wallet className="h-3.5 w-3.5" />
              Số dư ví
            </span>
            {/* Green when the wallet covers it — the answer to "can I press the
                button" is worth reading without doing the subtraction. */}
            <span
              className={`tabular-nums font-semibold ${
                shortfall > 0 ? "text-neutral-300" : "text-emerald-400"
              }`}
            >
              {formatVnd(viewer.balance)}đ
            </span>
          </div>
          {shortfall > 0 ? (
            <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400">
              Cần nạp thêm {formatVnd(shortfall)}đ
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="relative mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] font-semibold text-red-400"
          >
            {error}
          </p>
        ) : null}

        {/* The button already carried the accent; the glow under it is what
            makes it read as the end of the page rather than one more box. */}
        {shortfall > 0 ? (
          <Link
            href="/wallet"
            className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--menzu-accent)]/25 transition-colors hover:bg-[var(--menzu-accent-dark)]"
          >
            Nạp tiền
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={checkout}
            className="relative mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--menzu-accent)] text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--menzu-accent)]/25 transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-60 disabled:shadow-none"
          >
            {busy ? "Đang xử lý…" : "Thanh toán"}
          </button>
        )}

        <p className="relative mt-3 text-[11px] leading-relaxed text-neutral-500">
          Trừ thẳng vào số dư ví. Key được giao ngay sau khi thanh toán.
        </p>
      </aside>
    </div>
  );
}
