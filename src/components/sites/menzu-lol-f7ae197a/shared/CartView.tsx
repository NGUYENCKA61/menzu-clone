"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  Check,
  Minus,
  Plus,
  Receipt,
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

const STEP_BUTTON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40";
const LABEL =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500";

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
  const [done, setDone] = useState<{
    orderCodes: string[];
    total: number;
    balance: number;
  } | null>(null);

  const [voucher, setVoucher] = useState("");
  const [applied, setApplied] = useState<{ cut: number; total: number } | null>(
    null,
  );
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

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
      setDone({
        orderCodes: data.orderCodes ?? [],
        total: typeof data.total === "number" ? data.total : payable,
        balance: typeof data.balance === "number" ? data.balance : viewer.balance,
      });
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <p className="mt-4 text-xl font-black uppercase tracking-wider text-white">
          Thanh toán thành công
        </p>
        <p className="mt-1.5 text-sm text-neutral-400">
          {done.orderCodes.length === 1
            ? "Đơn đã ghi vào lịch sử mua của bạn."
            : `Đã tạo ${done.orderCodes.length} đơn hàng.`}
        </p>

        <div className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left">
          <span className={LABEL}>
            {done.orderCodes.length === 1 ? "Mã đơn hàng" : "Các mã đơn hàng"}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {done.orderCodes.map((code) => (
              <span
                key={code}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[13px] font-bold tracking-wider text-white"
              >
                {code}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
            <SumRow label="Đã trừ ví" value={`${formatVnd(done.total)}đ`} />
            <SumRow
              label="Số dư ví còn lại"
              value={`${formatVnd(done.balance)}đ`}
            />
          </div>
        </div>

        <Link
          href="/orders"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--menzu-accent)] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
        >
          <Receipt className="h-4 w-4" />
          Xem đơn hàng
        </Link>
      </div>
    );
  }

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
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/[0.12] sm:p-4"
            >
              <Link
                href={line.href}
                className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950"
              >
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="96px"
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
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                    {line.packageLabel}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-neutral-500">
                    {formatVnd(line.unitPrice)}đ / bản
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
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

              <span className="w-24 text-right text-sm font-black tabular-nums text-white">
                {formatVnd(line.unitPrice * line.quantity)}đ
              </span>

              <button
                type="button"
                aria-label={`Xoá ${line.name}`}
                disabled={busy}
                onClick={() =>
                  send("DELETE", null, `?id=${encodeURIComponent(line.id)}`)
                }
                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* SUMMARY */}
      <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:sticky lg:top-28">
        <h2 className="text-sm font-black uppercase tracking-wider text-white">
          Tóm tắt đơn hàng
        </h2>

        {/* VOUCHER */}
        <div className="mt-4">
          <span className={`${LABEL} mb-2 flex items-center gap-1.5`}>
            <Ticket className="h-3 w-3" />
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
        <div className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-4">
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

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className={LABEL}>Tổng thanh toán</span>
            <span className="text-xl font-black tabular-nums text-white">
              {formatVnd(payable)}đ
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-4 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <Wallet className="h-3.5 w-3.5" />
              Số dư ví
            </span>
            <span className="tabular-nums font-semibold text-neutral-300">
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
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] font-semibold text-red-400"
          >
            {error}
          </p>
        ) : null}

        {shortfall > 0 ? (
          <Link
            href="/wallet"
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--menzu-accent)] text-[12px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)]"
          >
            Nạp tiền
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={checkout}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--menzu-accent)] text-[12px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent-dark)] disabled:opacity-60"
          >
            {busy ? "Đang xử lý…" : "Thanh toán"}
          </button>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
          Trừ thẳng vào ví Menzu. Key được giao ngay sau khi thanh toán.
        </p>
      </aside>
    </div>
  );
}
