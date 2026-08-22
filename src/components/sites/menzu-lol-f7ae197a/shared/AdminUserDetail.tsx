"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgePercent,
  Ban,
  KeyRound,
  Mail,
  Medal,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  Wallet,
} from "lucide-react";

import { AdminError, ConfirmDialog } from "./AdminStates";
import type { AdminUserView } from "./AdminUsers";

type Pending =
  | { kind: "block" }
  | { kind: "role" }
  | { kind: "agency" }
  | { kind: "agencyRevoke" }
  | { kind: "delete" }
  | { kind: "password" }
  | null;

const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

const TIER_COLOR: Record<string, string> = {
  BRONZE: "text-amber-600",
  SILVER: "text-neutral-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-violet-300",
};

const CARD = "rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4";
const CARD_HEAD =
  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500";
const FIELD =
  "w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";
const ACTION =
  "h-[34px] px-4 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[10px] font-black uppercase tracking-widest text-white transition-colors";
const HINT = "text-[11px] text-neutral-500 leading-relaxed";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "-50000" → "-50.000". A lone "-" stays visible so typing a debit isn't
 *  fought by the formatter. */
function formatDelta(value: string): string {
  if (!value) return "";
  const negative = value.startsWith("-");
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return negative ? "-" : "";
  return (negative ? "-" : "") + formatVnd(Number(digits));
}

function StatCard({
  label,
  value,
  sub,
  tone = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className={`text-[22px] font-black leading-none tabular-nums ${tone}`}>{value}</span>
      {sub ? <span className="text-[11px] text-neutral-500">{sub}</span> : null}
    </div>
  );
}

/**
 * One customer, full page: the inline support panel from the list outgrew its
 * table row, so every control lives here with room to breathe. The list keeps
 * only the three quick moderation buttons.
 */
