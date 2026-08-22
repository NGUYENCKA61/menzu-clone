"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Eye, Shield, Trash2, Unlock } from "lucide-react";

import { AdminEmpty, AdminError, ConfirmDialog } from "./AdminStates";

export interface AdminUserView {
  uid: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
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
  /** The đại lý's negotiated percent; 0 unless role is AGENCY. */
  agencyPercent: number;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
}

/** Quick moderation from the row. Anything with a form lives on the user's
 *  own page — /admin/users/[uid] — where it has room. */
type Pending =
  | { kind: "block"; user: AdminUserView }
  | { kind: "role"; user: AdminUserView }
  | { kind: "delete"; user: AdminUserView }
  | null;

/** Each tier keeps its metal: the dot and the word share one color. */
const TIER_COLOR: Record<string, string> = {
  BRONZE: "text-amber-600",
  SILVER: "text-neutral-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-violet-300",
};

/**
 * Quiet by default, colored on hover — four of these per row used to be four
 * loud pills, and eight rows of pills read as a wall of alarms.
 */
const ICON_BTN =
  "h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.03] inline-flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

  // Searching and filtering moved to the server. Doing it here meant looking
  // through one page of customers and reporting "not found" for somebody who
  // was on page three — which is the exact case a customer lookup is for.
  const visible = users;

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
          <table className="w-full min-w-[1000px] text-left">
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
                    className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
          {visible.map((user) => {
            // The server refuses every action on the caller's own account, so
            // the buttons say why up front instead of failing after the click.
            const isSelf = user.username === selfUsername;

            return (
                <tr
                  key={user.username}
                  className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.015]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.uid}`}
                      className="group flex items-center gap-3"
                    >
                      {/* The face makes the list read as customers instead of
                          rows; the ring repeats the status chip's color so a
                          blocked or privileged account is visible at a glance. */}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-neutral-900 ${
                          user.blockedAt
                            ? "border-red-500/40"
                            : user.role === "ADMIN"
                              ? "border-violet-500/50"
                              : user.role === "AGENCY"
                                ? "border-amber-500/50"
                                : "border-white/10"
                        }`}
                      >
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt=""
                            width={36}
                            height={36}
                            className={`h-full w-full object-cover ${
                              user.blockedAt ? "opacity-50 grayscale" : ""
                            }`}
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="text-[13px] font-black uppercase text-neutral-500"
                          >
                            {user.username.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-white group-hover:text-rose-400 transition-colors">
                          {user.username}
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-500 tabular-nums">
                          UID {user.uid}
                        </p>
                      </div>
                    </Link>
                  </td>

                  <td className="px-4 py-3 max-w-[190px]">
                    <span
                      className={`block truncate text-[13px] ${
                        user.email ? "text-neutral-300" : "text-neutral-700"
                      }`}
                    >
                      {user.email ?? "—"}
                    </span>
                  </td>

                  <td
                    className={`px-4 py-3 text-[13px] font-bold tabular-nums whitespace-nowrap ${
                      user.balance > 0 ? "text-emerald-400" : "text-neutral-600"
                    }`}
                  >
                    {formatVnd(user.balance)}đ
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                        TIER_COLOR[user.tier] ?? "text-neutral-300"
                      }`}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                      {user.tier}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-[12px] tabular-nums whitespace-nowrap">
                    {user.orderCount > 0 ? (
                      <span className="text-neutral-300">
                        <span className="font-bold text-white">{user.orderCount}</span> đơn ·{" "}
                        {formatVnd(user.totalSpent)}đ
                      </span>
                    ) : (
                      <span className="text-neutral-700">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[12px] text-neutral-500 tabular-nums whitespace-nowrap">
                    {user.lastOrderAt ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    {/* Blocked outranks the role badge: an admin who has been
                        locked out is locked out, and reading "Quản trị" on
                        that row would say the opposite. */}
                    <span
                      className={`inline-block rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                        user.blockedAt
                          ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : user.role === "ADMIN"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                            : user.role === "AGENCY"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {user.blockedAt
                        ? "Đã khóa"
                        : user.role === "ADMIN"
                          ? "Quản trị"
                          : user.role === "AGENCY"
                            ? `Đại lý · ${user.agencyPercent}%`
                            : "Hoạt động"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/users/${user.uid}`}
                        aria-label={`Hồ sơ chi tiết của ${user.username}`}
                        title="Mở hồ sơ chi tiết"
                        className={`${ICON_BTN} text-neutral-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400`}
                      >
                        <Eye size={14} />
                      </Link>

                      <button
                        type="button"
                        disabled={busy || isSelf}
                        aria-label={
                          user.role === "ADMIN"
                            ? `Thu hồi quyền quản trị của ${user.username}`
                            : `Cấp quyền quản trị cho ${user.username}`
                        }
                        title={
                          isSelf
                            ? "Không thể tự đổi quyền của mình"
                            : user.role === "ADMIN"
                              ? "Thu hồi quyền quản trị"
                              : "Cấp quyền quản trị"
                        }
                        onClick={() => setConfirming({ kind: "role", user })}
                        className={`${ICON_BTN} ${
                          user.role === "ADMIN"
                            ? "text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10"
                            : "text-neutral-500 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                        }`}
                      >
                        <Shield size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={busy || isSelf}
                        aria-label={
                          user.blockedAt
                            ? `Mở khóa ${user.username}`
                            : `Khóa ${user.username}`
                        }
                        title={
                          isSelf
                            ? "Không thể tự khóa tài khoản của mình"
                            : user.blockedAt
                              ? "Mở khóa tài khoản"
                              : "Khóa tài khoản"
                        }
                        onClick={() => setConfirming({ kind: "block", user })}
                        className={`${ICON_BTN} ${
                          user.blockedAt
                            ? "text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10"
                            : "text-neutral-500 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                        }`}
                      >
                        {user.blockedAt ? <Unlock size={13} /> : <Ban size={13} />}
                      </button>

                      <button
                        type="button"
                        disabled={busy || isSelf}
                        onClick={() => setConfirming({ kind: "delete", user })}
                        aria-label={`Xóa tài khoản ${user.username}`}
                        title={isSelf ? "Không thể tự xóa tài khoản của mình" : "Xóa tài khoản"}
                        className={`${ICON_BTN} text-neutral-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
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
