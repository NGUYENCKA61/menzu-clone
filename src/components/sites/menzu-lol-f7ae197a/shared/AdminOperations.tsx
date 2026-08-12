"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Trash2 } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface FeedbackView {
  id: string;
  name: string;
  body: string;
  amount: number;
  verified: boolean;
  createdAt: string;
}

export interface ServiceOrderView {
  code: string;
  username: string;
  serviceName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface TopUpView {
  code: string;
  username: string;
  method: string;
  carrier: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

const SERVICE_STATUS: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ xử lý", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  IN_PROGRESS: { text: "Đang làm", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" },
  DONE: { text: "Hoàn tất", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  CANCELLED: { text: "Đã hủy", className: "border-red-500/30 bg-red-500/10 text-red-400" },
};

const NEXT_STATUS = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

const TOPUP_STATUS: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Chờ xác nhận", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  COMPLETED: { text: "Đã cộng tiền", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  FAILED: { text: "Đã từ chối", className: "border-red-500/30 bg-red-500/10 text-red-400" },
  // Grey rather than red: nobody did anything wrong, the request simply aged
  // out of the queue — and it still credits if the money turns up.
  EXPIRED: { text: "Quá hạn", className: "border-white/10 bg-white/5 text-neutral-500" },
};

const TAB_ON =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--brand)] text-white transition-colors";
const TAB_OFF =
  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white transition-colors";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Reviews, service orders and top-ups on one screen.
 *
 * Top-ups are read-only. A balance is only ever moved by the endpoint that
 * also writes the matching ledger row, so an admin control that edited one
 * here would let the two disagree.
 */
export function AdminOperations({
  feedback,
  serviceOrders,
  topUps,
}: {
  feedback: FeedbackView[];
  serviceOrders: ServiceOrderView[];
  topUps: TopUpView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"feedback" | "services" | "topups">("feedback");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<FeedbackView | null>(null);
  const [confirming, setConfirming] = useState<TopUpView | null>(null);

  async function call(url: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Thao tác thất bại");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 overflow-x-auto">
        <button type="button" onClick={() => setTab("feedback")} className={tab === "feedback" ? TAB_ON : TAB_OFF}>
          Đánh giá
        </button>
        <button type="button" onClick={() => setTab("services")} className={tab === "services" ? TAB_ON : TAB_OFF}>
          Đơn dịch vụ
        </button>
        <button type="button" onClick={() => setTab("topups")} className={tab === "topups" ? TAB_ON : TAB_OFF}>
          Nạp tiền
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {tab === "feedback" ? (
        feedback.length === 0 ? (
          <AdminEmpty title="Chưa có đánh giá nào" />
        ) : (
          <div className="flex flex-col gap-2">
            {feedback.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-xs font-black text-white">{row.name}</span>
                  <span className="text-[11px] text-neutral-500">
                    {formatVnd(row.amount)}đ · {row.createdAt}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                      row.verified
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-neutral-500"
                    }`}
                  >
                    {row.verified ? "Đã xác minh" : "Chưa xác minh"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => call("/api/admin/feedback", { id: row.id, verified: !row.verified })}
                      className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                    >
                      <BadgeCheck size={12} />
                      {row.verified ? "Bỏ xác minh" : "Xác minh"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRemoving(row)}
                      aria-label={`Xoá đánh giá của ${row.name}`}
                      className="h-8 w-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 transition-colors inline-flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-neutral-300 leading-relaxed">{row.body}</p>
              </div>
            ))}
          </div>
        )
      ) : tab === "services" ? (
        serviceOrders.length === 0 ? (
          <AdminEmpty title="Chưa có đơn dịch vụ nào" />
        ) : (
          <div className="flex flex-col gap-2">
            {serviceOrders.map((row) => {
              const status = SERVICE_STATUS[row.status] ?? SERVICE_STATUS.PENDING!;
              return (
                <div key={row.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-neutral-900/50 px-4 py-3">
                  <span className="font-mono text-xs font-black text-white">{row.code}</span>
                  <span className="text-[11px] text-neutral-300">{row.username}</span>
                  <span className="text-[11px] text-neutral-500">{row.serviceName}</span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {row.amount > 0 ? `${formatVnd(row.amount)}đ` : "Liên hệ"}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${status.className}`}>
                    {status.text}
                  </span>
                  <span className="text-[11px] text-neutral-500">{row.createdAt}</span>

                  <div className="ml-auto">
                    <label htmlFor={`st-${row.code}`} className="sr-only">
                      Trạng thái đơn {row.code}
                    </label>
                    <select
                      id={`st-${row.code}`}
                      value={row.status}
                      disabled={pending || row.status === "DONE"}
                      onChange={(event) =>
                        call("/api/admin/service-orders", { code: row.code, status: event.target.value })
                      }
                      className="h-8 rounded-lg border border-white/10 bg-neutral-950/60 px-2 text-[11px] font-bold text-neutral-200 outline-none focus:border-[var(--brand)]/60 disabled:opacity-50 transition-colors"
                    >
                      {NEXT_STATUS.map((value) => (
                        <option key={value} value={value}>
                          {SERVICE_STATUS[value]?.text ?? value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : topUps.length === 0 ? (
        <AdminEmpty title="Chưa có lượt nạp nào" />
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Mã", "Tài khoản", "Hình thức", "Số tiền", "Trạng thái", "Thời gian", ""].map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topUps.map((row) => (
                <tr key={row.code} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-white">{row.code}</td>
                  <td className="px-4 py-3 text-xs text-neutral-300">{row.username}</td>
                  <td className="px-4 py-3 text-[11px] text-neutral-400">
                    {row.method === "CARD" ? (row.carrier ?? "Thẻ cào") : "Ngân hàng"}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs font-black tabular-nums ${
                      row.status === "COMPLETED" ? "text-emerald-400" : "text-neutral-400"
                    }`}
                  >
                    {row.status === "COMPLETED" ? "+" : ""}
                    {formatVnd(row.amount)}đ
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const status = TOPUP_STATUS[row.status] ?? TOPUP_STATUS.PENDING!;
                      return (
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border whitespace-nowrap ${status.className}`}
                        >
                          {status.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500">{row.createdAt}</td>
                  <td className="px-4 py-3">
                    {/* Confirming is what actually credits the wallet, so it
                        asks first — the customer's balance is real money. */}
                    {row.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirming(row)}
                          className="h-8 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => call("/api/admin/topups", { code: row.code, action: "reject" })}
                          className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors whitespace-nowrap"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        pending={pending}
        title="Xác nhận đã nhận được tiền?"
        body={
          confirming
            ? `Ví của ${confirming.username} sẽ được cộng ${formatVnd(confirming.amount)}đ ngay lập tức và ghi một dòng vào lịch sử giao dịch. Chỉ bấm khi bạn đã nhìn thấy tiền về tài khoản với nội dung NAP ${confirming.code}.`
            : ""
        }
        confirmLabel="Cộng tiền vào ví"
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          await call("/api/admin/topups", { code: confirming.code, action: "confirm" });
          setConfirming(null);
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        danger
        pending={pending}
        title="Xoá đánh giá?"
        body={
          removing
            ? `Đánh giá của ${removing.name} sẽ bị xoá hẳn khỏi trang /feedback và không khôi phục được. Muốn giữ lại nhưng bỏ dấu tin cậy thì bấm Bỏ xác minh.`
            : ""
        }
        confirmLabel="Xoá đánh giá"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && call("/api/admin/feedback", { id: removing.id, remove: true })}
      />
    </div>
  );
}
