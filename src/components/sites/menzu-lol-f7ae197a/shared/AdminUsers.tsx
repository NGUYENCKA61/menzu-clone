"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ban, Search, Shield, ShieldCheck, Trash2, Wallet } from "lucide-react";

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

type Pending =
  | { kind: "block"; user: AdminUserView }
  | { kind: "role"; user: AdminUserView }
  | { kind: "delete"; user: AdminUserView }
  | null;

const FILTERS = ["Tất cả", "Đang hoạt động", "Đã khóa", "Quản trị"] as const;

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Customer list with search, filter, and the four admin actions.
 *
 * Only what answers a support question is shown — no password hashes, no
 * session ids. The list is a customer record, not a dump of the row.
 */
export function AdminUsers({ users }: { users: AdminUserView[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tất cả");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Pending>(null);
  const [adjusting, setAdjusting] = useState<AdminUserView | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");

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

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Không cập nhật được");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Không kết nối được máy chủ");
      return false;
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const dialog = (() => {
    if (!confirming) return null;
    const { kind, user } = confirming;
    if (kind === "block") {
      return {
        danger: !user.blockedAt,
        title: user.blockedAt ? "Mở khóa tài khoản?" : "Khóa tài khoản?",
        body: user.blockedAt
          ? `${user.username} sẽ đăng nhập lại được ngay.`
          : `${user.username} bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập lại được. Số dư ${formatVnd(user.balance)}đ vẫn giữ nguyên.`,
        confirmLabel: user.blockedAt ? "Mở khóa" : "Khóa tài khoản",
        run: () => call({ username: user.username, blocked: !user.blockedAt }),
      };
    }
    if (kind === "role") {
      const promoting = user.role !== "ADMIN";
      return {
        danger: promoting,
        title: promoting ? "Cấp quyền quản trị?" : "Thu hồi quyền quản trị?",
        body: promoting
          ? `${user.username} sẽ thấy toàn bộ khu quản trị: sửa sản phẩm, giá, voucher, khóa tài khoản khác và chỉnh số dư của bất kỳ ai. Chỉ cấp cho người bạn tin tuyệt đối.`
          : `${user.username} sẽ mất quyền truy cập khu quản trị. Tài khoản và số dư giữ nguyên.`,
        confirmLabel: promoting ? "Cấp quyền admin" : "Thu hồi quyền",
        run: () =>
          call({
            username: user.username,
            action: "role",
            role: promoting ? "ADMIN" : "MEMBER",
          }),
      };
    }
    return {
      danger: true,
      title: "Xóa tài khoản vĩnh viễn?",
      body: `${user.username} sẽ bị xóa hẳn và không khôi phục được. Nếu tài khoản đã từng mua hàng hoặc nạp tiền, hệ thống sẽ từ chối để giữ lịch sử bán hàng — khi đó hãy khóa thay vì xóa.`,
      confirmLabel: "Xóa vĩnh viễn",
      run: () => call({ username: user.username, action: "delete" }),
    };
  })();

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
        <div className="flex flex-col gap-2">
          {visible.map((user) => (
            <div
              key={user.username}
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {formatVnd(user.balance)}đ
                </span>
                <span className="text-[11px] text-neutral-500">
                  {user.points} Pts · {user.tier}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {user.orderCount} đơn · {formatVnd(user.totalSpent)}đ
                </span>
                {user.blockedAt ? (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400">
                    Khóa {user.blockedAt}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    Hoạt động
                  </span>
                )}
                <span className="text-[11px] text-neutral-500 ml-auto">
                  Đơn gần nhất: {user.lastOrderAt ?? "—"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAdjusting(adjusting?.username === user.username ? null : user)}
                  className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <Wallet size={12} />
                  Chỉnh số dư
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming({ kind: "role", user })}
                  className="h-8 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Shield size={12} />
                  {user.role === "ADMIN" ? "Thu hồi admin" : "Cấp admin"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming({ kind: "block", user })}
                  className={`h-8 px-3 rounded-lg disabled:opacity-60 text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 ${
                    user.blockedAt
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  }`}
                >
                  {user.blockedAt ? <ShieldCheck size={12} /> : <Ban size={12} />}
                  {user.blockedAt ? "Mở khóa" : "Khóa"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming({ kind: "delete", user })}
                  aria-label={`Xóa tài khoản ${user.username}`}
                  className="h-8 w-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 transition-colors inline-flex items-center justify-center"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {adjusting?.username === user.username ? (
                <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-white/5">
                  <div>
                    <label htmlFor={`d-${user.username}`} className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                      Cộng / trừ (âm để trừ)
                    </label>
                    <input
                      id={`d-${user.username}`}
                      value={delta}
                      onChange={(event) => setDelta(event.target.value)}
                      placeholder="100000 hoặc -50000"
                      className="w-40 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white tabular-nums outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label htmlFor={`n-${user.username}`} className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                      Lý do <span className="text-neutral-600">(khách sẽ thấy)</span>
                    </label>
                    <input
                      id={`n-${user.username}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Hoàn tiền đơn VLR2079"
                      className="w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await call({
                        username: user.username,
                        action: "balance",
                        delta: Number(delta.replace(/[^\d-]/g, "")),
                        note,
                      });
                      if (ok) { setDelta(""); setNote(""); setAdjusting(null); }
                    }}
                    className="h-[34px] px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                  >
                    Áp dụng
                  </button>
                  <p className="w-full text-[11px] text-neutral-500">
                    Mọi thay đổi số dư đều ghi một dòng vào lịch sử giao dịch của
                    khách, kèm tên quản trị viên thực hiện.
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={dialog !== null}
        danger={dialog?.danger ?? false}
        pending={busy}
        title={dialog?.title ?? ""}
        body={dialog?.body ?? ""}
        confirmLabel={dialog?.confirmLabel}
        onCancel={() => setConfirming(null)}
        onConfirm={() => dialog?.run()}
      />
    </div>
  );
}
