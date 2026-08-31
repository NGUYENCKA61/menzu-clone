"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Headphones, Lock, RefreshCw, ShieldCheck, Zap } from "lucide-react";

import { productHref } from "@/lib/routes";

import {
  BuyConfirmDialog,
  ConfirmFooter,
  DialogAlert,
  PayableBlock,
  PriceList,
  PriceRow,
  ProductTile,
  VoucherField,
} from "./BuyConfirmDialog";
import { formatVnd, productImage } from "./productData";

export interface AccountDetail {
  code: string;
  /** The shop's own title; "" falls back to "Mã #{code}". */
  name: string;
  /** The shop's write-up as running text, for the panel's two-line blurb. */
  descriptionText: string;
  /** The product half of its address: /{category-slug}/{slug}. */
  slug: string;
  /** The shop's uploaded picture, or null to fall back to the by-code path. */
  imageUrl: string | null;
  /** Extra screenshots after the main picture; the gallery arrows page through. */
  images: string[];
  rank: string;
  lastRank: string | null;
  weaponSkins: number;
  buddies: number;
  agents: number;
  cards: number;
  sprays: number;
  level: number;
  vip: number;
  vipIngame: number;
  kc: number;
  tag: string | null;
  mailType: string;
  oldPrice: number;
  price: number;
  depositFrom: number;
  categoryName: string;
  categorySlug: string;
  viewers: number;
  /** Sold accounts keep their page so crawled links stay valid. */
  sold: boolean;
}

export interface AccountBuyPanelProps {
  account: AccountDetail;
}

/** The software panel's four reassurances, with the delivery line made ours. */
const TRUST = [
  { icon: Zap, label: "Giao acc tự động" },
  { icon: ShieldCheck, label: "Thanh toán an toàn" },
  { icon: RefreshCw, label: "Bảo hành tài khoản" },
  { icon: Headphones, label: "Hỗ trợ 24/7" },
];

const STAT_ROW_CLASS = "flex items-center justify-between py-2.5 border-b border-white/5";
const STAT_LABEL_CLASS = "text-[11px] font-black uppercase tracking-widest text-neutral-500";
const STAT_VALUE_CLASS = "text-sm font-bold text-white";

/**
 * Right-hand purchase panel on the account-detail page: stat rows, price
 * block, action buttons, and a self-contained confirmation modal.
 *
 * Payment comes out of the wallet balance — the live checkout never asks for
 * card details. The dialog therefore branches: enough balance shows a confirm
 * button that posts to /api/orders, a short balance shows "Cần nạp thêm" and a
 * link to /wallet with no confirm button at all, exactly as the live one does.
 */
