"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Headphones, Loader2, Minus, Plus, RefreshCw, ShieldCheck, Zap } from "lucide-react";

import type { ProductBadge } from "@/lib/productBadges";
import type { ProductFeature } from "@/lib/productFeatures";
import type { ProductRequirement } from "@/lib/productRequirements";
import { productHref } from "@/lib/routes";

import { SMALL_CAPS_LABEL } from "./filterChrome";
import { ProductBadgeChip } from "./ProductBadgeChip";
import { titleCase } from "@/lib/displayCase";
import { formatVnd } from "./productData";
import { SoftwareCheckoutDialog } from "./SoftwareCheckoutDialog";
import { StickyBuyBar } from "./StickyBuyBar";
import { StatusToast } from "./StatusToast";
import { StockLine } from "./StockLine";
import { isSalesLocked, salesLockReason, SOFTWARE_STATUS } from "@/lib/softwareStatus";
import { softwareBuyable, softwareStockLabel } from "@/lib/softwareStock";

export interface SoftwarePackageView {
  id: string;
  /** Shown verbatim — "1 ngày", "Vĩnh viễn". */
  label: string;
  price: number;
  /**
   * The shelf price while a flash sale runs on this tier, to cross out beside
   * `price`, which is then the sale price. Absent when there is no sale.
   */
  listPrice?: number;
  durationHours: number | null;
}

/** Who is looking at a buy panel: a guest, a member, or a level-2 account. */
export type BuyerLevel = "guest" | "member" | "verified";

export interface SoftwareDetail {
  code: string;
  /** The product half of its address: /{category-slug}/{slug}. */
  slug: string;
  name: string;
  /** The long write-up, as stored: the "Mô tả sản phẩm" section's. */
  description: string;
  /** "Mô tả ngắn", the line under the title; "" prints nothing there. */
  summary: string;
  /** The product's own "Tính năng nổi bật"; empty means use the default. */
  features: ProductFeature[];
  /** The product's own "Yêu cầu hệ thống"; empty means use the default. */
  requirements: ProductRequirement[];
  /** The write-up under that list, as editor HTML. "" draws nothing. */
  featuresNote: string;
  /** "Hướng dẫn cài đặt" as editor HTML; "" prints the default sentence. */
  guideHtml: string;
  /** "Hướng dẫn thiết lập & sử dụng" as editor HTML; "" prints the default. */
  setupGuideHtml: string;
  softwareStatus: "UNDETECTED" | "STABLE" | "UPDATED" | "RISKY" | "UPDATING" | "DETECTED" | null;
  /** Whether that state is drawn here. Resolved on the server: the shop can
   *  force it either way, and left alone it stays out of the badges' way. The
   *  storefront card shows the pill regardless. */
  showStatus: boolean;
  /** What share of the price comes back if the tool fails, as a whole percent.
   *  Null means the shop has set none and the policy block stays silent. */
  refundRate: number | null;
  /** Sold to level-2 ("xác thực cấp 2") accounts only. */
  verifiedOnly: boolean;
  /** The shop's own pills beside the detection state — "TOP #1 BÁN CHẠY",
   *  "MỚI RA MẮT". Up to two, each with its own colour; empty draws none. */
  badges: ProductBadge[];
  images: string[];
  /** Raw YouTube link as the shop pasted it; the gallery parses it. */
  videoUrl: string | null;
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
export const STATUS_STYLE: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  UNDETECTED: {
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    label: "Chưa phát hiện",
  },
  DETECTED: { dot: "bg-red-500", text: "text-red-400", label: "Đã phát hiện" },
  UPDATING: {
    dot: "bg-amber-500",
    text: "text-amber-400",
    label: "Đang cập nhật",
  },
  STABLE: { dot: "bg-sky-500", text: "text-sky-400", label: "Ổn định" },
  UPDATED: { dot: "bg-violet-500", text: "text-violet-400", label: "Cập nhật mới" },
  RISKY: { dot: "bg-orange-500", text: "text-orange-400", label: "Rủi ro" },
};

const TRUST = [
  { icon: Zap, label: "Giao key tự động" },
  { icon: ShieldCheck, label: "Thanh toán an toàn" },
  { icon: RefreshCw, label: "Bảo hành sản phẩm" },
  { icon: Headphones, label: "Hỗ trợ 24/7" },
];

