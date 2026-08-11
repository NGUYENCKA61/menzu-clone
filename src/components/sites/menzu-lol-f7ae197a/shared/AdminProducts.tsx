"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminProductRow {
  code: string;
  rank: string;
  status: string;
  price: number;
  oldPrice: number;
  categoryName: string;
  orderCount: number;
}

export interface AdminCategoryOption {
  slug: string;
  name: string;
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Đang bán",
  RESERVED: "Đang giữ",
  SOLD: "Đã bán",
  HIDDEN: "Đã ẩn",
};

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AdminProducts({
  products,
  categories,
}: {
  products: AdminProductRow[];
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [code, setCode] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [rank, setRank] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown> | null,
    query = "",
  ) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products${query}`, {
        method,
        ...(payload
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
          : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Thao tác thất bại" });
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const ok = await call("POST", {
      code,
      categorySlug,
      rank,
      price: Number(price.replace(/\D/g, "")),
      oldPrice: Number((oldPrice || price).replace(/\D/g, "")),
    });
    if (ok) {
      setMsg({ tone: "ok", text: `Đã thêm ${code.toUpperCase()}` });
      setCode("");
      setRank("");
      setPrice("");
      setOldPrice("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Thêm sản phẩm
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className={LABEL}>Mã</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VLR9999"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Danh mục</label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={FIELD}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Rank</label>
            <input
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="GOLD 1"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Giá bán</label>
            <input
              required
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2990000"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Giá gốc</label>
            <input
              inputMode="numeric"
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              placeholder="bằng giá bán"
              className={FIELD}
            />
          </div>
        </div>

        {msg ? (
          <p
            role="alert"
            className={
              msg.tone === "ok"
                ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-400"
                : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
            }
          >
            {msg.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          {busy ? "Đang xử lý…" : "Thêm sản phẩm"}
        </button>
      </form>

      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {["Mã", "Danh mục", "Rank", "Giá", "Trạng thái", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.code} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 text-xs font-black text-white">#{p.code}</td>
                <td className="px-5 py-3 text-xs text-neutral-400">{p.categoryName}</td>
                <td className="px-5 py-3 text-xs text-neutral-300">{p.rank}</td>
                <td className="px-5 py-3 text-xs font-bold text-white">
                  {formatVnd(p.price)}đ
                </td>
                <td className="px-5 py-3">
                  <select
                    value={p.status}
                    disabled={busy}
                    onChange={(e) =>
                      call("PATCH", { code: p.code, status: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-200"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-900">
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    disabled={busy || p.orderCount > 0}
                    title={
                      p.orderCount > 0
                        ? "Đã có đơn hàng — hãy ẩn thay vì xoá"
                        : "Xoá sản phẩm"
                    }
                    onClick={() => call("DELETE", null, `?code=${p.code}`)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
