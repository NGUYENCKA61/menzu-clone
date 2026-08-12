"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ban, Search, ShieldCheck } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface AdminUserView {
  uid: number;
  username: string;
  email: string | null;
  role: string;
  tier: string;
  balance: number;
  points: number;
  orderCount: number;
  totalSpent: number;
  /** Pre-formatted server-side so both renders agree. */
  lastOrderAt: string | null;
  blockedAt: string | null;
  createdAt: string;
}

const FILTERS = ["Tất cả", "Đang hoạt động", "Đã khóa", "Quản trị"] as const;

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Customer list with search, filter and block control.
 *
 * Only what an admin needs to answer a support question is shown — no
 * password hashes, no session ids, no addresses. The list is a customer
 * record, not a dump of the row.
 */
export function AdminUsers({ users }: { users: AdminUserView[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tất cả");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState<AdminUserView | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (filter === "Đã khóa" && !user.blockedAt) return false;
      if (filter === "Đang hoạt động" && user.blockedAt) return false;
      if (filter === "Quản trị" && user.role !== "ADMIN") return false;
      if (!needle) return true;
      return [user.username, user.email ?? "", String(user.uid)].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [users, query, filter]);

  async function toggleBlock(user: AdminUserView) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user.username, blocked: !user.blockedAt }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Không cập nhật được");
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
      setTarget(null);
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
            placeholder="Tìm tên đăng nhập, email hoặc UID..."
            aria-label="Tìm người dùng"
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
              {option}
            </button>
          ))}
        </div>
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {visible.length === 0 ? (
        <AdminEmpty title="Không có người dùng nào khớp" />
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/40">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Tài khoản", "Số dư & Điểm", "Đơn hàng", "Tổng chi", "Đơn gần nhất", "Trạng thái", ""].map(
                  (column) => (
                    <th
                      key={column}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.username} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">
                        {user.username}
                        {user.role === "ADMIN" ? (
                          <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-indigo-400">
                            Admin
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        UID {user.uid} · {user.email ?? "chưa có email"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        {formatVnd(user.balance)}đ
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {user.points} Pts · {user.tier}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-200 tabular-nums">
                    {user.orderCount}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-white tabular-nums">
                    {formatVnd(user.totalSpent)}đ
                  </td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500">
                    {user.lastOrderAt ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {user.blockedAt ? (
                      <span className="inline-flex px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-wider">
                        Khóa {user.blockedAt}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role === "ADMIN" ? null : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setTarget(user)}
                        className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 ${
                          user.blockedAt
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {user.blockedAt ? <ShieldCheck size={12} /> : <Ban size={12} />}
                        {user.blockedAt ? "Mở khóa" : "Khóa"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={target !== null}
        danger={target !== null && !target.blockedAt}
        pending={pending}
        title={target?.blockedAt ? "Mở khóa tài khoản?" : "Khóa tài khoản?"}
        body={
          target
            ? target.blockedAt
              ? `${target.username} sẽ đăng nhập lại được ngay.`
              : `${target.username} sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập lại được. Số dư ${formatVnd(target.balance)}đ vẫn được giữ nguyên.`
            : ""
        }
        confirmLabel={target?.blockedAt ? "Mở khóa" : "Khóa tài khoản"}
        onCancel={() => setTarget(null)}
        onConfirm={() => target && toggleBlock(target)}
      />
    </div>
  );
}
