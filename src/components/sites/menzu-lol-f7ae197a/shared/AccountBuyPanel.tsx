"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  Coins,
  Crosshair,
  Crown,
  Dices,
  Gem,
  Headphones,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";

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
import { ErrorModal } from "./ErrorModal";
import { TopUpDialog } from "./TopUpDialog";
import { StickyBuyBar } from "./StickyBuyBar";
import type { BuyerLevel } from "./SoftwareBuyPanel";
import { StockLine } from "./StockLine";
import { rankMatchBadge, rankMatchName } from "@/lib/cfRankMatch";
import { rankBadge } from "@/lib/cfRanks";
import { vipBadge } from "@/lib/cfVip";
import { sentenceCase } from "@/lib/displayCase";

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
  costumes: number;
  accessories: number;
  level: number;
  vip: number;
  vipIngame: number;
  kc: number;
  /** A place on lib/cfRankMatch's ladder, 0 for none. */
  rankMatch: number;
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
  /** Sold to level-2 ("xác thực cấp 2") accounts only. */
  verifiedOnly: boolean;
  /** Set on an "acc random" listing: how many sign-ins are left to sell. */
  pool: { available: number } | null;
}

export interface AccountBuyPanelProps {
  account: AccountDetail;
  /** From `?sl=` — the quantity a guest had set before the login gate. */
  initialQuantity?: number;
  /** Who is looking, for an account sold to level 2 only. */
  viewer: BuyerLevel;
}

/** The software panel's four reassurances, with the delivery line made ours. */
const TRUST = [
  { icon: Zap, label: "Giao acc tự động" },
  { icon: ShieldCheck, label: "Thanh toán an toàn" },
  { icon: RefreshCw, label: "Bảo hành tài khoản" },
  { icon: Headphones, label: "Hỗ trợ 24/7" },
];

const TILE_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-wider text-neutral-500";
const TILE_ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]";

/**
 * Right-hand purchase panel on the account-detail page: stat rows, price
 * block, action buttons, and a self-contained confirmation modal.
 *
 * Payment comes out of the wallet balance — the live checkout never asks for
 * card details. The dialog therefore branches: enough balance shows a confirm
 * button that posts to /api/orders, a short balance shows "Cần nạp thêm" and a
 * link to /wallet with no confirm button at all, exactly as the live one does.
 */
