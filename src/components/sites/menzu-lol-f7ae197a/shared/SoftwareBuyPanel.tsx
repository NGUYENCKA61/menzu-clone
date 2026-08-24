"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Headphones, Minus, Plus, RefreshCw, ShieldCheck, Zap } from "lucide-react";

import { formatVnd } from "./productData";

export interface SoftwarePackageView {
  id: string;
  /** Shown verbatim — "1 ngày", "Vĩnh viễn". */
  label: string;
  price: number;
  durationHours: number | null;
}

export interface SoftwareDetail {
  code: string;
  name: string;
  description: string;
  softwareStatus: "UNDETECTED" | "DETECTED" | "UPDATING" | null;
  images: string[];
  /** Raw YouTube link as the shop pasted it; the gallery parses it. */
  videoUrl: string | null;
  /** Facts the description block prints. Null hides its own card. */
  version: string | null;
  platform: string | null;
  packages: SoftwarePackageView[];
  categoryName: string;
  categorySlug: string;
  inStock: boolean;
  /** The figure a listing card shows before a tier is picked. */
  price: number;
}

/**
 * The detection pill. Colour carries the meaning here, so the three states are
 * written out as whole class strings — Tailwind cannot see a composed one.
 */
const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  UNDETECTED: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Undetected" },
  DETECTED: { dot: "bg-red-500", text: "text-red-400", label: "Detected" },
  UPDATING: { dot: "bg-amber-500", text: "text-amber-400", label: "Đang cập nhật" },
};

const TRUST = [
  { icon: Zap, label: "Giao key tự động" },
  { icon: ShieldCheck, label: "Thanh toán an toàn" },
  { icon: RefreshCw, label: "Bảo hành sản phẩm" },
  { icon: Headphones, label: "Hỗ trợ 24/7" },
];

const STEP_BUTTON =
  "h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-40 disabled:hover:bg-white/[0.03] transition-colors";

const MAX_QUANTITY = 99;

/**
 * Right-hand panel of a software product page.
 *
 * The tier list is the axis everything else turns on: the headline price, what
 * the cart is given and what the wallet is charged all read from the chosen
 * package rather than from `product.price`, which on a tiered product is only
 * the "from" figure a listing card prints.
 */
