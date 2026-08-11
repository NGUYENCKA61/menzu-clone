"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminVoucherRow {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
}

const FIELD =
  "w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AdminVouchers({ vouchers }: { vouchers: AdminVoucherRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);

    const numeric = Number(value.replace(/\D/g, ""));
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          percentOff: kind === "percent" ? numeric : 0,
          amountOff: kind === "amount" ? numeric : 0,
          maxUses: Number(maxUses.replace(/\D/g, "")) || 0,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Không tạo được voucher" });
        return;
      }
      setMsg({ tone: "ok", text: `Đã tạo ${code.toUpperCase()}` });
      setCode("");
      setValue("");
      setMaxUses("");
      setExpiresAt("");
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Không kết nối được máy chủ" });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(voucherCode: string, active: boolean) {
    setBusy(true);
    try {
      await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: voucherCode, active }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Tạo voucher
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className={LABEL}>Mã</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SALE50"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Kiểu giảm</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "amount")}
              className={FIELD}
            >
              <option value="percent" className="bg-neutral-900">
                Theo %
              </option>
              <option value="amount" className="bg-neutral-900">
                Theo số tiền
              </option>
            </select>
          </div>
          <div>
            <label className={LABEL}>{kind === "percent" ? "Giảm (%)" : "Giảm (đ)"}</label>
            <input
              required
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === "percent" ? "10" : "100000"}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Lượt dùng tối đa</label>
            <input
              inputMode="numeric"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="không giới hạn"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Hết hạn</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
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
          {busy ? "Đang xử lý…" : "Tạo voucher"}
        </button>
      </form>

      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-white/10">
              {["Mã", "Giảm", "Đã dùng", "Hết hạn", "Trạng thái"].map((h) => (
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
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-neutral-400">
                  Chưa có voucher nào
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.code} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-xs font-black text-white">{v.code}</td>
                  <td className="px-5 py-3 text-xs text-neutral-300">
                    {v.percentOff !== null
                      ? `${v.percentOff}%`
                      : `${formatVnd(v.amountOff ?? 0)}đ`}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">
                    {v.usedCount}
                    {v.maxUses !== null ? ` / ${v.maxUses}` : ""}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">
                    {v.expiresAt
                      ? new Date(v.expiresAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(v.code, !v.active)}
                      className={
                        v.active
                          ? "px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider"
                          : "px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-neutral-400 text-[10px] font-black uppercase tracking-wider"
                      }
                    >
                      {v.active ? "Đang bật" : "Đã tắt"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
