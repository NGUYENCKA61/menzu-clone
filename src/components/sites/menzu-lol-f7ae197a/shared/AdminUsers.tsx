"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import {
  Ban,
  ChevronDown,
  KeyRound,
  Shield,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";

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
  totalToppedUp: number;
  /** Pre-formatted server-side so both renders agree. */
  lastOrderAt: string | null;
  lastLoginAt: string | null;
  lastIp: string | null;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
}

type Pending =
  | { kind: "block"; user: AdminUserView }
  | { kind: "role"; user: AdminUserView }
  | { kind: "delete"; user: AdminUserView }
  | { kind: "password"; user: AdminUserView }
  | null;

const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ACTION =
  "h-[34px] px-4 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-white transition-colors";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** One read-only stat inside the detail panel. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className="block mt-1 text-xs font-bold text-neutral-200 tabular-nums">
        {value}
      </span>
    </div>
  );
}

/**
 * Customer list with search, filter, and the admin actions, each row opening
 * into a support panel.
 *
 * Only what answers a support question is shown — no password hashes, no
 * session ids. The list is a customer record, not a dump of the row.
 */
export function AdminUsers({
  users,
  selfUsername,
  emptyNote,
}: {
  users: AdminUserView[];
  /** The signed-in admin. The server refuses every action on their own row. */
  selfUsername: string;
  /** What to say when the page is empty — filtered out, or genuinely none. */
  emptyNote: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Pending>(null);
  const [open, setOpen] = useState<string | null>(null);

  // Drafts belong to whichever panel is open — only one is ever expanded, so
  // they are cleared on open rather than kept per user.
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Searching and filtering moved to the server. Doing it here meant looking
  // through one page of customers and reporting "not found" for somebody who
  // was on page three — which is the exact case a customer lookup is for.
  const visible = users;

  function toggle(user: AdminUserView) {
    if (open === user.username) {
      setOpen(null);
      return;
    }
    setOpen(user.username);
    setEmail(user.email ?? "");
    setDelta("");
    setNote("");
    setPassword("");
    setError(null);
  }

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
    if (kind === "password") {
      return {
        danger: true,
        title: "Đặt lại mật khẩu?",
        body: `${user.username} sẽ bị đăng xuất khỏi mọi thiết bị và chỉ đăng nhập lại được bằng mật khẩu mới. Hãy gửi mật khẩu này cho khách qua kênh bạn đã xác minh là của họ, và nhắc khách đổi lại ngay.`,
        confirmLabel: "Đặt lại mật khẩu",
        run: async () => {
          const ok = await call({
            username: user.username,
            action: "password",
            password,
          });
          if (ok) setPassword("");
        },
      };
    }
    // The counts are on the row already, so the warning names them rather than
    // describing the loss in the abstract — "3 đơn · 5.905.000đ" is the thing
    // about to stop existing.
    return {
      danger: true,
      title: "Xóa tài khoản vĩnh viễn?",
      body:
        `${user.username} sẽ bị xóa hẳn và không khôi phục được. ` +
        `Toàn bộ lịch sử của tài khoản này bị xóa theo: ${user.orderCount} đơn hàng ` +
        `(${formatVnd(user.totalSpent)}đ), ${formatVnd(user.totalToppedUp)}đ đã nạp, ` +
        `cùng mọi giao dịch và đơn dịch vụ. Doanh thu và thống kê của shop sẽ giảm ` +
        `đúng bằng phần đó. Muốn giữ số liệu thì khóa tài khoản thay vì xóa.`,
      confirmLabel: "Xóa vĩnh viễn",
      run: () => call({ username: user.username, action: "delete" }),
    };
  })();

  return (
    <div className="flex flex-col gap-5">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {visible.length === 0 ? (
        <AdminEmpty title={emptyNote} />
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e0e11]">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {[
                  "Người dùng",
                  "Email",
                  "Số dư",
                  "Rank",
                  "Đơn hàng",
                  "Đơn gần nhất",
                  "Trạng thái",
                  "Thao tác",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
          {visible.map((user) => {
            const expanded = open === user.username;
            // The server refuses every action on the caller's own account, so
            // the buttons say why up front instead of failing after the click.
            const isSelf = user.username === selfUsername;

            return (
              <Fragment key={user.username}>
                <tr className="border-b border-white/[0.04] last:border-0">
                  <td className="px-5 py-3">
                    <p className="text-[13px] font-bold text-white">{user.username}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">UID {user.uid}</p>
                  </td>

                  <td className="px-5 py-3 max-w-[220px]">
                    <span
                      className={`block truncate text-[13px] ${
                        user.email ? "text-neutral-300" : "text-neutral-600 italic"
                      }`}
                    >
                      {user.email ?? "Chưa có email"}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-[13px] font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                    {formatVnd(user.balance)}đ
                  </td>

                  <td className="px-5 py-3 text-[12px] font-semibold text-neutral-300 whitespace-nowrap">
                    {user.tier}
                  </td>

                  <td className="px-5 py-3 text-[12px] text-neutral-400 tabular-nums whitespace-nowrap">
                    {user.orderCount} đơn · {formatVnd(user.totalSpent)}đ
                  </td>

                  <td className="px-5 py-3 text-[12px] text-neutral-500 tabular-nums whitespace-nowrap">
                    {user.lastOrderAt ?? "—"}
                  </td>

                  <td className="px-5 py-3">
                    {/* Blocked outranks the role badge: an admin who has been
                        locked out is locked out, and reading "Quản trị" on
                        that row would say the opposite. */}
                    <span
                      className={`inline-block rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                        user.blockedAt
                          ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : user.role === "ADMIN"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {user.blockedAt
                        ? "Đã khóa"
                        : user.role === "ADMIN"
                          ? "Quản trị"
                          : "Hoạt động"}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggle(user)}
                        aria-expanded={expanded}
                        className="h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                        Thông tin
                      </button>

                      <button
                        type="button"
                        disabled={busy || isSelf}
                        title={isSelf ? "Không thể tự đổi quyền của mình" : undefined}
                        onClick={() => setConfirming({ kind: "role", user })}
                        className="h-8 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-400 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Shield size={12} />
                        {user.role === "ADMIN" ? "Thu hồi" : "Cấp admin"}
                      </button>

                      <button
                        type="button"
                        disabled={busy || isSelf}
                        title={isSelf ? "Không thể tự khóa tài khoản của mình" : undefined}
                        onClick={() => setConfirming({ kind: "block", user })}
                        className={`h-8 px-2.5 rounded-lg disabled:opacity-40 text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
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
                        disabled={busy || isSelf}
                        onClick={() => setConfirming({ kind: "delete", user })}
                        aria-label={`Xóa tài khoản ${user.username}`}
                        title={isSelf ? "Không thể tự xóa tài khoản của mình" : "Xóa tài khoản"}
                        className="h-8 w-8 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:hover:bg-red-500/10 text-red-400 transition-colors inline-flex items-center justify-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>

                {expanded ? (
                  <tr className="border-b border-white/[0.04]">
                    <td colSpan={8} className="px-5 pb-5 bg-white/[0.015]">
                  <div className="flex flex-col gap-5 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
                      <Stat label="Tài khoản" value={user.username} />
                      <Stat label="UID" value={String(user.uid)} />
                      <Stat label="Ngày tham gia" value={user.createdAt} />
                      <Stat label="Hạng" value={user.tier} />
                      <Stat label="Điểm thưởng" value={`${user.points} Pts`} />
                      <Stat label="Số dư" value={`${formatVnd(user.balance)}đ`} />
                      <Stat label="Tổng đã nạp" value={`${formatVnd(user.totalToppedUp)}đ`} />
                      <Stat label="Tổng đã mua" value={`${formatVnd(user.totalSpent)}đ`} />
                    </div>

                    <div className="rounded-xl border border-white/5 bg-neutral-950/40 px-4 py-3">
                      <span className={LABEL}>Đăng nhập gần nhất</span>
                      <p className="text-xs font-bold text-neutral-200">
                        {user.lastLoginAt ?? "Chưa đăng nhập lần nào"}
                        {user.lastIp ? (
                          <span className="ml-2 font-mono font-normal text-neutral-400">
                            {user.lastIp}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 text-[11px] text-neutral-500">
                        Địa chỉ IP lấy từ header của proxy nên chỉ là gợi ý hỗ trợ —
                        đừng dùng nó để xác minh danh tính khách.
                      </p>
                    </div>

                    {user.blockedAt ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                        <span className={LABEL}>Lý do khóa</span>
                        <p className="text-xs text-neutral-200">
                          {user.blockedReason ?? "Không ghi lý do"}
                        </p>
                      </div>
                    ) : null}

                    {isSelf ? (
                      <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] text-neutral-400">
                        Đây là tài khoản bạn đang đăng nhập. Máy chủ từ chối mọi thao
                        tác quản trị lên chính nó, để một admin không thể tự khóa hoặc
                        tự hạ quyền rồi khóa cả shop ở ngoài khu quản trị.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[220px]">
                            <label htmlFor={`e-${user.username}`} className={LABEL}>
                              Email
                            </label>
                            <input
                              id={`e-${user.username}`}
                              type="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="chưa có email"
                              className={FIELD}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={busy || email === (user.email ?? "")}
                            onClick={() =>
                              call({ username: user.username, action: "email", email })
                            }
                            className={ACTION}
                          >
                            Lưu email
                          </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[220px]">
                            <label htmlFor={`p-${user.username}`} className={LABEL}>
                              Mật khẩu mới{" "}
                              <span className="text-neutral-600">(ít nhất 6 ký tự)</span>
                            </label>
                            <input
                              id={`p-${user.username}`}
                              type="text"
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              placeholder="Đặt lại khi khách mất quyền truy cập"
                              autoComplete="off"
                              className={FIELD}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={busy || password.length < 6}
                            onClick={() => setConfirming({ kind: "password", user })}
                            className="h-[34px] px-4 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-colors inline-flex items-center gap-1.5"
                          >
                            <KeyRound size={12} />
                            Đặt lại
                          </button>
                          <p className="w-full text-[11px] text-neutral-500">
                            Mật khẩu hiển thị dạng chữ thường vì bạn phải đọc lại cho
                            khách — không ai xem được mật khẩu cũ, kể cả quản trị viên.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label htmlFor={`d-${user.username}`} className={LABEL}>
                              Cộng / trừ số dư (âm để trừ)
                            </label>
                            <input
                              id={`d-${user.username}`}
                              value={delta}
                              onChange={(event) => setDelta(event.target.value)}
                              placeholder="100000 hoặc -50000"
                              className={`${FIELD} w-40 tabular-nums`}
                            />
                          </div>
                          <div className="flex-1 min-w-[180px]">
                            <label htmlFor={`n-${user.username}`} className={LABEL}>
                              Lý do <span className="text-neutral-600">(khách sẽ thấy)</span>
                            </label>
                            <input
                              id={`n-${user.username}`}
                              value={note}
                              onChange={(event) => setNote(event.target.value)}
                              placeholder="Hoàn tiền đơn VLR2079"
                              className={FIELD}
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
                              if (ok) {
                                setDelta("");
                                setNote("");
                              }
                            }}
                            className={`${ACTION} inline-flex items-center gap-1.5`}
                          >
                            <Wallet size={12} />
                            Áp dụng
                          </button>
                          <p className="w-full text-[11px] text-neutral-500">
                            Mọi thay đổi số dư đều ghi một dòng vào lịch sử giao dịch của
                            khách, kèm tên quản trị viên thực hiện.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label htmlFor={`t-${user.username}`} className={LABEL}>
                              Hạng thành viên
                            </label>
                            <select
                              id={`t-${user.username}`}
                              value={user.tier}
                              disabled={busy}
                              onChange={(event) =>
                                call({
                                  username: user.username,
                                  action: "tier",
                                  tier: event.target.value,
                                })
                              }
                              className={`${FIELD} w-44`}
                            >
                              {TIERS.map((tier) => (
                                <option key={tier} value={tier} className="bg-neutral-900">
                                  {tier}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="flex-1 min-w-[220px] text-[11px] text-neutral-500">
                            Đặt tay. Mốc lên hạng là quy định riêng của shop và chưa
                            được khai báo, nên hệ thống không tự nâng hạng cho ai.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
            </tbody>
          </table>
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