export function SoftwareBuyPanel({
  software,
  initialPackageId,
}: {
  software: SoftwareDetail;
  /** From `?pkg=` — the tier a listing card was already showing. */
  initialPackageId?: string;
}) {
  const router = useRouter();

  // The tier carried over from the card wins, so arriving here does not throw
  // away the choice just made. Otherwise the first — a page that opens with no
  // price at all makes the reader work before it tells them anything.
  const [packageId, setPackageId] = useState(
    software.packages.some((p) => p.id === initialPackageId)
      ? initialPackageId!
      : (software.packages[0]?.id ?? ""),
  );
  const [quantity, setQuantity] = useState(1);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  /** Refusals from the buy call. Kept apart from `msg`: the dialog covers the
   *  panel, so anything printed out there while it is open is unreadable. */
  const [dialogError, setDialogError] = useState<string | null>(null);
  /** The wallet, read when the dialog opens; null until it answers. */
  const [balance, setBalance] = useState<number | null>(null);
  /** Set on success so the panel can offer the way to the order. */
  const [orderCode, setOrderCode] = useState<string | null>(null);

  const chosen = useMemo(
    () => software.packages.find((p) => p.id === packageId) ?? null,
    [software.packages, packageId],
  );

  const total = (chosen?.price ?? 0) * quantity;
  // Unknown until the wallet answers, and unknown counts as affordable: a slow
  // reply must not stand between a buyer with money and the confirm button.
  // The server checks the balance again anyway, inside the transaction.
  const canAfford = balance === null || balance >= total;

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  // The wallet is read when the dialog opens rather than on page load: it is
  // the one moment the figure matters, and it can have changed in another tab
  // since the page was drawn. A guest has no wallet to show and stays null, so
  // they still get the confirm button — pressing it is what sends them to the
  // login page with this product waiting on the other side.
  useEffect(() => {
    if (!confirming) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { balance?: number } | null }) => {
        if (!cancelled) setBalance(d.user ? (d.user.balance ?? 0) : null);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [confirming]);

  // Changing the tier invalidates any quoted shortfall, and leaving the old
  // one on screen would have it argue with the price above it.
  function pickPackage(id: string) {
    setPackageId(id);
    setMsg(null);
    setDialogError(null);
  }

  async function addToCart() {
    if (!chosen) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: software.code, packageId: chosen.id, quantity }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/software/${software.code}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không thêm được vào giỏ" });
        return;
      }
      setMsg({
        tone: "ok",
        text: `Đã thêm ${chosen.label} ×${quantity} vào giỏ hàng`,
      });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    if (!chosen) return;
    setBusy(true);
    setMsg(null);
    setDialogError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: software.code, packageId: chosen.id, quantity }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/software/${software.code}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderCode?: string;
        shortfall?: number;
      };
      if (!res.ok) {
        // Stays in the dialog, which is still open and covering the panel.
        setDialogError(data.error ?? "Không thể tạo đơn hàng");
        // The server knows the exact gap; trust it over the figure the wallet
        // read a moment ago, which a purchase in another tab may have moved.
        if (typeof data.shortfall === "number" && chosen) {
          setBalance(Math.max(0, total - data.shortfall));
        }
        return;
      }
      setConfirming(false);
      setOrderCode(data.orderCode ?? null);
      setMsg({ tone: "ok", text: `Đã mua — mã đơn ${data.orderCode}` });
      router.refresh();
    } catch {
      setDialogError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  const status = software.softwareStatus ? STATUS_STYLE[software.softwareStatus] : null;

  return (
    <div className="flex flex-col gap-6">
      {status ? (
        <span className="self-start inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${status.text}`}
          >
            {status.label}
          </span>
        </span>
      ) : null}

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          {software.name}
        </h1>
        {software.description ? (
          <p className="text-sm leading-relaxed text-neutral-400 max-w-[560px]">
            {software.description}
          </p>
        ) : null}
      </div>

      {software.packages.length > 0 ? (
        <div className="space-y-2.5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Chọn gói:
          </span>
          <div className="flex flex-wrap gap-2.5">
            {software.packages.map((p) => {
              const selected = p.id === packageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPackage(p.id)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "flex items-center gap-2.5 rounded-xl border border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/[0.07] px-4 py-2.5 transition-colors"
                      : "flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 hover:border-white/25 transition-colors"
                  }
                >
                  <span className="text-[13px] font-bold text-white whitespace-nowrap">
                    {p.label}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--menzu-accent)] whitespace-nowrap">
                    {formatVnd(p.price)}đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-4xl font-black text-white">{formatVnd(total)}đ</p>
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              software.inStock ? "bg-emerald-500" : "bg-neutral-600"
            }`}
          />
          <span className={software.inStock ? "text-emerald-400" : "text-neutral-500"}>
            {software.inStock ? "Còn hàng" : "Tạm hết hàng"}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-neutral-400">Số lượng:</span>
        <button
          type="button"
          aria-label="Giảm số lượng"
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className={STEP_BUTTON}
        >
          <Minus size={16} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Số lượng"
          value={quantity}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ""));
            setQuantity(Math.min(MAX_QUANTITY, Math.max(1, n || 1)));
          }}
          className="h-11 w-16 rounded-xl border border-white/10 bg-white/[0.03] text-center text-sm font-bold text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors"
        />
        <button
          type="button"
          aria-label="Tăng số lượng"
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          className={STEP_BUTTON}
        >
          <Plus size={16} />
        </button>
      </div>

      {msg ? (
        <p
          role="alert"
          className={
            msg.tone === "ok"
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] font-semibold text-emerald-400"
              : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] font-semibold text-red-400"
          }
        >
          {msg.text}
          {/* A paid order is only half the errand — the key and the download
              live on the order, so the way there goes with the receipt. */}
          {msg.tone === "ok" && orderCode ? (
            <>
              {" · "}
              <Link href="/orders" className="underline hover:text-white">
                Xem đơn hàng
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {/* Buying outright is the primary action, so it leads and carries the
          filled accent. The basket keeps the same size and position in the
          stack but drops to the outlined treatment — two solid red buttons
          stacked would leave neither of them reading as the main one. */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={busy || !chosen || !software.inStock}
          onClick={() => setConfirming(true)}
          className="w-full h-14 rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 transition-colors text-[13px] font-black uppercase tracking-widest text-white"
        >
          Mua ngay
        </button>
        <button
          type="button"
          disabled={busy || !chosen || !software.inStock}
          onClick={addToCart}
          className="w-full h-14 rounded-2xl border border-[var(--menzu-accent)]/70 bg-white/[0.02] hover:bg-white/[0.06] disabled:opacity-50 transition-colors text-[13px] font-black uppercase tracking-widest text-white"
        >
          Thêm vào giỏ
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {TRUST.map((t, index) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className={`flex flex-col items-center gap-2 px-3 py-5 text-center ${
                index < TRUST.length - 1 ? "sm:border-r border-white/[0.07]" : ""
              }`}
            >
              <Icon size={18} className="text-[var(--menzu-accent)]" />
              <span className="text-[11px] font-semibold text-neutral-400 leading-tight">
                {t.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Buying spends real balance, so it asks once and shows the figure it is
          about to take rather than only the unit price above. */}
      {confirming && chosen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setConfirming(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận mua"
            className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0e0e11] p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-white">Xác nhận mua</h2>
            <div className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Sản phẩm</span>
                <span className="font-semibold text-white text-right">{software.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Gói</span>
                <span className="font-semibold text-white">{chosen.label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Số lượng</span>
                <span className="font-semibold text-white">{quantity}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2 mt-2">
                <span className="text-neutral-500">Trừ vào ví</span>
                <span className="font-black text-[var(--menzu-accent)]">
                  {formatVnd(total)}đ
                </span>
              </div>

              {/* The figure the decision actually turns on. Withheld until the
                  wallet answers rather than flashing a zero that would read as
                  an empty account. */}
              {balance !== null ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500">Số dư ví</span>
                    <span className="font-semibold text-white">{formatVnd(balance)}đ</span>
                  </div>
                  {!canAfford ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-neutral-500">Cần nạp thêm</span>
                      <span className="font-bold text-red-400">
                        {formatVnd(total - balance)}đ
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {dialogError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
              >
                {dialogError}
              </p>
            ) : null}

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 h-11 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[11px] font-black uppercase tracking-widest text-neutral-300"
              >
                Huỷ
              </button>
              {/* A wallet that cannot cover this offers no confirm button —
                  pressing it would only fetch the same refusal — and sends the
                  buyer to top up instead. */}
              {canAfford ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={buyNow}
                  className="flex-1 h-11 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-60 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
                >
                  {busy ? "Đang xử lý…" : "Xác nhận"}
                </button>
              ) : (
                <Link
                  href="/wallet"
                  className="flex-1 h-11 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white inline-flex items-center justify-center"
                >
                  Nạp tiền
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
