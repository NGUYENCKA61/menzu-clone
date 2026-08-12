"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatVnd } from "./productData";

export interface AccountDetail {
  code: string;
  rank: string;
  lastRank: string | null;
  weaponSkins: number;
  buddies: number;
  agents: number;
  cards: number;
  sprays: number;
  level: number;
  vp: number;
  rp: number;
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

const STAT_ROW_CLASS = "flex items-center justify-between py-2.5 border-b border-white/5";
const STAT_LABEL_CLASS = "text-[11px] font-black uppercase tracking-widest text-neutral-500";
const STAT_VALUE_CLASS = "text-sm font-bold text-white";

const SECONDARY_BUTTON_CLASS =
  "w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 text-xs uppercase tracking-widest transition-colors";

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

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const pct = Math.round((1 - account.price / account.oldPrice) * 100);

  const [balanceState, setBalanceState] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

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

  // Fetch the signed-in user's wallet when the dialog opens; guests get null
  // and see the same "top up" path the live site shows a short balance.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { balance?: number } | null }) => {
        if (!cancelled) setBalanceState(d.user?.balance ?? 0);
      })
      .catch(() => {
        if (!cancelled) setBalanceState(0);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
      };

      if (response.status === 401) {
        router.push(`/login?next=/account/${account.code}`);
        return;
      }
      if (!response.ok) {
        setBuyError(data.error ?? "Không thể tạo đơn hàng");
        return;
      }

      setOrderCode(data.orderCode ?? "");
      setBalanceState(data.balance ?? 0);
      window.setTimeout(() => {
        // refresh() so the catalogue and header re-render without the sold item.
        router.refresh();
        router.push("/orders");
      }, 1400);
    } catch {
      setBuyError("Không kết nối được máy chủ");
    } finally {
      setBuying(false);
    }
  }

  // null until /api/auth/me answers; treat that (and guests) as 0 so the
  // dialog opens on the "top up" branch rather than flashing a confirm button.
  const balance = balanceState ?? 0;
  // Measured against what will actually be charged, so a voucher that brings
  // the price under the wallet balance unlocks the confirm button.
  const amountToTopUp = Math.max(payable - balance, 0);
  const canAfford = balance >= payable;

  const numericStats: { label: string; value: string }[] = [
    { label: "Level", value: String(account.level) },
    { label: "VP", value: String(account.vp) },
    { label: "RP", value: String(account.rp) },
    { label: "KC", value: formatVnd(account.kc) },
  ];

  return (
    <div className="flex flex-col">
      <div className={STAT_ROW_CLASS}>
        <span className={STAT_LABEL_CLASS}>Rank</span>
        <div className="flex flex-col items-end gap-1.5">
          <span className={STAT_VALUE_CLASS}>{account.rank}</span>
          {account.lastRank !== null && (
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              LAST: {account.lastRank}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 bg-white/5">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">
              TRACKER.GG
            </span>
            <a
              href="#"
              className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              xem profile
            </a>
          </div>
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

      {account.tag !== null && (
        <div className={STAT_ROW_CLASS}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold">
              {account.tag}
            </span>
            <span className="text-[10px] text-neutral-400">{account.mailType}</span>
          </div>
          <a
            href="#"
            className="text-[10px] font-black text-[var(--brand)] uppercase tracking-wider"
          >
            TÌM HIỂU
          </a>
        </div>
      )}

      <div className="py-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-black">
            -{pct}%
          </span>
          <span className="text-sm text-neutral-500 line-through">
            {formatVnd(account.oldPrice)}₫
          </span>
        </div>
        <div className="flex items-baseline">
          <span className="text-3xl font-black text-white">{formatVnd(account.price)}</span>
          <span className="text-sm font-bold text-neutral-400 ml-1">VND</span>
        </div>
      </div>

      {/* "Cọc / Trả Góp" and "Tiêu trước trả sau" are deliberately absent.
          Both are credit products whose terms — deposit share, instalment
          count, interest, credit limit — nobody has decided, and a button that
          opens nothing is worse than no button. Product.depositFrom stays in
          the schema so putting them back is a UI change, not a migration. */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-black py-4 uppercase tracking-widest text-sm transition-colors"
        >
          Mua Ngay
        </button>

        {/* A real destination now — /trade takes the request and an admin
            quotes it, so this no longer needs a "contact us" notice. */}
        <Link
          href="/trade"
          className={`${SECONDARY_BUTTON_CLASS} flex items-center justify-center`}
        >
          Thu cũ đổi mới
        </Link>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#111111] border border-white/10 rounded-[28px] w-full sm:max-w-md max-h-[90vh] overflow-hidden relative shadow-none flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white p-2 rounded-full transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center pt-4 pb-2 relative px-6">
              <h3 className="text-lg font-bold text-white mb-2">Xác Nhận Mua Tài Khoản</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 font-medium">Mã số</span>
                <span className="text-xs font-bold text-yellow-500">#{account.code}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-neutral-500">≡ Danh Mục:</span>
                <span className="text-violet-400 font-bold uppercase">
                  {account.categoryName}
                </span>
              </div>
            </div>

            <div className="px-5 py-1.5 overflow-y-auto flex-1 min-h-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Giá Gốc</span>
                <span className="text-xs font-bold text-white">
                  {formatVnd(account.oldPrice)} ₫
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Giảm Giá</span>
                <span className="text-xs font-bold text-white">{pct}%</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-400 shrink-0">Mã Giảm Giá / Voucher</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={voucher}
                    onChange={(event) => {
                      setVoucher(event.target.value);
                      // A quote belongs to the code it was fetched for.
                      setApplied(null);
                      setVoucherError(null);
                    }}
                    placeholder="Nhập mã voucher..."
                    className="w-28 min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-600 transition-colors"
                  />
                  <button
                    type="button"
                    disabled={checking || voucher.trim().length === 0}
                    onClick={handleApplyVoucher}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                  >
                    {checking ? "Đang kiểm…" : "Áp dụng"}
                  </button>
                </div>
              </div>

              {/* The button used to do nothing at all: the code was posted with
                  the purchase and the customer only learned it worked after
                  paying. */}
              {voucherError ? (
                <p role="alert" className="text-[11px] font-semibold text-red-400 text-right">
                  {voucherError}
                </p>
              ) : null}

              {applied ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400">Voucher đã áp dụng</span>
                  <span className="text-xs font-bold text-emerald-400">
                    −{formatVnd(applied.cut)} ₫
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Tổng tiền</span>
                <span className="text-xs font-bold text-white">
                  {formatVnd(account.price)} ₫
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase text-white">TỔNG THANH TOÁN</span>
                <span className="text-base font-black text-[var(--brand)]">
                  {formatVnd(payable)} ₫
                </span>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300">
                  Quyền Lợi & Bảo Hành
                </h4>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Số dư ví hiện tại:</span>
                <span className="text-xs font-bold text-white">{formatVnd(balance)} ₫</span>
              </div>

              {!canAfford ? (
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-neutral-400">Cần nạp thêm:</span>
                  <span className="text-xs font-bold text-red-400">
                    {formatVnd(amountToTopUp)} ₫
                  </span>
                </div>
              ) : null}
            </div>

            <div className="px-5 pb-5 pt-2 flex flex-col gap-2.5">
              {buyError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
                >
                  {buyError}
                </p>
              ) : null}

              {orderCode ? (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400">
                  Mua thành công · Đơn {orderCode}
                </p>
              ) : null}

              {/* The live dialog offers no confirm button when the wallet is
                  short — it sends you to top up instead. */}
              {canAfford ? (
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={buying || orderCode !== null}
                  className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors flex items-center justify-center"
                >
                  {buying ? "Đang xử lý…" : "Xác nhận mua"}
                </button>
              ) : (
                <a
                  href="/wallet"
                  className="w-full rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-black py-4 uppercase tracking-widest text-sm transition-colors flex items-center justify-center"
                >
                  Nạp tiền
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