export function AccountBuyPanel({
  account,
  initialQuantity,
  viewer,
}: AccountBuyPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [voucher, setVoucher] = useState("");

  const pct = Math.round((1 - account.price / account.oldPrice) * 100);

  /** The wallet, read when the dialog opens; null until it answers. */
  const [balance, setBalance] = useState<number | null>(null);
  /** Whether anybody is signed in; null until the probe answers. Kept apart
   *  from `balance`, which is also null while waiting and after a failure. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  /** Accounts the server says are left, after it refused for want of them. */
  const [stockLeft, setStockLeft] = useState<number | null>(null);
  /** A failure the buyer cannot fix in the card (no connection, a server
   *  error): the red notice sheet says it instead of the inline line. */
  const [fatal, setFatal] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  /** What the wallet was actually debited, kept for the receipt. */
  const [paid, setPaid] = useState(0);
  /** The page's own buttons; the phone's sticky bar shows while they are off screen. */
  const buyRef = useRef<HTMLDivElement>(null);
  /** The refusal in the dialog, scrolled to when it appears. */
  const errorRef = useRef<HTMLDivElement>(null);
  /** Whether the sign-in went out by itself (NFA), or the shop hands it over. */
  const [loginReady, setLoginReady] = useState(false);
  // "Acc random": sold by the piece, so the panel carries a count and the
  // dialog reports how many sign-ins landed in the buyer's history.
  const pool = account.pool;
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  const [bought, setBought] = useState(0);
  const unitCount = pool ? quantity : 1;

  // Where a guest goes to sign in, carrying the count so they come back to
  // the same order; the product page reads ?sl= on the way in.
  const loginHref = `/login?next=${encodeURIComponent(
    `${productHref(account.categorySlug, account.slug)}${pool && quantity > 1 ? `?sl=${quantity}` : ""}`,
  )}`;
  const guest = signedIn === false;
  const soldOut = pool ? pool.available <= 0 : account.sold;
  // Sold to level 2 only (the owner, 12/10/2026): said here, and refused by
  // the server either way.
  const gated = account.verifiedOnly && viewer !== "verified";
  const stockText = pool
    ? pool.available > 0
      ? `Còn ${pool.available} acc`
      : "Tạm hết hàng"
    : account.sold
      ? "Đã bán"
      : "Còn hàng";

  const [applied, setApplied] = useState<{ cut: number; total: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // What the wallet will actually be debited, so the dialog and the server
  // agree before the customer commits.
  const payable = applied?.total ?? account.price * unitCount;

  async function handleApplyVoucher() {
    setChecking(true);
    setVoucherError(null);
    setApplied(null);
    try {
      const response = await fetch("/api/vouchers/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: voucher.trim(),
          productCode: account.code,
          quantity: unitCount,
        }),
      });
      if (response.status === 401) {
        router.push(loginHref);
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
        if (cancelled) return;
        setSignedIn(Boolean(d.user));
        setBalance(d.user ? (d.user.balance ?? 0) : null);
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
    setStockLeft(null);
    setOpen(true);
  }

  // A refusal lands under the price list, which on a phone is below the
  // fold of the dialog's scroll box; the box is brought to it. The dialog
  // stays as it is otherwise — the buyer has a code to fix or a wallet to
  // fill, and a card that re-runs its entrance over an open dialog reads as
  // a render fault.
  useEffect(() => {
    if (buyError) errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [buyError]);

  /** The receipt was read; the panel is ready for another purchase. */
  function closeReceipt() {
    setOpen(false);
    setOrderCode(null);
    setBought(0);
    setApplied(null);
    setVoucher("");
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
          quantity: unitCount,
          voucher: voucher.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        orderCode?: string;
        balance?: number;
        loginReady?: boolean;
        accountsDelivered?: number;
        shortfall?: number;
      };

      if (response.status === 401) {
        router.push(loginHref);
        return;
      }
      if (response.status >= 500) {
        setFatal(data.error ?? "Hệ thống đang lỗi. Bạn xem lại Lịch sử mua trước khi mua lại, để không bị mua trùng.");
        setOpen(false);
        return;
      }
      if (!response.ok) {
        setBuyError(data.error ?? "Không thể tạo đơn hàng");
        const left = (data as { available?: unknown }).available;
        if (response.status === 409 && typeof left === "number") setStockLeft(left);
        // The server knows the exact gap; trust it over the figure the
        // wallet read a moment ago, which a purchase in another tab may
        // have moved.
        if (typeof data.shortfall === "number") {
          setBalance(Math.max(0, payable - data.shortfall));
        }
        return;
      }

      setPaid(payable);
      setOrderCode(data.orderCode ?? "");
      setLoginReady(data.loginReady === true);
      setBought(data.accountsDelivered ?? 0);
      setBalance(data.balance ?? 0);
      // So the catalogue, the header balance and this page's own stock line
      // re-render without the sold item. The receipt stays up until it is
      // read: it used to be a green line at the foot of the confirm view,
      // below the fold on a phone, and the page left for /orders by itself
      // 2.2 seconds later - the dearest thing on the site was answered
      // worse than a key. The receipt now carries the way there.
      router.refresh();
    } catch {
      setFatal("Không kết nối được máy chủ. Bạn xem lại Lịch sử mua trước khi mua lại, để không bị mua trùng.");
      setOpen(false);
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

  // A row prints only with a value after its label (the owner, 13/10/2026, UI
  // consistency review: a "RANK" with nothing beside it read as a broken
  // page). Rank shows if either the current or the last rank was typed; the
  // weapons count, like Level and KC, leaves the page at zero.
  const rank = account.rank.trim();
  const lastRank = account.lastRank?.trim() || null;
  const showRank = rank !== "" || lastRank !== null;
  const showSkins = account.weaponSkins > 0;
  // The CrossFire wiki's badges (the owner, 25/10/2026: "vip thay bằng icon
  // logo", "rank match", "và rank cũng v"). VIP's carries its number, so it
  // stands alone; the rank and the tier keep their names beside theirs.
  const rankIcon = rank ? rankBadge(rank) : null;
  const vipIcon = vipBadge(account.vip);
  const matchIcon = rankMatchBadge(account.rankMatch);
  // menzu's stat tiles (the owner, 25/10/2026: "nên sửa theo menzu cho đẹp
  // không", then "làm thử 5p"): an icon box, a small capital label, the value.
  const numericStats = [
    { label: "Level", icon: <Award size={16} className="text-neutral-300" />, value: String(account.level), show: account.level > 0 },
    // Shown only with a figure: a label with nothing after it, twice in a
    // row, read as a broken page on a phone.
    {
      label: "VIP",
      icon: <Crown size={16} className="text-amber-400" />,
      value: vipIcon ? (
        <Image src={vipIcon} alt={`VIP ${account.vip}`} width={18} height={20} unoptimized />
      ) : (
        String(account.vip)
      ),
      show: account.vip > 0,
    },
    { label: "VIP Ingame", icon: <Gem size={16} className="text-sky-400" />, value: String(account.vipIngame), show: account.vipIngame > 0 },
    {
      label: "Rank Match",
      icon: matchIcon ? <Image src={matchIcon} alt="" width={28} height={28} /> : <Award size={16} className="text-neutral-300" />,
      value: rankMatchName(account.rankMatch),
      show: account.rankMatch > 0,
    },
    { label: "KC", icon: <Coins size={16} className="text-amber-300" />, value: formatVnd(account.kc), show: account.kc > 0 },
  ].filter((s) => s.show);
  // The other inventory tabs, counted under the weapons the way menzu counts
  // skins by tier, in their tabs' colours.
  const kindChips = [
    { label: "nhân vật", n: account.agents, tone: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
    { label: "trang phục", n: account.costumes, tone: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
    { label: "phụ kiện", n: account.accessories, tone: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
    { label: "trang bị", n: account.buddies, tone: "border-violet-500/30 bg-violet-500/10 text-violet-400" },
  ].filter((c) => c.n > 0);
  const hasStats = showRank || showSkins || numericStats.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h1 className="text-[26px] font-black leading-[1.15] text-frost sm:text-[30px] lg:text-[34px]">
          {account.name ? sentenceCase(account.name) : `Mã #${account.code}`}
        </h1>
        <p className="max-w-[60ch] text-[15px] leading-[1.65] text-mist">
          {account.descriptionText ||
            "Tài khoản game nhiều vật phẩm, inventory đẹp và sẵn sàng giao ngay. Thông tin tài khoản được kiểm tra trước khi bàn giao."}
        </p>
      </div>

      {/* menzu's stat card: rank and inventory side by side, the numbers as
          tiles under them, the mail tag as the last row. Every part shows
          only with something in it, and the card only with any part. */}
      {hasStats || account.tag !== null ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          {showRank || showSkins ? (
            <div className={`grid gap-4 ${showRank && showSkins ? "grid-cols-2 divide-x divide-white/10" : "grid-cols-1"}`}>
              {showRank ? (
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    {rankIcon ? (
                      <Image src={rankIcon} alt="" width={23} height={26} unoptimized />
                    ) : (
                      <Award size={18} className="text-neutral-400" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className={TILE_LABEL_CLASS}>Rank</p>
                    {rank ? <p className="truncate text-[15px] font-black uppercase text-white">{rank}</p> : null}
                    {lastRank !== null ? (
                      <p className="truncate text-[11px] font-bold text-neutral-500">LAST: {lastRank}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {showSkins ? (
                <div className={`min-w-0 ${showRank ? "pl-4" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                      <Crosshair size={18} className="text-[var(--menzu-accent)]" />
                    </span>
                    <div className="min-w-0">
                      <p className={TILE_LABEL_CLASS}>Kho đồ</p>
                      <p className="truncate text-[15px] font-black uppercase text-white">{account.weaponSkins} vũ khí</p>
                    </div>
                  </div>
                  {kindChips.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {kindChips.map((chip) => (
                        <span key={chip.label} className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${chip.tone}`}>
                          {chip.n} {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {numericStats.length > 0 ? (
            <div
              className={`grid grid-cols-2 gap-2 ${showRank || showSkins ? "border-t border-white/10 pt-4" : ""} ${
                numericStats.length >= 4 ? "sm:grid-cols-4" : numericStats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {numericStats.map((stat) => (
                <div key={stat.label} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2">
                  <span className={TILE_ICON_CLASS}>{stat.icon}</span>
                  <div className="min-w-0">
                    <p className={TILE_LABEL_CLASS}>{stat.label}</p>
                    <div className="truncate text-sm font-black text-white">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {account.tag !== null ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2">
              <span className={TILE_ICON_CLASS}>
                {account.tag.toUpperCase() === "NFA" ? (
                  <Lock size={15} strokeWidth={2.5} className="text-emerald-400" aria-hidden />
                ) : account.tag.toUpperCase() === "RANDOM" ? (
                  <Dices size={15} strokeWidth={2.5} className="text-amber-400" aria-hidden />
                ) : (
                  <Mail size={15} strokeWidth={2.5} className="text-[#ff6c88]" aria-hidden />
                )}
              </span>
              <span
                className={`text-[13px] font-black uppercase ${
                  account.tag.toUpperCase() === "NFA"
                    ? "text-emerald-400"
                    : account.tag.toUpperCase() === "RANDOM"
                      ? "text-amber-400"
                      : "text-[#ff6c88]"
                }`}
              >
                {account.tag}
              </span>
              {account.mailType ? (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-400">
                  {account.mailType}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* menzu's price card: the figure large inside its own frame, what the
          discount saves under it. */}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        {pct > 0 ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[12px] font-semibold">
              -{pct}%
            </span>
            <span className="text-sm text-neutral-500 line-through">
              {formatVnd(account.oldPrice)}đ
            </span>
          </div>
        ) : null}
        <p className="text-4xl sm:text-5xl font-black text-white">{formatVnd(account.price)}đ</p>
        {pct > 0 ? (
          <p className="text-[12px] font-semibold text-neutral-500">
            Tiết kiệm {formatVnd(account.oldPrice - account.price)}đ
          </p>
        ) : null}
        <StockLine inStock={!soldOut} label={stockText} />
      </div>

      {/* "Cọc / Trả Góp" and "Tiêu trước trả sau" are deliberately absent.
          Both are credit products whose terms — deposit share, instalment
          count, interest, credit limit — nobody has decided, and a button that
          opens nothing is worse than no button. Product.depositFrom stays in
          the schema so putting them back is a UI change, not a migration. */}
      {pool ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-semibold text-neutral-400">Số lượng</span>
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              aria-label="Bớt một"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-10 w-10 text-lg font-black text-neutral-300 transition-colors hover:text-white disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={Math.max(1, pool.available)}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.min(
                    Math.max(1, pool.available),
                    Math.max(1, Math.floor(Number(e.target.value)) || 1),
                  ),
                )
              }
              className="h-10 w-16 rounded-lg bg-transparent text-center text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/50"
            />
            <button
              type="button"
              aria-label="Thêm một"
              disabled={quantity >= pool.available}
              onClick={() => setQuantity((q) => Math.min(pool.available, q + 1))}
              className="h-10 w-10 text-lg font-black text-neutral-300 transition-colors hover:text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
          <span className="text-[12px] font-semibold text-neutral-500">
            = {formatVnd(account.price * quantity)}đ
          </span>
        </div>
      ) : null}

      {gated ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Tài khoản này chỉ bán cho tài khoản xác thực cấp 2.{" "}
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
      ) : null}
      <div ref={buyRef} className="space-y-3">
        <button
          type="button"
          disabled={soldOut || gated}
          onClick={openDialog}
          className="press w-full h-14 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 text-[16px] font-semibold text-white"
        >
          Mua ngay
        </button>

        {/* The trade-in programme is handled by hand at the desk, so the
            button leads there. It used to go nowhere at all - a 56px control
            under MUA NGAY that answered a press with nothing. */}
        <Link
          href="/lien-he"
          className="press flex w-full h-14 items-center justify-center rounded-2xl border border-white/10 border-[var(--menzu-accent)]/70 bg-white/[0.02] hover:bg-white/[0.06] text-[15px] font-semibold text-white"
        >
          Thu cũ đổi mới
        </Link>
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

      <StickyBuyBar
        anchorRef={buyRef}
        label={account.name || `Mã #${account.code}`}
        price={`${formatVnd(account.price * unitCount)}đ`}
        cta="Mua ngay"
        disabled={soldOut || gated}
        onPress={openDialog}
      />

      {fatal ? (
        <ErrorModal title="Thanh toán bị gián đoạn" message={fatal} onClose={() => setFatal(null)} />
      ) : null}

      {orderCode !== null ? (
        /* The notice sheet the top-up answers with (the owner, 23/10/2026:
           "thanh toán thành công thì nhảy tới cái modal thành công thông
           báo"): what was taken, where the account is, one white way on. */
        open ? (
          <TopUpDialog
            tone="green"
            layout="menzu"
            handoff
            title="Thanh toán thành công"
            action={{
              label: "Xem đơn hàng",
              href: `/orders?don=${encodeURIComponent(orderCode)}`,
            }}
            onClose={closeReceipt}
          >
            {`Đã trừ ví ${formatVnd(paid)}đ. `}
            {pool
              ? `${bought} tài khoản đã sẵn trong đơn ${orderCode}.`
              : loginReady
                ? `Tài khoản và mật khẩu đã sẵn trong đơn ${orderCode}.`
                : `Thông tin đăng nhập đang được chuẩn bị trong đơn ${orderCode}.`}
          </TopUpDialog>
        ) : null
      ) : (
      /* Buying spends real balance, so it asks once and shows the figure it
         is about to take — after any voucher — before it does. */
      <BuyConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        // A guest is told what the button does before pressing it; it used
        // to read XÁC NHẬN and land them on a bare login page.
        subtitle={guest ? "Đăng nhập để hoàn tất đơn này, lựa chọn của bạn sẽ được giữ nguyên." : undefined}
        footer={
          <ConfirmFooter
            onCancel={() => setOpen(false)}
            onConfirm={guest ? () => router.push(loginHref) : handleBuy}
            busy={buying}
            canAfford={canAfford}
            confirmLabel={guest ? "Đăng nhập để mua" : undefined}
            soldOut={stockLeft === null ? null : stockLeft > 0 ? `Chỉ còn ${stockLeft} acc` : "Hết acc"}
          />
        }
      >
        <ProductTile
          imageUrl={account.imageUrl ?? productImage(account.code)}
          imageClassName="object-cover object-[85%_center]"
          name={account.name || `Mã #${account.code}`}
          chip={rank || null}
          meta={`#${account.code}, ${sentenceCase(account.categoryName)}`}
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
          {pool ? <PriceRow label="Số lượng" value={`${quantity} acc`} /> : null}
          <PriceRow label="Tạm tính" value={`${formatVnd(account.price * unitCount)}đ`} />
          {applied ? (
            <PriceRow
              label="Mã giảm giá"
              value={`−${formatVnd(applied.cut)}đ`}
              tone="ok"
            />
          ) : null}
        </PriceList>
        {guest ? null : (
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
        )}
        <PayableBlock payable={payable} balance={balance} />
        {buyError ? (
          <div ref={errorRef}>
            <DialogAlert tone="err">{buyError}</DialogAlert>
          </div>
        ) : null}
      </BuyConfirmDialog>
      )}
    </div>
  );
}