export function AdminUserDetail({
  user,
  selfUsername,
}: {
  user: AdminUserView;
  selfUsername: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Pending>(null);

  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [agencyPct, setAgencyPct] = useState("");

  const isSelf = user.username === selfUsername;

  async function call(body: Record<string, unknown>, thenLeave = false) {
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
      if (thenLeave) {
        // The row this page describes no longer exists — the list is the only
        // place left to stand.
        router.push("/admin/users");
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
    const { kind } = confirming;
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
    if (kind === "agency") {
      const granting = user.role !== "AGENCY";
      return {
        danger: false,
        title: granting ? "Cấp quyền đại lý?" : "Cập nhật % đại lý?",
        body: `${user.username} sẽ mua key phần mềm với chiết khấu ${agencyPct}% qua bàn đại lý riêng. Mức % là thỏa thuận riêng — không hiển thị công khai và không kèm quyền quản trị nào.`,
        confirmLabel: granting ? "Cấp quyền đại lý" : `Chốt ${agencyPct}%`,
        run: async () => {
          const ok = await call({
            username: user.username,
            action: "role",
            role: "AGENCY",
            percent: Number(agencyPct),
          });
          if (ok) setAgencyPct("");
        },
      };
    }
    if (kind === "agencyRevoke") {
      return {
        danger: false,
        title: "Gỡ quyền đại lý?",
        body: `${user.username} quay về thành viên thường, mua theo giá niêm yết. Mức chiết khấu riêng bị xóa; tài khoản và số dư giữ nguyên.`,
        confirmLabel: "Gỡ quyền",
        run: () => call({ username: user.username, action: "role", role: "MEMBER" }),
      };
    }
    if (kind === "password") {
      return {
        danger: true,
        title: "Đặt lại mật khẩu?",
        body: `${user.username} sẽ bị đăng xuất khỏi mọi thiết bị và chỉ đăng nhập lại được bằng mật khẩu mới. Hãy gửi mật khẩu này cho khách qua kênh bạn đã xác minh là của họ, và nhắc khách đổi lại ngay.`,
        confirmLabel: "Đặt lại mật khẩu",
        run: async () => {
          const ok = await call({ username: user.username, action: "password", password });
          if (ok) setPassword("");
        },
      };
    }
    return {
      danger: true,
      title: "Xóa tài khoản vĩnh viễn?",
      body:
        `${user.username} sẽ bị xóa hẳn và không khôi phục được. ` +
        `Toàn bộ lịch sử của tài khoản này bị xóa theo: ${user.orderCount} đơn hàng ` +
        `(${formatVnd(user.totalSpent)}đ), ${formatVnd(user.totalToppedUp)}đ đã nạp, ` +
        `cùng mọi giao dịch. Doanh thu và thống kê của shop sẽ giảm đúng bằng phần đó. ` +
        `Muốn giữ số liệu thì khóa tài khoản thay vì xóa.`,
      confirmLabel: "Xóa vĩnh viễn",
      run: () => call({ username: user.username, action: "delete" }, true),
    };
  })();

  return (
    <div className="flex flex-col gap-5">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {/* Who this is: the face, the papers, the footprint dates. */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-neutral-900 ${
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
                width={72}
                height={72}
                className={`h-full w-full object-cover ${user.blockedAt ? "opacity-50 grayscale" : ""}`}
              />
            ) : (
              <span aria-hidden className="text-2xl font-black uppercase text-neutral-500">
                {user.username.slice(0, 1)}
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-white">{user.username}</h2>
              <span
                className={`inline-block rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
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
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                  TIER_COLOR[user.tier] ?? "text-neutral-300"
                }`}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {user.tier}
              </span>
            </div>
            <p className="mt-2 text-[12px] text-neutral-500 tabular-nums">
              UID {user.uid} · Tham gia {user.createdAt}
              {user.email ? ` · ${user.email}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">
              Đăng nhập gần nhất:{" "}
              <span className="font-semibold text-neutral-300">
                {user.lastLoginAt ?? "chưa đăng nhập lần nào"}
              </span>
            </p>
          </div>
        </div>

        {user.blockedAt ? (
          <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
            <span className={LABEL}>Lý do khóa · {user.blockedAt}</span>
            <p className="text-xs text-neutral-200">{user.blockedReason ?? "Không ghi lý do"}</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Số dư ví"
          value={`${formatVnd(user.balance)}đ`}
          tone={user.balance > 0 ? "text-emerald-400" : "text-white"}
        />
        <StatCard label="Tổng đã nạp" value={`${formatVnd(user.totalToppedUp)}đ`} />
        <StatCard
          label="Tổng đã mua"
          value={`${formatVnd(user.totalSpent)}đ`}
          sub={`${user.orderCount} đơn hàng`}
        />
        <StatCard
          label="Địa chỉ IP"
          value={user.lastIp ?? "—"}
          sub="ghi nhận ở lần đăng nhập gần nhất"
          tone="text-white break-all"
        />
      </div>

      {isSelf ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] text-neutral-400">
          Đây là tài khoản bạn đang đăng nhập. Máy chủ từ chối mọi thao tác quản trị lên
          chính nó, để một admin không thể tự khóa hoặc tự hạ quyền rồi khóa cả shop ở
          ngoài khu quản trị.
        </p>
      ) : (
        // Two independent stacks, not grid rows: cards differ in height and a
        // row-aligned grid opened holes under the short ones.
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Mail size={13} className="text-neutral-400" />
              Email liên hệ
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="detail-email" className={LABEL}>
                  Email
                </label>
                <input
                  id="detail-email"
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
                onClick={() => call({ username: user.username, action: "email", email })}
                className={ACTION}
              >
                Lưu email
              </button>
            </div>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Wallet size={13} className="text-neutral-400" />
              Số dư ví
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="detail-delta" className={LABEL}>
                  Cộng / trừ (âm để trừ)
                </label>
                <input
                  id="detail-delta"
                  value={formatDelta(delta)}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const negative = raw.trimStart().startsWith("-");
                    const digits = raw.replace(/[^\d]/g, "").slice(0, 10);
                    setDelta(digits ? (negative ? `-${digits}` : digits) : negative ? "-" : "");
                  }}
                  placeholder="100.000 hoặc -50.000"
                  className={`${FIELD} w-40 tabular-nums`}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label htmlFor="detail-note" className={LABEL}>
                  Lý do <span className="text-neutral-600">(khách sẽ thấy)</span>
                </label>
                <input
                  id="detail-note"
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
            </div>
            <p className={HINT}>
              Mọi thay đổi số dư đều ghi một dòng vào lịch sử giao dịch của khách, kèm tên
              quản trị viên thực hiện.
            </p>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <BadgePercent size={13} className="text-amber-400" />
              Đại lý
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="detail-agency" className={LABEL}>
                  % chiết khấu <span className="text-neutral-600">(1–90, thỏa thuận riêng)</span>
                </label>
                <input
                  id="detail-agency"
                  value={agencyPct}
                  onChange={(event) =>
                    setAgencyPct(event.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  inputMode="numeric"
                  placeholder={user.role === "AGENCY" ? `Đang: ${user.agencyPercent}%` : "VD: 15"}
                  className={`${FIELD} w-40 tabular-nums`}
                />
              </div>
              <button
                type="button"
                disabled={
                  busy ||
                  user.role === "ADMIN" ||
                  !(Number(agencyPct) >= 1 && Number(agencyPct) <= 90)
                }
                title={user.role === "ADMIN" ? "Thu hồi quyền quản trị trước" : undefined}
                onClick={() => setConfirming({ kind: "agency" })}
                className="h-[34px] px-4 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-colors"
              >
                {user.role === "AGENCY" ? "Đổi %" : "Cấp đại lý"}
              </button>
              {user.role === "AGENCY" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming({ kind: "agencyRevoke" })}
                  className="h-[34px] px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
                >
                  Gỡ đại lý
                </button>
              ) : null}
            </div>
            <p className={HINT}>
              Mức % là thỏa thuận riêng từng đại lý — không hiển thị công khai ở bất kỳ đâu
              ngoài bàn đại lý của chính họ.
            </p>
          </section>
          </div>

          <div className="flex flex-col gap-4 min-w-0">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <KeyRound size={13} className="text-neutral-400" />
              Đặt lại mật khẩu
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="detail-password" className={LABEL}>
                  Mật khẩu mới <span className="text-neutral-600">(ít nhất 6 ký tự)</span>
                </label>
                <input
                  id="detail-password"
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
                onClick={() => setConfirming({ kind: "password" })}
                className="h-[34px] px-4 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-colors inline-flex items-center gap-1.5"
              >
                <KeyRound size={12} />
                Đặt lại
              </button>
            </div>
            <p className={HINT}>
              Mật khẩu hiển thị dạng chữ thường vì bạn phải đọc lại cho khách — không ai xem
              được mật khẩu cũ, kể cả quản trị viên.
            </p>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Medal size={13} className="text-neutral-400" />
              Hạng thành viên
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="detail-tier" className={LABEL}>
                  Hạng
                </label>
                <select
                  id="detail-tier"
                  value={user.tier}
                  disabled={busy}
                  onChange={(event) =>
                    call({ username: user.username, action: "tier", tier: event.target.value })
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
              <p className={`flex-1 min-w-[200px] ${HINT}`}>
                Đặt tay. Mốc lên hạng là quy định riêng của shop và chưa được khai báo, nên
                hệ thống không tự nâng hạng cho ai.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5 flex flex-col gap-4">
            <span className={CARD_HEAD}>
              <ShieldAlert size={13} className="text-red-400" />
              Vùng nguy hiểm
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "role" })}
                className="h-[34px] px-4 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-rose-400 transition-colors inline-flex items-center gap-1.5"
              >
                <Shield size={12} />
                {user.role === "ADMIN" ? "Thu hồi quyền admin" : "Cấp quyền admin"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "block" })}
                className={`h-[34px] px-4 rounded-lg disabled:opacity-40 text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 ${
                  user.blockedAt
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                {user.blockedAt ? <Unlock size={12} /> : <Ban size={12} />}
                {user.blockedAt ? "Mở khóa tài khoản" : "Khóa tài khoản"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "delete" })}
                className="h-[34px] px-4 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Xóa vĩnh viễn
              </button>
            </div>
            <p className={HINT}>
              Khóa giữ nguyên số liệu và mở lại được; xóa mất hẳn lịch sử đơn, nạp và giao
              dịch của khách. Mỗi nút đều hỏi xác nhận trước khi chạy.
            </p>
          </section>
          </div>
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
