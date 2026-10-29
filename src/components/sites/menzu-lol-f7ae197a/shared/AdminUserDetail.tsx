"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  BadgePercent,
  Ban,
  KeyRound,
  Mail,
  Medal,
  Minus,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  Wallet,
} from "lucide-react";

import { INPUT } from "../admin/kit";
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

const TIERS = ["CLASSIC", "GOLD", "PLATINUM", "DIAMOND", "ELITE"] as const;

const TIER_COLOR: Record<string, string> = {
  CLASSIC: "text-zinc-500",
  GOLD: "text-amber-600",
  PLATINUM: "text-cyan-600",
  DIAMOND: "text-violet-600",
  ELITE: "text-rose-600",
};

const CARD = "rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-4";
const CARD_HEAD = "flex items-center gap-2 text-[12px] font-semibold text-zinc-600";
const LABEL = "mb-1.5 block text-[12px] font-semibold text-zinc-600";
const ACTION =
  "h-[34px] px-4 rounded-lg bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 text-[12px] font-semibold text-white transition-colors";
const HINT = "text-[11px] leading-relaxed text-zinc-500";

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function StatCard({
  label,
  value,
  sub,
  tone = "text-zinc-900",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <span className="text-[12.5px] text-zinc-500">{label}</span>
      <span className={`text-[21px] font-bold leading-none tabular-nums ${tone}`}>{value}</span>
      {sub ? <span className="text-[11.5px] text-zinc-400">{sub}</span> : null}
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
  // The balance change: which way, and how much (digits only, always positive).
  const [mode, setMode] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState("");
  const amountValue = Number(amount) || 0;
  const balanceAfter = user.balance + (mode === "add" ? amountValue : -amountValue);
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
        body: `${user.username} sẽ mua key phần mềm với chiết khấu ${agencyPct}% qua bàn đại lý riêng. Mức % là thỏa thuận riêng, không hiển thị công khai và không kèm quyền quản trị nào.`,
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
    <div className="flex flex-col gap-4">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {/* Who this is: the face, the papers, the footprint dates. */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-100 ${
              user.blockedAt
                ? "border-rose-300"
                : user.role === "ADMIN"
                  ? "border-violet-300"
                  : user.role === "AGENCY"
                    ? "border-amber-300"
                    : "border-zinc-200"
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
              <span aria-hidden className="text-2xl font-black text-zinc-400">
                {user.username.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-zinc-900">{user.username}</h2>
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
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
              <span
                className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                  TIER_COLOR[user.tier] ?? "text-zinc-600"
                }`}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {user.tier}
              </span>
              {user.verifiedAt ? (
                // "Xác thực cấp 2" (12/10/2026): the desk that granted it is a click away.
                <Link
                  href="/admin/verifications?filter=all"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:border-emerald-300"
                >
                  <BadgeCheck size={11} aria-hidden />
                  Cấp 2 · {user.verifiedAt}
                </Link>
              ) : null}
            </div>
            <p className="mt-2 text-[12px] tabular-nums text-zinc-500">
              UID {user.uid} · Tham gia {user.createdAt}
              {user.email ? ` · ${user.email}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              Đăng nhập gần nhất:{" "}
              <span className="font-semibold text-zinc-700">
                {user.lastLoginAt ?? "chưa đăng nhập lần nào"}
              </span>
            </p>
          </div>
        </div>

        {user.blockedAt ? (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-3">
            <span className={LABEL}>Lý do khóa · {user.blockedAt}</span>
            <p className="text-xs text-zinc-700">{user.blockedReason ?? "Không ghi lý do"}</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Số dư ví"
          value={`${formatVnd(user.balance)}đ`}
          tone={user.balance > 0 ? "text-emerald-600" : "text-zinc-900"}
        />
        <StatCard label="Tổng đã nạp" value={`${formatVnd(user.totalToppedUp)}đ`} />
        <StatCard
          label="Tổng đã mua"
          value={`${formatVnd(user.totalSpent)}đ`}
          sub={`${user.orderCount} đơn hàng`}
        />
        <StatCard
          label="Địa chỉ IP"
          value={user.lastIp ?? "-"}
          sub="ghi nhận ở lần đăng nhập gần nhất"
          tone="text-zinc-900 break-all"
        />
      </div>

      {isSelf ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-zinc-500">
          Đây là tài khoản bạn đang đăng nhập. Máy chủ từ chối mọi thao tác quản trị lên
          chính nó, để một admin không thể tự khóa hoặc tự hạ quyền rồi khóa cả shop ở
          ngoài khu quản trị.
        </p>
      ) : (
        // Two independent stacks, not grid rows: cards differ in height and a
        // row-aligned grid opened holes under the short ones.
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Mail size={13} className="text-zinc-400" />
              Email liên hệ
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="detail-email" className={LABEL}>
                  Email
                </label>
                <input
                  id="detail-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="chưa có email"
                  className={INPUT}
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
              <Wallet size={13} className="text-zinc-400" />
              Số dư ví
            </span>
            {/* Adding and taking off as two plain choices, where one field
                read a minus sign (the owner, 27/10/2026: "nên có cộng hoặc
                trừ rõ ràng tách ra"). The amount is always typed positive;
                the choice gives it its sign, and the button and the line
                under it say what will happen before it does. */}
            <div
              role="radiogroup"
              aria-label="Cộng hay trừ tiền"
              className="grid w-full max-w-[320px] grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1"
            >
              {(["add", "sub"] as const).map((kind) => {
                const on = mode === kind;
                const add = kind === "add";
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(kind)}
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                      on
                        ? add
                          ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-300"
                          : "bg-white text-rose-700 shadow-sm ring-1 ring-rose-300"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {add ? <Plus size={13} /> : <Minus size={13} />}
                    {add ? "Cộng tiền" : "Trừ tiền"}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="detail-delta" className={LABEL}>
                  {mode === "add" ? "Số tiền cộng" : "Số tiền trừ"}
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                      mode === "add" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {mode === "add" ? "+" : "−"}
                  </span>
                  <input
                    id="detail-delta"
                    inputMode="numeric"
                    value={amount ? formatVnd(Number(amount)) : ""}
                    onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    placeholder="100.000"
                    className={`${INPUT} w-40 pl-7 tabular-nums`}
                  />
                </div>
              </div>
              <div className="min-w-[160px] flex-1">
                <label htmlFor="detail-note" className={LABEL}>
                  Lý do <span className="font-normal text-zinc-400">(khách sẽ thấy)</span>
                </label>
                <input
                  id="detail-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Hoàn tiền đơn VLR2079"
                  className={INPUT}
                />
              </div>
              <button
                type="button"
                disabled={busy || amountValue === 0}
                onClick={async () => {
                  const ok = await call({
                    username: user.username,
                    action: "balance",
                    delta: mode === "add" ? amountValue : -amountValue,
                    note,
                  });
                  if (ok) {
                    setAmount("");
                    setNote("");
                  }
                }}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold text-white transition-colors disabled:opacity-50 ${
                  mode === "add" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {mode === "add" ? <Plus size={13} /> : <Minus size={13} />}
                {mode === "add" ? "Cộng" : "Trừ"} {amountValue ? `${formatVnd(amountValue)}đ` : "tiền"}
              </button>
            </div>
            {amountValue ? (
              <p className={HINT}>
                Số dư sau khi {mode === "add" ? "cộng" : "trừ"}:{" "}
                <span className={`font-bold tabular-nums ${balanceAfter < 0 ? "text-rose-600" : "text-zinc-900"}`}>
                  {balanceAfter < 0 ? "-" : ""}
                  {formatVnd(Math.abs(balanceAfter))}đ
                </span>{" "}
                (hiện {formatVnd(user.balance)}đ)
                {balanceAfter < 0 ? <span className="text-rose-600">, số dư sẽ bị âm</span> : null}
              </p>
            ) : null}
            <p className={HINT}>
              Mọi thay đổi số dư đều ghi một dòng vào lịch sử giao dịch của khách, kèm tên
              quản trị viên thực hiện.
            </p>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <BadgePercent size={13} className="text-zinc-400" />
              Đại lý
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="detail-agency" className={LABEL}>
                  % chiết khấu <span className="font-normal text-zinc-400">(1–90, thỏa thuận riêng)</span>
                </label>
                <input
                  id="detail-agency"
                  value={agencyPct}
                  onChange={(event) =>
                    setAgencyPct(event.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  inputMode="numeric"
                  placeholder={user.role === "AGENCY" ? `Đang: ${user.agencyPercent}%` : "VD: 15"}
                  className={`${INPUT} w-40 tabular-nums`}
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
                className={ACTION}
              >
                {user.role === "AGENCY" ? "Đổi %" : "Cấp đại lý"}
              </button>
              {user.role === "AGENCY" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming({ kind: "agencyRevoke" })}
                  className="h-[34px] rounded-lg border border-zinc-300 bg-white px-4 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                >
                  Gỡ đại lý
                </button>
              ) : null}
            </div>
            <p className={HINT}>
              Mức % là thỏa thuận riêng từng đại lý, không hiển thị công khai ở bất kỳ đâu
              ngoài bàn đại lý của chính họ.
            </p>
          </section>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
          <section className={CARD}>
            <span className={CARD_HEAD}>
              <KeyRound size={13} className="text-zinc-400" />
              Đặt lại mật khẩu
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="detail-password" className={LABEL}>
                  Mật khẩu mới <span className="font-normal text-zinc-400">(ít nhất 8 ký tự)</span>
                </label>
                <input
                  id="detail-password"
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Đặt lại khi khách mất quyền truy cập"
                  autoComplete="off"
                  className={INPUT}
                />
              </div>
              <button
                type="button"
                disabled={busy || password.length < 6}
                onClick={() => setConfirming({ kind: "password" })}
                className={`${ACTION} inline-flex items-center gap-1.5`}
              >
                <KeyRound size={12} />
                Đặt lại
              </button>
            </div>
            <p className={HINT}>
              Mật khẩu hiển thị dạng chữ thường vì bạn phải đọc lại cho khách, không ai xem
              được mật khẩu cũ, kể cả quản trị viên.
            </p>
          </section>

          <section className={CARD}>
            <span className={CARD_HEAD}>
              <Medal size={13} className="text-zinc-400" />
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
                  className={`${INPUT} w-44`}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`min-w-[200px] flex-1 ${HINT}`}>
                Đặt tay. Mốc lên hạng là quy định riêng của shop và chưa được khai báo, nên
                hệ thống không tự nâng hạng cho ai.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50/40 p-5">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-rose-700">
              <ShieldAlert size={13} className="text-rose-500" />
              Vùng nguy hiểm
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "role" })}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
              >
                <Shield size={12} />
                {user.role === "ADMIN" ? "Thu hồi quyền admin" : "Cấp quyền admin"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "block" })}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-colors disabled:opacity-40 ${
                  user.blockedAt
                    ? "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                    : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                }`}
              >
                {user.blockedAt ? <Unlock size={12} /> : <Ban size={12} />}
                {user.blockedAt ? "Mở khóa tài khoản" : "Khóa tài khoản"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming({ kind: "delete" })}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-40"
              >
                <Trash2 size={12} />
                Xóa vĩnh viễn
              </button>
            </div>
            <p className={`${HINT} text-rose-700/80`}>
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