export function AccountBuyPanel({ account }: AccountBuyPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [voucher, setVoucher] = useState("");

  const pct = Math.round((1 - account.price / account.oldPrice) * 100);

  /** The wallet, read when the dialog opens; null until it answers. */
  const [balance, setBalance] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  /** Whether the sign-in went out by itself (NFA), or the shop hands it over. */
  const [loginReady, setLoginReady] = useState(false);

  const [applied, setApplied] = useState<{ cut: number; total: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // What the wallet will actually be debited, so the dialog and the server
  // agree before the customer commits.
  const payable = applied?.total ?? account.price;

  async function handleApplyVoucher() {
    setChecking(true);
    setVoucherError(null);
    setApplied(null);
    try {
      const response = await fetch("/api/vouchers/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: voucher.trim(), productCode: account.code }),
      });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(productHref(account.categorySlug, account.slug))}`);
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        cut?: number;
        total?: number;
      };
      if (!response.ok || data.cut === undefined || data.total === undefined) {
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

  // The wallet is read when the dialog opens rather than on page load: it is
  // the one moment the figure matters, and it can have changed in another tab
  // since the page was drawn. A guest has no wallet to show and stays null, so
  // they still get the confirm button — pressing it is what sends them to the
  // login page with this account waiting on the other side.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  function openDialog() {
    setBuyError(null);
    setOpen(true);
  }

  async function handleBuy() {
    if (buying) return;
    setBuying(true);
    setBuyError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: account.code,
          voucher: voucher.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        orderCode?: string;
        balance?: number;
        loginReady?: boolean;
        shortfall?: number;
      };

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(productHref(account.categorySlug, account.slug))}`);
        return;
      }
      if (!response.ok) {
        setBuyError(data.error ?? "Không thể tạo đơn hàng");
        // The server knows the exact gap; trust it over the figure the
        // wallet read a moment ago, which a purchase in another tab may
        // have moved.
        if (typeof data.shortfall === "number") {
          setBalance(Math.max(0, payable - data.shortfall));
        }
        return;
      }

      setOrderCode(data.orderCode ?? "");
      setLoginReady(data.loginReady === true);
      setBalance(data.balance ?? 0);
      // Long enough to read which of the two things the second line says —
      // the sign-in is waiting on /orders, or the shop has to be asked.
      window.setTimeout(() => {
        // refresh() so the catalogue and header re-render without the sold item.
        router.refresh();
        router.push("/orders");
      }, 2200);
    } catch {
      setBuyError("Không kết nối được máy chủ");
    } finally {
      setBuying(false);
    }
  }

  // Unknown until the wallet answers, and unknown counts as affordable: a
  // slow reply must not stand between a buyer with money and the confirm
  // button, and the server checks the balance again anyway, inside the
  // transaction. Measured against what will actually be charged, so a
  // voucher that brings the price under the balance unlocks the button.
  const canAfford = balance === null || balance >= payable;

  // VIP and VIP INGAME always print their labels, matching the card's strip:
  // an unfilled one simply has nothing after it. Level and KC still leave the
  // page at zero — "Level 0" would be noise dressed as a fact.
  const numericStats = [
    { label: "Level", value: String(account.level), show: account.level > 0 },
    { label: "VIP", value: account.vip > 0 ? String(account.vip) : "", show: true },
    {
      label: "VIP Ingame",
      value: account.vipIngame > 0 ? String(account.vipIngame) : "",
      show: true,
    },
    { label: "KC", value: formatVnd(account.kc), show: account.kc > 0 },
  ].filter((s) => s.show);

  return (
    <div className="flex flex-col gap-6">
      {/* The corner pill from the listing card, leading the panel the way the
          software page leads with its status pill. */}
      {account.tag !== null && (
        <span className="self-start inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
              account.tag.toUpperCase() === "NFA"
                ? "text-emerald-400"
                : "text-[#ff6c88]"
            }`}
          >
            {account.tag.toUpperCase() === "NFA" ? (
              <Lock size={11} strokeWidth={2.75} aria-hidden />
            ) : (
              <span aria-hidden>✉</span>
            )}
            {account.tag}
          </span>
          {account.mailType ? (
            <span className="text-[10px] font-bold text-neutral-400">
              {account.mailType}
            </span>
          ) : null}
        </span>
      )}

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          {account.name || `Mã #${account.code}`}
        </h1>
        <p className="text-sm leading-relaxed text-neutral-400 max-w-[560px]">
          {account.descriptionText ||
            "Tài khoản game nhiều vật phẩm, inventory đẹp và sẵn sàng giao ngay. Thông tin tài khoản được kiểm tra trước khi bàn giao."}
        </p>
      </div>

      <div className="flex flex-col">
        <span className="pb-1 text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thông tin tài khoản:
        </span>
        {/* The Rank row always prints its label, like the card's strip — an
            account with no rank yet just shows nothing beside it. */}
        <div className={STAT_ROW_CLASS}>
          <span className={STAT_LABEL_CLASS}>Rank</span>
          <div className="flex flex-col items-end gap-1">
            <span className={STAT_VALUE_CLASS}>{account.rank}</span>
            {account.lastRank !== null && (
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                LAST: {account.lastRank}
              </span>
            )}
          </div>
        </div>

        <div className={STAT_ROW_CLASS}>
          <span className={STAT_LABEL_CLASS}>Skins</span>
          <span className={STAT_VALUE_CLASS}>{account.weaponSkins} Skins</span>
        </div>

        {numericStats.map((stat) => (
          <div key={stat.label} className={STAT_ROW_CLASS}>
            <span className={STAT_LABEL_CLASS}>{stat.label}</span>
            <span className={STAT_VALUE_CLASS}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {pct > 0 ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-black">
              -{pct}%
            </span>
            <span className="text-sm text-neutral-500 line-through">
              {formatVnd(account.oldPrice)}đ
            </span>
          </div>
        ) : null}
        <p className="text-4xl font-black text-white">{formatVnd(account.price)}đ</p>
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              account.sold ? "bg-neutral-600" : "bg-emerald-500"
            }`}
          />
          <span className={account.sold ? "text-neutral-500" : "text-emerald-400"}>
            {account.sold ? "Đã bán" : "Còn hàng"}
          </span>
        </p>
      </div>

      {/* "Cọc / Trả Góp" and "Tiêu trước trả sau" are deliberately absent.
          Both are credit products whose terms — deposit share, instalment
          count, interest, credit limit — nobody has decided, and a button that
          opens nothing is worse than no button. Product.depositFrom stays in
          the schema so putting them back is a UI change, not a migration. */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={account.sold}
          onClick={openDialog}
          className="w-full h-14 rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 transition-colors text-[13px] font-black uppercase tracking-widest text-white"
        >
          Mua ngay
        </button>

        {/* Decorative on purpose — the trade-in programme was retired, but the
            page keeps the button for the look of the original. It goes
            nowhere by design. */}
        <button
          type="button"
          className="flex w-full h-14 items-center justify-center rounded-2xl border border-[var(--menzu-accent)]/70 bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-[13px] font-black uppercase tracking-widest text-white"
        >
          Thu cũ đổi mới
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

      {/* Buying spends real balance, so it asks once and shows the figure it
          is about to take — after any voucher — before it does. */}
      <BuyConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <ConfirmFooter
            onCancel={() => setOpen(false)}
            onConfirm={handleBuy}
            busy={buying}
            canAfford={canAfford}
            done={orderCode !== null}
          />
        }
      >
        <ProductTile
          imageUrl={account.imageUrl ?? productImage(account.code)}
          imageClassName="object-cover object-[85%_center]"
          name={account.name || `Mã #${account.code}`}
          chip={account.rank || null}
          meta={`#${account.code} · ${account.categoryName}`}
        />
        <PriceList>
          {pct > 0 ? (
            <>
              <PriceRow
                label="Giá gốc"
                value={`${formatVnd(account.oldPrice)}đ`}
                tone="strike"
              />
              <PriceRow label="Giảm giá" value={`−${pct}%`} tone="ok" />
            </>
          ) : null}
          <PriceRow label="Tạm tính" value={`${formatVnd(account.price)}đ`} />
          {applied ? (
            <PriceRow
              label="Mã giảm giá"
              value={`−${formatVnd(applied.cut)}đ`}
              tone="ok"
            />
          ) : null}
        </PriceList>
        <VoucherField
          value={voucher}
          onChange={(next) => {
            setVoucher(next);
            // A quote belongs to the code it was fetched for.
            setApplied(null);
            setVoucherError(null);
          }}
          onApply={handleApplyVoucher}
          checking={checking}
          error={voucherError}
          applied={applied}
        />
        <PayableBlock payable={payable} balance={balance} />
        {buyError ? <DialogAlert tone="err">{buyError}</DialogAlert> : null}
        {orderCode ? (
          <DialogAlert tone="ok">
            Mua thành công · Đơn {orderCode}
            <span className="mt-1 block font-medium text-emerald-300/90">
              {loginReady
                ? "Tài khoản và mật khẩu đăng nhập đã sẵn trong Lịch sử mua."
                : "Tài khoản bàn giao trực tiếp — liên hệ shop kèm mã đơn để nhận."}
            </span>
          </DialogAlert>
        ) : null}
      </BuyConfirmDialog>
    </div>
  );
}
