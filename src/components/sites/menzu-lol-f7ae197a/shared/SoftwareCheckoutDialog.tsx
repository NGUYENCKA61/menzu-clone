"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import {
  BuyConfirmDialog,
  ConfirmFooter,
  DialogAlert,
  FOOTER_GHOST_BTN,
  FOOTER_PRIMARY_BTN,
  PayableBlock,
  PriceList,
  PriceRow,
  ProductTile,
  VoucherField,
} from "./BuyConfirmDialog";
import {
  formatTierPercent,
  readMemberTier,
  TIER_RULES,
  tierDiscountFor,
  type MemberTierValue,
} from "@/lib/memberTiers";

import { formatVnd } from "./productData";

export interface CheckoutTier {
  id: string;
  label: string;
  price: number;
}

export interface CheckoutProduct {
  code: string;
  name: string;
  categoryName: string;
  imageUrl: string | null;
  /** Where a guest lands after signing in — the product, as they left it. */
  loginNext: string;
}

/**
 * The whole "Xác nhận mua" errand for one software tier, self-contained:
 * reads the wallet when it opens, prices a voucher, posts the order, and
 * then shows the receipt; `onBought`, if given, hears the order code.
 *
 * Lives apart from the buy panel so a listing card can open the very same
 * dialog — a buyer who has picked a tier on the shelf should not have to
 * walk into the product page to pay for it. Buying spends real balance, so
 * this asks once and shows the figure it is about to take, after any
 * voucher, before it does.
 *
 * Once the order is through the same dialog turns into the receipt — order
 * code, what was taken, what is left, how many keys were handed over — and
 * stays up until closed, so the buyer reads the outcome where they made
 * the decision rather than hunting for a line under the button.
 */