const STEP_BUTTON =
  "h-11 w-11 shrink-0 flex items-center justify-center rounded-[10px] border border-line bg-raise text-mist hover:border-line-strong hover:text-frost disabled:opacity-40 disabled:hover:border-line transition-colors";

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
  initialQuantity,
  viewer,
  old = false,
}: {
  software: SoftwareDetail;
  /** From `?pkg=` — the tier a listing card was already showing. */
  initialPackageId?: string;
  /** From `?sl=` — the quantity a guest had set before the login gate. */
  initialQuantity?: number;
  /** Following this tool's status; null for a guest. Still threaded down from
   *  the route, unread while "Nhận thông báo" is off the page. */
  statusSubscribed: boolean | null;
  /** Who is looking, for a tool sold to level 2 only. */
  viewer: BuyerLevel;
  /** LAB: ?ban=cu, the pill in its own colours from before 19/10/2026. */
  old?: boolean;
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
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  /** The page's own buttons; the phone's sticky bar shows while they are off screen. */
  const buyRef = useRef<HTMLDivElement>(null);

  const chosen = useMemo(
    () => software.packages.find((p) => p.id === packageId) ?? null,
    [software.packages, packageId],
  );

  const total = (chosen?.price ?? 0) * quantity;

  // Changing the tier clears whatever the last action said — a "đã thêm vào
  // giỏ" line about the other tier would argue with the price above it.
  function pickPackage(id: string) {
    setPackageId(id);
    setToast(null);
  }

  async function addToCart() {
    if (!chosen) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: software.code,
          packageId: chosen.id,
          quantity,
        }),
      });
      if (res.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(productHref(software.categorySlug, software.slug))}`,
        );
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
      };
      if (!res.ok) {
        setToast({ tone: "error", text: data.error ?? "Không thêm được vào giỏ" });
        return;
      }
      setToast({
        tone: "success",
        text: `Đã thêm ${chosen.label} ×${quantity} vào giỏ hàng`,
      });
      router.refresh();
    } catch {
      setToast({ tone: "error", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  // The site's state colours (lib/softwareStatus), so the pill here reads as
  // the cards, the history and the subscribe tab do; this page kept a copy
  // of its own (19/10/2026). Its chip is theirs too: the tint, rim and 8px
  // corners of the history and subscribe tabs, where it was a round grey
  // pill ("làm thử", 19/10/2026).
  const status =
    software.showStatus && software.softwareStatus
      ? (old ? STATUS_STYLE : SOFTWARE_STATUS)[software.softwareStatus]
      : null;
  const statusTile =
    !old && software.showStatus && software.softwareStatus
      ? SOFTWARE_STATUS[software.softwareStatus].tile
      : "";
  // Said here even when the shop hides the status pill: a greyed-out button
  // with no reason reads as a broken page. The server refuses the order and
  // the basket line either way; this only spares the shopper the round trip.
  const locked = isSalesLocked(software.softwareStatus);
  // Sold to level 2 only (the owner, 12/10/2026): said here, and refused by
  // the server either way.
  const gated = software.verifiedOnly && viewer !== "verified";

  return (
    <div className="flex flex-col gap-6">
      {/* The state, and beside it whatever the shop wants said about this tool
          — "TOP #1 BÁN CHẠY", a launch, a sale. "Nhận thông báo" stood here
          until the shop asked for it off the page; the button, its route and
          the following it records all still exist, so putting it back is
          restoring three lines.

          The row is drawn whenever either half has something to say: a tool
          with no detection state can still carry a badge, and a tool whose
          shop has hidden the state carries only badges. */}
      {status || software.badges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {status && old ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raise px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              <span
                className={`text-[13px] font-medium ${status.text}`}
              >
                {status.label}
              </span>
            </span>
          ) : status ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${statusTile}`}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          ) : null}
          {software.badges.map((badge) => (
            <ProductBadgeChip key={badge.label} badge={badge} old={old} />
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {/* LAB (Launcher): the name in the display face and sentence case
            (displayCase keeps CS2, ESP, OBV ...); the full typed name is in
            the breadcrumb's last crumb and the page title. */}
        {/* The name as its card on the shelf writes it (the owner,
            25/10/2026: "sửa lại tiêu đề trang chi tiết sản phẩm khớp card
            sản phẩm", "thiếu in hoa chữ đầu nè"): every word's first letter
            capital, the acronyms kept. The words only, not the card's red
            bar ("bỏ cái | đỏ", "chỉ sửa nội dung thôi mà"). */}
        <h1 className="font-display text-[26px] font-black leading-[1.15] text-frost sm:text-[30px] lg:text-[36px]">
          {titleCase(software.name)}
        </h1>
        {/* The shop's own "Mô tả ngắn", or nothing: no opening lines lifted
            from the long write-up, and no stock sentence in its place. */}
        {software.summary ? (
          <p className="max-w-[60ch] text-[16px] leading-[1.65] text-mist">
            {software.summary}
          </p>
        ) : null}
      </div>

      {/* The buy block laid out as the 3100 site sets it (the owner,
          25/10/2026: "sửa cho giống bố cục 3100 đi"): the tiers as pills in
          a row, the buttons stacked full width, the reassurances in a framed
          row. Its type keeps the category page's, role for role, at
          lmarket's ratios ("rồi sửa lại tỉ lệ cho đồng bộ"): the captions in
          the filter labels' small capitals, the price in the cards' black
          with their tight tracking and small "đ", as large as the title on a
          desktop, body copy at the one 16px, buttons a step over the cards'
          12px. */}
      {software.packages.length > 0 ? (
        <div className="space-y-2.5">
          <span className={`${SMALL_CAPS_LABEL} ml-1 block`}>
            Chọn gói
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
                  {/* A tier on flash sale: its shelf price crossed out, then
                      the price the buyer pays. */}
                  {p.listPrice ? (
                    <span className="text-[11px] font-semibold text-neutral-500 line-through whitespace-nowrap">
                      {formatVnd(p.listPrice)}đ
                    </span>
                  ) : null}
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
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-3xl font-black leading-none tabular-nums tracking-[-0.03em] text-frost sm:text-4xl">
            {formatVnd(total)}
            <span className="text-[0.5em] font-bold">đ</span>
          </span>
          {chosen?.listPrice ? (
            // The tier is on flash sale: what it costs off sale, crossed out,
            // and the percent the sale takes off.
            <>
              <span className="text-base font-bold text-neutral-500 line-through sm:text-lg">
                {formatVnd(chosen.listPrice * quantity)}đ
              </span>
              <span className="rounded-md bg-[var(--menzu-accent)]/15 px-2 py-0.5 text-[12px] font-black text-[var(--menzu-accent)]">
                -{Math.round((1 - chosen.price / chosen.listPrice) * 100)}%
              </span>
            </>
          ) : null}
        </p>
        {/* A per-day figure ("≈ 64.286đ/ngày") stood under the price until
            the shop asked for it off the page. */}
        {/* One rule with the page's Product markup (lib/softwareStock.ts):
            a locked or unpriced tool no longer reads "Còn hàng" right under
            the sentence saying it cannot be bought. */}
        <StockLine
          inStock={softwareBuyable(software)}
          label={softwareStockLabel(software)}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className={SMALL_CAPS_LABEL}>
          Số lượng
        </span>
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

      {locked ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] leading-relaxed text-red-300">
          Tool {salesLockReason(software.softwareStatus)}, shop tạm khóa mua key. Theo dõi kênh
          thông báo để biết khi có bản mới.
        </p>
      ) : gated ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Bản này chỉ bán cho tài khoản xác thực cấp 2.{" "}
          {viewer === "guest" ? (
            "Đăng nhập rồi vào Bảo mật → Xác thực cấp 2 để đăng ký."
          ) : (
            <Link
              href="/security?tab=verify"
              className="font-bold text-white underline underline-offset-2"
            >
              Xác thực ngay
            </Link>
          )}
        </p>
      ) : software.packages.length === 0 ? (
        // A tool the shop has listed but not priced yet. Both buttons are
        // already dead in that case — there is no tier to put in a basket —
        // and a page with two grey buttons and no sentence reads as broken
        // rather than as unfinished.
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Tool này shop chưa mở bán, chưa có gói và giá. Bấm theo dõi ở kênh thông báo để
          biết khi shop mở bán nhé.
        </p>
      ) : null}

      {/* Buying outright is the primary action, so it leads and carries the
          filled accent. The basket keeps the same size and position in the
          stack but drops to the outlined treatment — two solid red buttons
          stacked would leave neither of them reading as the main one. */}
      <div ref={buyRef} className="space-y-3">
        <button
          type="button"
          disabled={busy || !chosen || !software.inStock || locked || gated}
          onClick={() => setConfirming(true)}
          className="press h-14 w-full rounded-2xl bg-[var(--menzu-accent)] text-[14px] font-semibold text-white hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
        >
          Mua ngay
        </button>
        <button
          type="button"
          disabled={busy || !chosen || !software.inStock || locked || gated}
          onClick={addToCart}
          aria-busy={busy}
          className="press flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--menzu-accent)]/70 bg-white/[0.02] text-[14px] font-semibold text-white hover:bg-white/[0.06] disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? "Đang thêm…" : "Thêm vào giỏ"}
        </button>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] sm:grid-cols-4">
        {TRUST.map((t, index) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className={`flex flex-col items-center gap-2 px-3 py-5 text-center ${
                index < TRUST.length - 1 ? "border-white/[0.07] sm:border-r" : ""
              }`}
            >
              <Icon size={18} aria-hidden className="text-[var(--menzu-accent)]" />
              <span className="text-[11px] font-semibold leading-tight text-neutral-400">{t.label}</span>
            </div>
          );
        })}
      </div>

      <StickyBuyBar
        anchorRef={buyRef}
        label={chosen ? `${software.name}, ${chosen.label}` : software.name}
        price={`${formatVnd(total)}đ`}
        cta="Mua ngay"
        disabled={busy || !chosen || !software.inStock || locked || gated}
        onPress={() => setConfirming(true)}
      />

      {/* Buying spends real balance, so it asks once and shows the figure it
          is about to take — after any voucher — rather than only the unit
          price above. The same dialog a listing card opens. */}
      <SoftwareCheckoutDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        product={{
          code: software.code,
          name: software.name,
          categoryName: software.categoryName,
          imageUrl: software.images[0] ?? null,
          loginNext: productHref(software.categorySlug, software.slug),
        }}
        tier={chosen}
        quantity={quantity}
        risky={software.softwareStatus === "RISKY"}
      />
      {toast ? (
        <StatusToast
          tone={toast.tone}
          title={toast.tone === "success" ? "Đã thêm vào giỏ" : "Chưa thêm được"}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
