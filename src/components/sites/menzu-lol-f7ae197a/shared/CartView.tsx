"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { formatVnd } from "./productData";

export interface CartLine {
  id: string;
  code: string;
  name: string;
  packageLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

const STEP_BUTTON =
  "h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-40 transition-colors";

/**
 * The basket, its totals and its checkout.
 *
 * Quantities are written straight through to the server rather than kept in
 * local state and saved at the end: the same cart is reachable from another
 * tab and from the phone, and a total that disagreed between two open windows
 * would be worse than the extra request.
 */
export function CartView({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[] | null>(null);

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  async function send(
    method: "PATCH" | "DELETE",
    body: Record<string, unknown> | null,
    query = "",
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cart${query}`, {
        method,
        ...(body
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Thao tác thất bại");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        shortfall?: number;
        orderCodes?: string[];
      };
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      if (!res.ok) {
        setError(
          typeof data.shortfall === "number"
            ? `${data.error} — thiếu ${formatVnd(data.shortfall)}đ`
            : (data.error ?? "Không thể thanh toán"),
        );
        return;
      }
      setDone(data.orderCodes ?? []);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 text-center">
        <p className="text-xl font-bold text-white mb-2">Thanh toán thành công</p>
        <p className="text-sm text-neutral-400 max-w-[460px] leading-relaxed">
          {done.length === 1
            ? `Mã đơn của bạn: ${done[0]}`
            : `Đã tạo ${done.length} đơn hàng: ${done.join(", ")}`}
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-flex items-center h-10 px-5 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] transition-colors text-[11px] font-black uppercase tracking-widest text-white"
        >
          Xem đơn hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-4 border-b border-white/[0.07] last:border-0"
          >
            <div className="relative h-14 w-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-neutral-900">
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={line.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/software/${line.code}`}
                className="block text-sm font-bold text-white hover:text-[var(--menzu-accent)] transition-colors truncate"
              >
                {line.name}
              </Link>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {line.packageLabel} · {formatVnd(line.unitPrice)}đ / bản
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm số lượng"
                disabled={busy || line.quantity <= 1}
                onClick={() => send("PATCH", { id: line.id, quantity: line.quantity - 1 })}
                className={STEP_BUTTON}
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold text-white">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label="Tăng số lượng"
                disabled={busy || line.quantity >= 99}
                onClick={() => send("PATCH", { id: line.id, quantity: line.quantity + 1 })}
                className={STEP_BUTTON}
              >
                <Plus size={14} />
              </button>
            </div>

            <span className="w-28 text-right text-sm font-black text-white">
              {formatVnd(line.unitPrice * line.quantity)}đ
            </span>

            <button
              type="button"
              aria-label={`Xoá ${line.name}`}
              disabled={busy}
              onClick={() => send("DELETE", null, `?id=${encodeURIComponent(line.id)}`)}
              className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] font-semibold text-red-400"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Tổng cộng
          </span>
          <span className="block text-3xl font-black text-white mt-1">
            {formatVnd(total)}đ
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => send("DELETE", null, "?all=1")}
            className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors text-[11px] font-black uppercase tracking-widest text-neutral-300"
          >
            Xoá hết
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={checkout}
            className="h-12 px-7 rounded-xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-60 transition-colors text-[12px] font-black uppercase tracking-widest text-white"
          >
            {busy ? "Đang xử lý…" : "Thanh toán"}
          </button>
        </div>
      </div>
    </div>
  );
}
