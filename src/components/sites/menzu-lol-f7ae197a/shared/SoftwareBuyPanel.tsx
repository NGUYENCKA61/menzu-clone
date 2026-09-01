"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Headphones, Minus, Plus, RefreshCw, ShieldCheck, Zap } from "lucide-react";

import {
  badgePillClass,
  BADGE_PILL_BASE,
  type ProductBadge,
} from "@/lib/productBadges";
import type { ProductFeature } from "@/lib/productFeatures";
import type { ProductRequirement } from "@/lib/productRequirements";
import { productHref } from "@/lib/routes";

import { BadgeIcon } from "./BadgeIcon";
import { formatVnd } from "./productData";
import { SoftwareCheckoutDialog } from "./SoftwareCheckoutDialog";

export interface SoftwarePackageView {
  id: string;
  /** Shown verbatim — "1 ngày", "Vĩnh viễn". */
  label: string;
  price: number;
  durationHours: number | null;
}

export interface SoftwareDetail {
  code: string;
  /** The product half of its address: /{category-slug}/{slug}. */
  slug: string;
  name: string;
  description: string;
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
  softwareStatus: "UNDETECTED" | "DETECTED" | "UPDATING" | null;
  /** Whether that state is drawn here. Resolved on the server: the shop can
   *  force it either way, and left alone it stays out of the badges' way. The
   *  storefront card shows the pill regardless. */
  showStatus: boolean;
  /** What share of the price comes back if the tool fails, as a whole percent.
   *  Null means the shop has set none and the policy block stays silent. */
  refundRate: number | null;
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
const STATUS_STYLE: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  UNDETECTED: {
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    label: "Undetected",
  },
  DETECTED: { dot: "bg-red-500", text: "text-red-400", label: "Detected" },
  UPDATING: {
    dot: "bg-amber-500",
    text: "text-amber-400",
    label: "Đang cập nhật",
  },
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
  /** Following this tool's status; null for a guest. Still threaded down from
   *  the route, unread while "Nhận thông báo" is off the page. */
  statusSubscribed: boolean | null;
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
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);

  const chosen = useMemo(
    () => software.packages.find((p) => p.id === packageId) ?? null,
    [software.packages, packageId],
  );

  const total = (chosen?.price ?? 0) * quantity;

  // Changing the tier clears whatever the last action said — a "đã thêm vào
  // giỏ" line about the other tier would argue with the price above it.
  function pickPackage(id: string) {
    setPackageId(id);
    setMsg(null);
  }

  async function addToCart() {
    if (!chosen) return;
    setBusy(true);
    setMsg(null);
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

  const status =
    software.showStatus && software.softwareStatus
      ? STATUS_STYLE[software.softwareStatus]
      : null;

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
          {status ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${status.text}`}
              >
                {status.label}
              </span>
            </span>
          ) : null}
          {software.badges.map((badge) => (
            <span
              key={badge.label}
              className={`${BADGE_PILL_BASE} ${badgePillClass(badge.color)}`}
            >
              <BadgeIcon icon={badge.icon} />
              {badge.label}
            </span>
          ))}
        </div>
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
          <span
            className={
              software.inStock ? "text-emerald-400" : "text-neutral-500"
            }
          >
            {software.inStock ? "Còn hàng" : "Tạm hết hàng"}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-neutral-400">
          Số lượng:
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
                index < TRUST.length - 1
                  ? "sm:border-r border-white/[0.07]"
                  : ""
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
      />
    </div>
  );
}
