"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface VoucherView {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
}

export interface FlashSaleView {
  id: string;
  productCode: string;
  productRank: string;
  price: number;
  salePrice: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  /** Computed server-side against one clock, so both renders agree. */
  running: boolean;
}

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const TAB_ON =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[#7C3AED] text-white transition-colors";
const TAB_OFF =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

/**
 * Vouchers and scheduled flash sales on one screen.
 *
 * Vouchers are switched off, never deleted: orders reference the code they
 * were bought with, and removing one would orphan that history.
 */
export function AdminMarketing({
  vouchers,
  sales,
}: {
  vouchers: VoucherView[];
  sales: FlashSaleView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"voucher" | "sale">("voucher");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<FlashSaleView | null>(null);

  // Voucher form
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [vStart, setVStart] = useState("");
  const [vEnd, setVEnd] = useState("");
  const [maxUses, setMaxUses] = useState("");

  // Flash sale form
  const [productCode, setProductCode] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");

  async function call(url: string, method: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Thao tác thất bại");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Không kết nối được máy chủ");
      return false;
    } finally {
      setPending(false);
      setRemoving(null);
    }
  }

  const digits = (value: string) => Number(value.replace(/\D/g, "")) || 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("voucher")} className={tab === "voucher" ? TAB_ON : TAB_OFF}>
          Voucher
        </button>
        <button type="button" onClick={() => setTab("sale")} className={tab === "sale" ? TAB_ON : TAB_OFF}>
          Flash Sale
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {tab === "voucher" ? (
        <>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call("/api/admin/vouchers", "POST", {
                code,
                percentOff: digits(percentOff),
                amountOff: digits(amountOff),
                minOrder: digits(minOrder),
                maxUses: digits(maxUses),
                startsAt: vStart || undefined,
                expiresAt: vEnd || undefined,
              });
              if (ok) {
                setCode(""); setPercentOff(""); setAmountOff("");
                setMinOrder(""); setVStart(""); setVEnd(""); setMaxUses("");
              }
            }}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <div>
              <label htmlFor="v-code" className={LABEL}>Mã voucher</label>
              <input id="v-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="SALE50" className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-percent" className={LABEL}>Giảm %</label>
              <input id="v-percent" inputMode="numeric" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} placeholder="10" className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-amount" className={LABEL}>Hoặc giảm tiền</label>
              <input id="v-amount" inputMode="numeric" value={amountOff} onChange={(e) => setAmountOff(e.target.value)} placeholder="50000" className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-min" className={LABEL}>Đơn tối thiểu</label>
              <input id="v-min" inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-start" className={LABEL}>Bắt đầu</label>
              <input id="v-start" type="datetime-local" value={vStart} onChange={(e) => setVStart(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-end" className={LABEL}>Hết hạn</label>
              <input id="v-end" type="datetime-local" value={vEnd} onChange={(e) => setVEnd(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="v-max" className={LABEL}>Lượt dùng tối đa</label>
              <input id="v-max" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Không giới hạn" className={FIELD} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={pending} className="w-full h-[42px] rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center justify-center gap-1.5">
                <Plus size={14} />
                Tạo mã
              </button>
            </div>
          </form>

          {vouchers.length === 0 ? (
            <AdminEmpty title="Chưa có voucher nào" body="Tạo mã đầu tiên bằng biểu mẫu bên trên." />
          ) : (
            <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Mã", "Giảm", "Đơn tối thiểu", "Đã dùng", "Hiệu lực", "Trạng thái", ""].map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.code} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-black text-white">{v.code}</td>
                      <td className="px-4 py-3 text-xs text-neutral-200">
                        {v.percentOff ? `${v.percentOff}%` : v.amountOff ? `${formatVnd(v.amountOff)}đ` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 tabular-nums">
                        {v.minOrder ? `${formatVnd(v.minOrder)}đ` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 tabular-nums">
                        {v.usedCount}{v.maxUses ? ` / ${v.maxUses}` : ""}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-neutral-500">
                        {v.startsAt ?? "ngay"} → {v.expiresAt ?? "không hạn"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${v.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-neutral-500"}`}>
                          {v.active ? "Bật" : "Tắt"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => call("/api/admin/vouchers", "PATCH", { code: v.code, active: !v.active })}
                          className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Power size={12} />
                          {v.active ? "Tắt" : "Bật"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call("/api/admin/flash-sales", "POST", {
                productCode,
                salePrice: digits(salePrice),
                startsAt: sStart,
                endsAt: sEnd,
              });
              if (ok) { setProductCode(""); setSalePrice(""); setSStart(""); setSEnd(""); }
            }}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div>
              <label htmlFor="s-code" className={LABEL}>Mã sản phẩm</label>
              <input id="s-code" required value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="VLR2079" className={FIELD} />
            </div>
            <div>
              <label htmlFor="s-price" className={LABEL}>Giá sale</label>
              <input id="s-price" inputMode="numeric" required value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="1990000" className={FIELD} />
            </div>
            <div>
              <label htmlFor="s-start" className={LABEL}>Bắt đầu</label>
              <input id="s-start" type="datetime-local" required value={sStart} onChange={(e) => setSStart(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="s-end" className={LABEL}>Kết thúc</label>
              <input id="s-end" type="datetime-local" required value={sEnd} onChange={(e) => setSEnd(e.target.value)} className={FIELD} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={pending} className="w-full h-[42px] rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center justify-center gap-1.5">
                <Plus size={14} />
                Lên lịch
              </button>
            </div>
          </form>

          {sales.length === 0 ? (
            <AdminEmpty
              title="Chưa lên lịch đợt sale nào"
              body="Khi chưa có lịch, khu Flash Sale ngoài trang chủ vẫn hiển thị mọi sản phẩm đang giảm giá."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sales.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-neutral-900/50 px-4 py-3">
                  <span className="font-mono text-xs font-black text-white">{s.productCode}</span>
                  <span className="text-[11px] text-neutral-500">{s.productRank}</span>
                  <span className="text-xs text-neutral-400 tabular-nums">
                    <span className="line-through text-neutral-600">{formatVnd(s.price)}đ</span>{" "}
                    <span className="text-emerald-400 font-bold">{formatVnd(s.salePrice)}đ</span>
                  </span>
                  <span className="text-[11px] text-neutral-500">{s.startsAt} → {s.endsAt}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${s.running ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : s.active ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-white/10 bg-white/5 text-neutral-500"}`}>
                    {s.running ? "Đang chạy" : s.active ? "Chờ tới giờ" : "Tắt"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button type="button" disabled={pending} onClick={() => call("/api/admin/flash-sales", "PATCH", { id: s.id, active: !s.active })} className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5">
                      <Power size={12} />
                      {s.active ? "Tắt" : "Bật"}
                    </button>
                    <button type="button" disabled={pending} onClick={() => setRemoving(s)} aria-label={`Xoá đợt sale ${s.productCode}`} className="h-8 w-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 transition-colors inline-flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={pending}
        title="Xoá đợt flash sale?"
        body={
          removing
            ? `Đợt sale của ${removing.productCode} sẽ bị xoá hẳn. Sản phẩm quay về giá ${formatVnd(removing.price)}đ. Muốn giữ lịch để dùng lại thì bấm Tắt thay vì xoá.`
            : ""
        }
        confirmLabel="Xoá đợt sale"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && call("/api/admin/flash-sales", "PATCH", { id: removing.id, remove: true })}
      />
    </div>
  );
}
