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
  /** When the shop granted "xác thực cấp 2"; null or absent is level 1. */
  verifiedAt?: string | null;
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
  CLASSIC: "text-zinc-500",
  GOLD: "text-amber-600",
  PLATINUM: "text-cyan-600",
  DIAMOND: "text-violet-600",
  ELITE: "text-rose-600",
};

// The last column stays in view while the rest scrolls: with the sidebar a
// 1024 laptop has 732px for a 1093px table and the buttons were the first
// thing to go. Same surface as the card so the rows slide under it.
const STICKY_ACTIONS =
  "sticky right-0 z-10 bg-white border-l border-zinc-100 shadow-[-10px_0_14px_-10px_rgba(24,24,27,0.08)]";

/**
 * Quiet by default — four of these per row used to be four loud pills, and
 * eight rows of pills read as a wall of alarms. Red appears only under the
 * hand that is about to lock or delete.
 */
const ICON_BTN =
  "h-8 w-8 rounded-lg border border-zinc-200 bg-white inline-flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

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

  /** The role/lock chip, shared by the card and the table row. */
  const statusPill = (user: AdminUserView) => (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        user.blockedAt
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : user.role === "ADMIN"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : user.role === "AGENCY"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
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
  );

  /** The avatar's ring repeats the status chip's color, so a blocked or
   *  privileged account is visible at a glance. */
  const avatarRing = (user: AdminUserView) =>
    user.blockedAt
      ? "border-rose-300"
      : user.role === "ADMIN"
        ? "border-violet-300"
        : user.role === "AGENCY"
          ? "border-amber-300"
          : "border-zinc-200";

  /** The four moderation buttons, shared by the card and the table row. */
  const actions = (user: AdminUserView, isSelf: boolean) => (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/admin/users/${user.uid}`}
        aria-label={`Hồ sơ chi tiết của ${user.username}`}
        title="Mở hồ sơ chi tiết"
        className={`${ICON_BTN} text-zinc-400 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900`}
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
            ? "text-violet-600 hover:border-violet-200 hover:bg-violet-50"
            : "text-zinc-400 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
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
            ? "text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
            : "text-zinc-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
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
        className={`${ICON_BTN} text-zinc-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {visible.length === 0 ? (
        <AdminEmpty title={emptyNote} />
      ) : (
        <>
        {/* On a phone the table was 1.093px wide in a 348px scroller and the
            four buttons sat 750px to the right. One card per customer, the
            same chip and the same four buttons at the foot. */}
        <div className="admin-list flex flex-col gap-2 sm:hidden">
          {visible.map((user) => {
            const isSelf = user.username === selfUsername;
            return (
              <article key={user.username} className="rounded-xl border border-zinc-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/users/${user.uid}`} className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-100 ${avatarRing(user)}`}>
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt="" width={36} height={36} className={`h-full w-full object-cover ${user.blockedAt ? "opacity-50 grayscale" : ""}`} />
                      ) : (
                        <span aria-hidden className="text-[15px] font-semibold text-zinc-500">{user.username.slice(0, 1).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-zinc-900">{user.username}</span>
                      <span className="block truncate text-[11px] tabular-nums text-zinc-400">UID {user.uid}{user.email ? ` · ${user.email}` : ""}</span>
                    </span>
                  </Link>
                  {statusPill(user)}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <dt className="text-[12px] text-zinc-500">Số dư</dt>
                    <dd className={`mt-0.5 font-bold tabular-nums ${user.balance > 0 ? "text-emerald-600" : "text-zinc-400"}`}>{formatVnd(user.balance)}đ</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-zinc-500">Hạng</dt>
                    <dd className={`mt-0.5 font-semibold ${TIER_COLOR[user.tier] ?? "text-zinc-600"}`}>{user.tier}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-zinc-500">Đơn</dt>
                    <dd className="mt-0.5 tabular-nums text-zinc-700">{user.orderCount > 0 ? `${user.orderCount} · ${formatVnd(user.totalSpent)}đ` : "-"}</dd>
                  </div>
                </dl>
                <div className="mt-3 border-t border-zinc-100 pt-3">{actions(user, isSelf)}</div>
              </article>
            );
          })}
        </div>

        <div className="admin-list hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200">
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
                    className={`whitespace-nowrap px-4 py-3 text-left text-[12.5px] font-semibold text-zinc-500 ${
                      head === "Thao tác" ? STICKY_ACTIONS : ""
                    }`}
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
                  className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/70"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.uid}`}
                      className="group flex items-center gap-3"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-100 ${avatarRing(user)}`}
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
                            className="text-[15px] font-semibold text-zinc-500"
                          >
                            {user.username.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-zinc-900 underline-offset-4 transition-colors group-hover:underline">
                          {user.username}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-zinc-400">
                          UID {user.uid}
                        </p>
                      </div>
                    </Link>
                  </td>

                  <td className="max-w-[190px] px-4 py-3">
                    <span
                      className={`block truncate text-[13px] ${
                        user.email ? "text-zinc-700" : "text-zinc-300"
                      }`}
                    >
                      {user.email ?? "-"}
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap px-4 py-3 text-[13px] font-bold tabular-nums ${
                      user.balance > 0 ? "text-emerald-600" : "text-zinc-400"
                    }`}
                  >
                    {formatVnd(user.balance)}đ
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                        TIER_COLOR[user.tier] ?? "text-zinc-600"
                      }`}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                      {user.tier}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-[12px] tabular-nums">
                    {user.orderCount > 0 ? (
                      <span className="text-zinc-600">
                        <span className="font-bold text-zinc-900">{user.orderCount}</span> đơn ·{" "}
                        {formatVnd(user.totalSpent)}đ
                      </span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-[12px] tabular-nums text-zinc-500">
                    {user.lastOrderAt ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    {/* Blocked outranks the role badge: an admin who has been
                        locked out is locked out, and reading "Quản trị" on
                        that row would say the opposite. */}
                    {statusPill(user)}
                  </td>

                  <td className={`px-4 py-3 ${STICKY_ACTIONS}`}>
                    {actions(user, isSelf)}
                  </td>
                </tr>
            );
          })}
            </tbody>
          </table>
        </div>
        </>
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
