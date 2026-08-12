"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface TradeRow {
  code: string;
  username: string;
  mode: string;
  mailType: string;
  hasWelcomeMail: boolean;
  screenshotUrl: string | null;
  zalo: string;
  note: string | null;
  status: string;
  quotedAmount: number | null;
  /** Pre-formatted on the server so both renders agree. */
  createdAt: string;
}

const MODE_LABEL: Record<string, string> = {
  SELL: "Thanh lý",
  EXCHANGE: "Đổi mới",
};

const STATUS: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ báo giá", className: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  QUOTED: { text: "Đã báo giá", className: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  ACCEPTED: { text: "Đã nhận", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED: { text: "Từ chối", className: "text-red-400 bg-red-500/10 border-red-500/30" },
  DONE: { text: "Hoàn tất", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};

const FILTERS = ["Tất cả", "PENDING", "QUOTED", "ACCEPTED", "REJECTED", "DONE"];

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * The trade-in queue.
 *
 * Requests were landing in the database with nowhere to answer them, so the
 * point of this screen is the two actions at the end of each row: quote a
 * price, or reject.
 */
export function AdminTrade({ rows }: { rows: TradeRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<TradeRow | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "Tất cả" && row.status !== filter) return false;
      if (!needle) return true;
      return [row.code, row.username, row.zalo].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [rows, query, filter]);

  async function send(code: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/trade", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, ...body }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Cập nhật thất bại");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
      setConfirming(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, tài khoản, số Zalo..."
            aria-label="Tìm đơn thu cũ"
            className="w-full rounded-xl border border-white/5 bg-[#111111] pl-11 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`shrink-0 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                filter === option
                  ? "border-[#7C3AED] bg-[#7C3AED]/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white"
              }`}
            >
              {option === "Tất cả" ? option : (STATUS[option]?.text ?? option)}
            </button>
          ))}
        </div>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {rows.length === 0 ? (
        <AdminEmpty
          title="Chưa có đơn thu cũ nào"
          body="Đơn khách gửi từ trang Thu cũ đổi mới sẽ hiện ở đây để báo giá."
        />
      ) : visible.length === 0 ? (
        <AdminEmpty title="Không có đơn nào khớp bộ lọc" />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((row) => {
            const status = STATUS[row.status] ?? STATUS.PENDING!;
            return (
              <div
                key={row.code}
                className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-mono text-xs font-bold text-white">{row.code}</span>
                  <span className="text-[11px] text-neutral-300">{row.username}</span>
                  <span className="text-[11px] text-neutral-500">
                    {MODE_LABEL[row.mode] ?? row.mode} · {row.mailType}
                    {row.hasWelcomeMail ? " · có thư Welcome" : ""}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${status.className}`}
                  >
                    {status.text}
                  </span>
                  <span className="text-[11px] text-neutral-500 ml-auto">{row.createdAt}</span>
                </div>

                {row.note ? (
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{row.note}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`https://zalo.me/${row.zalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#7C3AED] hover:underline"
                  >
                    Zalo {row.zalo}
                  </a>

                  {row.screenshotUrl ? (
                    <a
                      href={row.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-12 h-9 rounded-md overflow-hidden border border-white/10"
                    >
                      <Image
                        src={row.screenshotUrl}
                        alt="Ảnh thư Welcome"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </a>
                  ) : null}

                  <div className="flex items-center gap-2 ml-auto">
                    <label htmlFor={`quote-${row.code}`} className="sr-only">
                      Giá báo cho đơn {row.code}
                    </label>
                    <input
                      id={`quote-${row.code}`}
                      inputMode="numeric"
                      value={quotes[row.code] ?? (row.quotedAmount ? String(row.quotedAmount) : "")}
                      onChange={(event) =>
                        setQuotes((previous) => ({ ...previous, [row.code]: event.target.value }))
                      }
                      placeholder="Giá báo"
                      className="w-28 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white tabular-nums outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        send(row.code, {
                          status: "QUOTED",
                          quotedAmount: Number(
                            (quotes[row.code] ?? String(row.quotedAmount ?? "")).replace(/\D/g, ""),
                          ),
                        })
                      }
                      className="h-9 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Báo giá
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirming(row)}
                      aria-label={`Từ chối đơn ${row.code}`}
                      className="h-9 w-9 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 transition-colors inline-flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {row.quotedAmount ? (
                  <p className="text-[11px] text-neutral-400">
                    Đã báo giá: <span className="text-white font-bold">{formatVnd(row.quotedAmount)}đ</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        danger
        pending={pending}
        title="Từ chối đơn thu cũ?"
        body={
          confirming
            ? `Đơn ${confirming.code} của ${confirming.username} sẽ chuyển sang trạng thái Từ chối. Khách vẫn thấy đơn trong lịch sử của họ.`
            : ""
        }
        confirmLabel="Từ chối đơn"
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && send(confirming.code, { status: "REJECTED" })}
      />
    </div>
  );
}
