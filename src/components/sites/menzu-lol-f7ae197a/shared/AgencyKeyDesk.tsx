"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatusToast } from "./StatusToast";
import { formatVnd } from "./productData";

export interface DeskPackage {
  id: string;
  label: string;
  price: number;
}

export interface DeskProduct {
  code: string;
  name: string;
  packages: DeskPackage[];
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-neutral-300";

/**
 * The đại lý buying desk: tool → tier → quantity, wholesale price quoted
 * live, and the order goes through the same /api/orders every retail buyer
 * uses — the server recognises the AGENCY role and applies that account's
 * own percent, so this desk quotes a price it cannot be wrong about.
 */
export function AgencyKeyDesk({
  products,
  discountPercent,
}: {
  products: DeskProduct[];
  /** This account's negotiated rate; 0 renders the desk at retail. */
  discountPercent: number;
}) {
  const router = useRouter();
  const [productCode, setProductCode] = useState(products[0]?.code ?? "");
  const product = products.find((p) => p.code === productCode) ?? products[0];
  const [packageId, setPackageId] = useState(product?.packages[0]?.id ?? "");
  const pack =
    product?.packages.find((p) => p.id === packageId) ?? product?.packages[0];
  const [qtyRaw, setQtyRaw] = useState("1");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const quantity = Math.min(99, Math.max(1, Math.floor(Number(qtyRaw)) || 1));
  const retail = (pack?.price ?? 0) * quantity;
  // Mirrors lib/agency.ts exactly: floor of the percent, never rounded up.
  const cut = Math.floor((retail * discountPercent) / 100);
  const total = retail - cut;

  function pickProduct(code: string) {
    setProductCode(code);
    const next = products.find((p) => p.code === code);
    setPackageId(next?.packages[0]?.id ?? "");
  }

  async function buy() {
    if (pending || !product || !pack) return;
    setPending(true);
    setToast(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: product.code, packageId: pack.id, quantity }),
      });
      const data = (await response.json().catch(() => null)) as {
        orderCode?: string;
        balance?: number;
        total?: number;
        keysDelivered?: number;
        error?: string;
        shortfall?: number;
      } | null;
      if (!response.ok) {
        setToast({
          tone: "error",
          title: "Mua key thất bại",
          message:
            data?.shortfall !== undefined
              ? `Số dư không đủ — cần nạp thêm ${formatVnd(data.shortfall)}đ.`
              : (data?.error ?? "Không kết nối được máy chủ"),
        });
        return;
      }
      // What actually happened, not a fixed sentence. Keys come off the shelf
      // inside the same transaction that charges for them, so by the time this
      // reply arrives they are already in Đơn hàng — "Admin sẽ giao key cho
      // bạn" sent every buyer off to wait for something they already had.
      const delivered = data?.keysDelivered ?? 0;
      setToast({
        tone: "success",
        title: "Đã tạo đơn key",
        message: `Đơn ${data?.orderCode} · ${formatVnd(data?.total ?? total)}đ · ${delivered} key đã có trong Đơn hàng của bạn. Số dư còn ${formatVnd(data?.balance ?? 0)}đ.`,
      });
      router.refresh();
    } catch {
      setToast({
        tone: "error",
        title: "Mua key thất bại",
        message: "Không kết nối được máy chủ",
      });
    } finally {
      setPending(false);
    }
  }

  if (!product || !pack) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
        Chưa có phần mềm nào đang mở bán.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Phần mềm</span>
          <select
            value={product.code}
            onChange={(event) => pickProduct(event.target.value)}
            className={FIELD}
          >
            {products.map((p) => (
              <option key={p.code} value={p.code} className="bg-[#111]">
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={LABEL}>Gói</span>
          <select
            value={pack.id}
            onChange={(event) => setPackageId(event.target.value)}
            className={FIELD}
          >
            {product.packages.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#111]">
                {p.label} — {formatVnd(p.price)}đ
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={LABEL}>Số lượng</span>
          <input
            value={qtyRaw}
            onChange={(event) =>
              setQtyRaw(event.target.value.replace(/\D/g, "").slice(0, 2))
            }
            inputMode="numeric"
            placeholder="1"
            className={`${FIELD} tabular-nums`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-neutral-500">Giá lẻ ×{quantity}</span>
          <span className="tabular-nums text-neutral-400 line-through">
            {formatVnd(retail)}đ
          </span>
        </div>
        {discountPercent > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Chiết khấu đại lý</span>
            <span className="tabular-nums font-bold text-amber-400">
              −{discountPercent}% · −{formatVnd(cut)}đ
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
          <span className="font-bold text-white">Thanh toán từ ví</span>
          <span className="tabular-nums text-lg font-black text-emerald-400">
            {formatVnd(total)}đ
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={buy}
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--brand)] py-3.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--brand-dark)] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Đang xử lý…" : "Mua key"}
      </button>

      {toast ? (
        <StatusToast
          tone={toast.tone}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