/** Where the eight sparks around the success tick fly to, in degrees. */
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** What the buy call answered, kept for the receipt view. */
interface Purchase {
  orderCode: string;
  total: number;
  balance: number | null;
  keysDelivered: number | null;
  keysPending: number;
}
export function SoftwareCheckoutDialog({
  open,
  onClose,
  product,
  tier,
  quantity,
  onBought,
}: {
  open: boolean;
  onClose: () => void;
  product: CheckoutProduct;
  tier: CheckoutTier | null;
  quantity: number;
  onBought?: (orderCode: string) => void;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  /** Refusals from the buy call, shown inside the dialog it belongs to. */
  const [dialogError, setDialogError] = useState<string | null>(null);
  /** The wallet, read when the dialog opens; null until it answers. */
  const [balance, setBalance] = useState<number | null>(null);
  /** The buyer's member tier, when it earns a cut here; null otherwise. */
  const [memberTier, setMemberTier] = useState<MemberTierValue | null>(null);

  const [voucher, setVoucher] = useState("");
  /** The "Áp dụng" quote: what the code takes off, and what is left to pay. */
  const [applied, setApplied] = useState<{ cut: number; total: number } | null>(
    null,
  );
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  /** Set when the order went through; the dialog then shows the receipt. */
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  const lineTotal = (tier?.price ?? 0) * quantity;
  // The member's cut, taken before any voucher — the same order the server
  // applies them in, so the quoted total is the charged one.
  const memberCut = memberTier ? Number(tierDiscountFor(BigInt(lineTotal), memberTier)) : 0;
  const total = lineTotal - memberCut;
  // What the wallet will actually be debited: the quoted voucher total once
  // a code has been applied, the line total otherwise.
  const payable = applied?.total ?? total;
  // Unknown until the wallet answers, and unknown counts as affordable: a
  // slow reply must not stand between a buyer with money and the confirm
  // button. The server checks the balance again anyway, inside the
  // transaction.
  const canAfford = balance === null || balance >= payable;

  // A quote belongs to the tier and quantity it was fetched for.
  useEffect(() => {
    setApplied(null);
    setVoucherError(null);
  }, [tier?.id, quantity]);

  // The wallet is read when the dialog opens rather than on page load: it is
  // the one moment the figure matters, and it can have changed in another
  // tab since the page was drawn. A guest has no wallet to show and stays
  // null, so they still get the confirm button — pressing it is what sends
  // them to the login page with this product waiting on the other side.
  useEffect(() => {
    if (!open) return;
    setDialogError(null);
    // A fresh opening is a fresh purchase; the last receipt is not it.
    setPurchase(null);
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(
        (d: {
          user?: {
            balance?: number;
            tier?: string;
            role?: string;
            agencyPercent?: number;
          } | null;
        }) => {
          if (cancelled) return;
          setBalance(d.user ? (d.user.balance ?? 0) : null);
          // Wholesale does not stack with the tier, so an agency on a
          // percent sees no member cut — the server would not take one.
          const wholesale = d.user?.role === "AGENCY" && (d.user.agencyPercent ?? 0) > 0;
          const earned = d.user && !wholesale ? readMemberTier(d.user.tier) : null;
          setMemberTier(earned && TIER_RULES[earned].discountPercent > 0 ? earned : null);
        },
      )
      .catch(() => {
        if (!cancelled) {
          setBalance(null);
          setMemberTier(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loginHref = `/login?next=${encodeURIComponent(product.loginNext)}`;

  async function handleApplyVoucher() {
    if (!tier) return;
    setChecking(true);
    setVoucherError(null);
    setApplied(null);
    try {
      const res = await fetch("/api/vouchers/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: voucher.trim(),
          productCode: product.code,
          packageId: tier.id,
          quantity,
        }),
      });
      if (res.status === 401) {
        router.push(loginHref);
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

  async function buyNow() {
    if (!tier || busy) return;
    setBusy(true);
    setDialogError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: product.code,
          packageId: tier.id,
          quantity,
          // Sent whether or not "Áp dụng" was pressed: the server prices it
          // by the same rules, so a typed-but-unchecked code still counts.
          voucher: voucher.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderCode?: string;
        shortfall?: number;
        total?: number;
        balance?: number;
        keysDelivered?: number;
        keysPending?: number;
      };
      if (!res.ok) {
        setDialogError(data.error ?? "Không thể tạo đơn hàng");
        // The server knows the exact gap; trust it over the figure the
        // wallet read a moment ago, which a purchase in another tab may
        // have moved.
        if (typeof data.shortfall === "number") {
          setBalance(Math.max(0, payable - data.shortfall));
        }
        return;
      }
      setPurchase({
        orderCode: data.orderCode ?? "",
        total: typeof data.total === "number" ? data.total : payable,
        balance: typeof data.balance === "number" ? data.balance : null,
        keysDelivered:
          typeof data.keysDelivered === "number" ? data.keysDelivered : null,
        keysPending: typeof data.keysPending === "number" ? data.keysPending : 0,
      });
      onBought?.(data.orderCode ?? "");
      // So the header balance and anything else server-drawn catch up.
      router.refresh();
    } catch {
      setDialogError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  if (purchase && tier) {
    return (
      <BuyConfirmDialog
        open={open}
        onClose={onClose}
        title="Thanh toán thành công"
        subtitle="Đơn đã ghi vào lịch sử mua của bạn."
        accent="success"
        footer={
          <div className="receipt-in flex flex-1 gap-2.5">
            <button type="button" onClick={onClose} className={FOOTER_GHOST_BTN}>
              Đóng
            </button>
            <Link href="/orders" className={FOOTER_PRIMARY_BTN}>
              Xem đơn hàng
            </Link>
          </div>
        }
      >
        {/* The receipt takes the place of the confirm view inside the same
            card, so it makes its own entrance — the card itself does not
            remount, and a swap with no motion reads as a glitch. */}
        <div className="receipt-in space-y-4">
        <div className="flex flex-col items-center pt-1 text-center">
          {/* Plays once, the moment the receipt appears: the badge pops in,
              the tick draws itself, a ring ripples out and sparks fly. The
              keyframes live in globals.css beside the modal's own. */}
          <span className="relative grid h-14 w-14 place-items-center">
            <span
              aria-hidden
              className="tick-ring absolute inset-0 rounded-full border-2 border-emerald-400/60"
            />
            {SPARK_ANGLES.map((angle) => (
              <span
                key={angle}
                aria-hidden
                className="tick-spark absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400"
                style={{ "--spark-angle": `${angle}deg` } as CSSProperties}
              />
            ))}
            <span className="tick-badge grid h-14 w-14 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_32px_rgba(16,185,129,0.25)]">
              <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            </span>
          </span>
          <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Mã đơn hàng
          </p>
          <span className="mt-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-base font-bold tracking-wider text-white">
            {purchase.orderCode}
          </span>
        </div>
        <ProductTile
          imageUrl={product.imageUrl}
          name={product.name}
          chip={tier.label}
          meta={`×${quantity} · ${product.categoryName}`}
        />
        <PriceList>
          <PriceRow label="Đã trừ ví" value={`${formatVnd(purchase.total)}đ`} />
          {purchase.balance !== null ? (
            <PriceRow
              label="Số dư ví còn lại"
              value={`${formatVnd(purchase.balance)}đ`}
            />
          ) : null}
          {purchase.keysDelivered !== null ? (
            <PriceRow
              label="Key đã giao"
              value={`${purchase.keysDelivered}/${quantity}`}
              tone={purchase.keysPending > 0 ? "plain" : "ok"}
            />
          ) : null}
        </PriceList>
        {purchase.keysPending > 0 ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12px] font-semibold text-amber-300">
            Còn {purchase.keysPending} key chờ shop bàn giao — theo dõi trong Đơn
            hàng của bạn.
          </p>
        ) : (
          <DialogAlert tone="ok">
            Key và link tải đã sẵn trong Đơn hàng của bạn. Đọc Hướng dẫn cài đặt
            trên trang tool trước khi chạy.
          </DialogAlert>
        )}
        </div>
      </BuyConfirmDialog>
    );
  }

  return (
    <BuyConfirmDialog
      open={open && tier !== null}
      onClose={onClose}
      footer={
        <ConfirmFooter
          onCancel={onClose}
          onConfirm={buyNow}
          busy={busy}
          canAfford={canAfford}
        />
      }
    >
      {tier ? (
        <>
          <ProductTile
            imageUrl={product.imageUrl}
            name={product.name}
            chip={tier.label}
            meta={`×${quantity} · ${product.categoryName}`}
          />
          <PriceList>
            <PriceRow label="Đơn giá" value={`${formatVnd(tier.price)}đ`} />
            <PriceRow label="Số lượng" value={String(quantity)} />
            <PriceRow label="Tạm tính" value={`${formatVnd(lineTotal)}đ`} />
            {memberTier && memberCut > 0 ? (
              <PriceRow
                label={`Ưu đãi hạng ${TIER_RULES[memberTier].label} −${formatTierPercent(TIER_RULES[memberTier].discountPercent)}%`}
                value={`−${formatVnd(memberCut)}đ`}
                tone="ok"
              />
            ) : null}
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
          {dialogError ? <DialogAlert tone="err">{dialogError}</DialogAlert> : null}
        </>
      ) : null}
    </BuyConfirmDialog>
  );
}
