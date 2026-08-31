"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  Plus,
  Power,
  TicketPercent,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  /** Printed as-is in the table: what the code may be spent on. */
  scopeLabel: string;
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
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const TAB_ON =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--brand)] text-white transition-colors";
const TAB_OFF =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

/** Bật = go, Tắt = warn: the button's color says what pressing it does. */
const BTN_ON =
  "h-8 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors inline-flex items-center gap-1.5";
const BTN_OFF =
  "h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-colors inline-flex items-center gap-1.5";

function StatMini({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}>
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          value === 0 ? "text-neutral-600" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Vouchers and scheduled flash sales on one screen.
 *
 * Vouchers are switched off, never deleted: orders reference the code they
 * were bought with, and removing one would orphan that history.
 */
export function AdminMarketing({
  vouchers,
  categories,
  products,
  sales,
}: {
  vouchers: VoucherView[];
  /** For the "Áp dụng cho danh mục" pick. */
  categories: { slug: string; name: string }[];
  /** For the "Những sản phẩm chỉ định" pick: every live product. */
  products: { code: string; name: string; category: string }[];
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
  const [scope, setScope] = useState<"ALL" | "CATEGORY" | "PRODUCT">("ALL");
  const [scopeCategory, setScopeCategory] = useState("");
  /** Codes ticked in the product pick. */
  const [scopeProducts, setScopeProducts] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");

  // Flash sale form
  const [productCode, setProductCode] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");

  // The product pick, narrowed by the search box. Ticked rows always stay
  // in view, so what the code covers is visible while searching for more.
  const needle = productQuery.trim().toLowerCase();
  const pickable = products.filter(
    (p) =>
      scopeProducts.includes(p.code) ||
      !needle ||
      p.name.toLowerCase().includes(needle) ||
      p.code.toLowerCase().includes(needle) ||
      p.category.toLowerCase().includes(needle),
  );

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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatMini
          label="Voucher đang bật"
          value={vouchers.filter((v) => v.active).length}
          icon={TicketPercent}
          tint="border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
        />
        <StatMini
          label="Tổng lượt dùng mã"
          value={vouchers.reduce((sum, v) => sum + v.usedCount, 0)}
          icon={TicketPercent}
          tint="border-violet-500/25 bg-violet-500/10 text-violet-400"
        />
        <StatMini
          label="Sale đang chạy"
          value={sales.filter((s) => s.running).length}
          icon={Zap}
          tint="border-rose-500/25 bg-rose-500/10 text-rose-400"
        />
        <StatMini
          label="Sale chờ tới giờ"
          value={sales.filter((s) => s.active && !s.running).length}
          icon={CalendarClock}
          tint="border-amber-500/25 bg-amber-500/10 text-amber-400"
        />
      </div>

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
              if (scope === "PRODUCT" && scopeProducts.length === 0) {
                setError("Chọn ít nhất một sản phẩm để áp dụng mã");
                return;
              }
              const ok = await call("/api/admin/vouchers", "POST", {
                code,
                percentOff: digits(percentOff),
                amountOff: digits(amountOff),
                minOrder: digits(minOrder),
                maxUses: digits(maxUses),
                startsAt: vStart || undefined,
                expiresAt: vEnd || undefined,
                scope,
                categorySlug: scope === "CATEGORY" ? scopeCategory : undefined,
                productCodes: scope === "PRODUCT" ? scopeProducts : undefined,
              });
              if (ok) {
                setCode(""); setPercentOff(""); setAmountOff("");
                setMinOrder(""); setVStart(""); setVEnd(""); setMaxUses("");
                setScope("ALL"); setScopeCategory(""); setScopeProducts([]); setProductQuery("");
              }
            }}
            className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <div className="sm:col-span-3 lg:col-span-4 -mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
              <TicketPercent size={13} className="text-neutral-400" />
              Tạo voucher
            </div>
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
            <div>
              <label htmlFor="v-scope" className={LABEL}>Áp dụng cho</label>
              <select
                id="v-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as "ALL" | "CATEGORY" | "PRODUCT")}
                className={FIELD}
              >
                <option value="ALL" className="bg-neutral-900">Mọi sản phẩm</option>
                <option value="CATEGORY" className="bg-neutral-900">Một danh mục</option>
                <option value="PRODUCT" className="bg-neutral-900">Những sản phẩm chỉ định</option>
              </select>
            </div>
            {scope === "CATEGORY" ? (
              <div>
                <label htmlFor="v-category" className={LABEL}>Danh mục</label>
                <select
                  id="v-category"
                  required
                  value={scopeCategory}
                  onChange={(e) => setScopeCategory(e.target.value)}
                  className={FIELD}
                >
                  <option value="" className="bg-neutral-900">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug} className="bg-neutral-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : scope === "PRODUCT" ? (
              <div className="sm:col-span-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="v-product-search" className={LABEL}>Sản phẩm chỉ định</label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Đã chọn {scopeProducts.length}
                  </span>
                </div>
                <input
                  id="v-product-search"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Tìm theo tên, mã hoặc danh mục…"
                  className={FIELD}
                />
                <div
                  role="group"
                  aria-label="Chọn sản phẩm áp dụng mã"
                  className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]"
                >
                  {pickable.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-500">Không có sản phẩm nào khớp.</p>
                  ) : (
                    pickable.map((p) => {
                      const checked = scopeProducts.includes(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${checked ? "bg-white/[0.05]" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setScopeProducts((prev) =>
                                checked ? prev.filter((c) => c !== p.code) : [...prev, p.code],
                              )
                            }
                            className="h-3.5 w-3.5 shrink-0 accent-[var(--brand)]"
                          />
                          <span className="min-w-0 flex-1 truncate font-bold text-white">{p.name}</span>
                          <span className="shrink-0 font-mono text-[10px] font-black text-neutral-400">{p.code}</span>
                          <span className="hidden shrink-0 text-[10px] text-neutral-500 sm:inline">{p.category}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
            <div className="flex items-end">
              <button type="submit" disabled={pending} className="w-full h-[42px] rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center justify-center gap-1.5">
                <Plus size={14} />
                Tạo mã
              </button>
            </div>
          </form>

          {vouchers.length === 0 ? (
            <AdminEmpty title="Chưa có voucher nào" body="Tạo mã đầu tiên bằng biểu mẫu bên trên." />
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e0e11]">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Mã", "Giảm", "Áp dụng", "Đơn tối thiểu", "Đã dùng", "Hiệu lực", "Trạng thái", ""].map((c) => (
                      <th key={c} scope="col" className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.code} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.015]">
                      <td className="px-5 py-3 font-mono text-xs font-black text-white">{v.code}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {v.percentOff || v.amountOff ? (
                          <span className="inline-flex rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-black tabular-nums text-emerald-400">
                            −{v.percentOff ? `${v.percentOff}%` : `${formatVnd(v.amountOff ?? 0)}đ`}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-300 whitespace-nowrap">
                        {v.scopeLabel}
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-400 tabular-nums">
                        {v.minOrder ? `${formatVnd(v.minOrder)}đ` : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs tabular-nums whitespace-nowrap">
                        <span className={v.usedCount > 0 ? "font-bold text-white" : "text-neutral-600"}>
                          {v.usedCount}
                        </span>
                        <span className="text-neutral-600">
                          {v.maxUses ? ` / ${v.maxUses}` : " / ∞"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-neutral-500 tabular-nums">
                        {v.startsAt ?? "ngay"} → {v.expiresAt ?? "không hạn"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${v.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-neutral-500"}`}>
                          {v.active ? "Bật" : "Tắt"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => call("/api/admin/vouchers", "PATCH", { code: v.code, active: !v.active })}
                          className={v.active ? BTN_OFF : BTN_ON}
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
            className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div className="sm:col-span-2 lg:col-span-5 -mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
              <Zap size={13} className="text-neutral-400" />
              Lên lịch flash sale
            </div>
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
              <button type="submit" disabled={pending} className="w-full h-[42px] rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center justify-center gap-1.5">
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
            <div className="flex flex-col gap-2.5">
              {sales.map((s) => {
                const cut = s.price > 0 ? Math.round((1 - s.salePrice / s.price) * 100) : 0;
                return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.08] bg-[#0e0e11] px-5 py-3.5 transition-colors hover:bg-white/[0.015]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400">
                    <Zap size={14} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-mono text-xs font-black text-white">{s.productCode}</span>
                    <span className="text-[11px] text-neutral-500">{s.productRank}</span>
                  </span>
                  <span className="text-xs tabular-nums">
                    <span className="line-through text-neutral-600">{formatVnd(s.price)}đ</span>{" "}
                    <span className="text-emerald-400 font-bold">{formatVnd(s.salePrice)}đ</span>
                  </span>
                  {cut > 0 ? (
                    <span className="inline-flex rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-black tabular-nums text-rose-400">
                      −{cut}%
                    </span>
                  ) : null}
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {s.startsAt} → {s.endsAt}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${s.running ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : s.active ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-white/10 bg-white/5 text-neutral-500"}`}>
                    {s.running ? "Đang chạy" : s.active ? "Chờ tới giờ" : "Tắt"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => call("/api/admin/flash-sales", "PATCH", { id: s.id, active: !s.active })}
                      className={s.active ? BTN_OFF : BTN_ON}
                    >
                      <Power size={12} />
                      {s.active ? "Tắt" : "Bật"}
                    </button>
                    <button type="button" disabled={pending} onClick={() => setRemoving(s)} aria-label={`Xoá đợt sale ${s.productCode}`} className="h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-60 text-neutral-500 hover:text-red-400 transition-colors inline-flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                );
              })}
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
