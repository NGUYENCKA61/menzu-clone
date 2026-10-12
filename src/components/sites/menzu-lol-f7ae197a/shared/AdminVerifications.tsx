"use client";

import { BadgeCheck, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ListPager } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountListChrome";
import type { AdminVerificationRow } from "@/lib/verification";
import {
  VERIFICATION_STATUS_LABEL,
  type VerificationStatus,
} from "@/lib/verificationRules";

import { AdminEmpty, ConfirmDialog } from "./AdminStates";

type Filter = "ALL" | VerificationStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Từ chối" },
  { key: "ALL", label: "Tất cả" },
];

const RANK: Record<VerificationStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

const CHIP: Record<VerificationStatus, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  APPROVED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-red-500/40 bg-red-500/10 text-red-300",
};

const PER_PAGE = 20;

const LABEL =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder-neutral-500 focus:border-indigo-500/60";

type Dialog = {
  row: AdminVerificationRow;
  action: "approve" | "reject" | "revoke";
};

/**
 * The desk for "xác thực cấp 2": every bid with what helps the shop decide
 * (the Facebook to open, the Zalo name the bot saw, the proved phone, the
 * bank line to set against the top-ups that came in), the waiting ones on
 * top. A decision is a dialog: approve at once, or a reason the customer
 * reads when refused or revoked.
 */
export function AdminVerifications({
  rows,
  initialFilter = "PENDING",
}: {
  rows: AdminVerificationRow[];
  initialFilter?: Filter;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = (key: Filter) =>
    key === "ALL" ? rows.length : rows.filter((r) => r.status === key).length;

  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) => filter === "ALL" || r.status === filter)
    .filter(
      (r) =>
        q === "" ||
        r.username.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.facebookName.toLowerCase().includes(q) ||
        r.accountHolder.toLowerCase().includes(q),
    )
    .sort(
      (a, b) => RANK[a.status] - RANK[b.status] || b.createdTs - a.createdTs,
    );

  const listKey = `${filter}:${q}`;
  const [paging, setPaging] = useState({ key: listKey, page: 0 });
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page =
    paging.key === listKey ? Math.min(paging.page, pageCount - 1) : 0;
  const pageRows = shown.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  function open(row: AdminVerificationRow, action: Dialog["action"]) {
    setNote("");
    setError(null);
    setDialog({ row, action });
  }

  async function decide() {
    if (!dialog) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: dialog.row.id,
          action: dialog.action,
          note,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Chưa lưu được, thử lại.");
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setError("Mất kết nối, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const dialogCopy = dialog
    ? dialog.action === "approve"
      ? {
          title: `Duyệt hồ sơ của ${dialog.row.username}?`,
          body: "Tài khoản lên cấp 2 ngay và được mua các bản chỉ bán cho tài khoản xác thực. Khách nhận thông báo trên web và qua kênh đã liên kết.",
          confirm: "Duyệt",
        }
      : dialog.action === "reject"
        ? {
            title: `Từ chối hồ sơ của ${dialog.row.username}?`,
            body: "Khách đọc lý do bên dưới và có thể sửa rồi gửi lại.",
            confirm: "Từ chối",
          }
        : {
            title: `Thu hồi cấp 2 của ${dialog.row.username}?`,
            body: "Tài khoản về cấp 1 ngay; khách đọc lý do bên dưới và có thể gửi hồ sơ lại.",
            confirm: "Thu hồi",
          }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Lọc hồ sơ"
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`h-9 rounded-xl border px-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                filter === key
                  ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-neutral-500">{count(key)}</span>
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tài khoản, số điện thoại, tên…"
            className={`${FIELD} pl-10`}
          />
        </label>
      </div>

      {pageRows.length === 0 ? (
        <AdminEmpty
          title={
            rows.length === 0 ? "Chưa có hồ sơ nào" : "Không có hồ sơ khớp"
          }
          body={
            rows.length === 0
              ? "Khách gửi hồ sơ ở Bảo mật → Xác thực cấp 2; hồ sơ mới hiện ở đây."
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pageRows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0e0e11] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/admin/users/${r.uid}`}
                  className="text-sm font-black text-white hover:underline"
                >
                  {r.username}
                </Link>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${CHIP[r.status]}`}
                >
                  {r.status === "APPROVED" ? (
                    <BadgeCheck size={12} aria-hidden />
                  ) : null}
                  {VERIFICATION_STATUS_LABEL[r.status]}
                </span>
                <span className="text-[12px] text-neutral-500">
                  Gửi {r.createdAt}
                </span>
                <span className="text-[12px] text-neutral-600">
                  · tham gia {r.joinedAt}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className={LABEL}>Facebook</dt>
                  <dd className="mt-1 text-neutral-200">
                    {r.facebookName}
                    <a
                      href={r.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-[12px] font-bold text-indigo-300 hover:underline"
                    >
                      Mở <ExternalLink size={12} aria-hidden />
                    </a>
                    <span className="block break-all text-[11px] text-neutral-500">
                      {r.facebookUrl}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Zalo</dt>
                  <dd className="mt-1 text-neutral-200">
                    {r.zaloName ?? "(không tên)"}
                    {r.zaloNow !== r.zaloName ? (
                      <span className="block text-[11px] text-amber-300">
                        Hiện liên kết: {r.zaloNow ?? "đã huỷ liên kết"}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Số điện thoại</dt>
                  <dd className="mt-1 font-mono text-neutral-200">
                    {r.phone}
                    <span className="block font-sans text-[11px] text-emerald-400">
                      Đã xác minh qua Zalo {r.phoneVerifiedAt}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Ngân hàng</dt>
                  <dd className="mt-1 text-neutral-200">
                    {r.bankName} ·{" "}
                    <span className="font-mono">{r.bankAccount}</span>
                    <span className="block font-bold text-white">
                      {r.accountHolder}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Nạp qua ngân hàng</dt>
                  <dd className="mt-1 text-neutral-200">
                    {r.topUps > 0
                      ? `${r.topUps} lần · ${r.topUpTotal.toLocaleString("vi-VN")}đ`
                      : "Chưa nạp lần nào"}
                    <span className="block text-[11px] text-neutral-500">
                      Đối chiếu tên người chuyển trong app ngân hàng với tên
                      trên.
                    </span>
                  </dd>
                </div>
                {r.reviewedAt ? (
                  <div>
                    <dt className={LABEL}>Quyết định</dt>
                    <dd className="mt-1 text-neutral-200">
                      {VERIFICATION_STATUS_LABEL[r.status]} ·{" "}
                      {r.reviewedBy ?? "admin"} · {r.reviewedAt}
                      {r.note ? (
                        <span className="block text-[12px] text-neutral-400">
                          {r.note}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {r.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => open(r, "approve")}
                      className="h-10 rounded-xl bg-emerald-500 px-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-400"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => open(r, "reject")}
                      className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-red-500/40 hover:text-red-400"
                    >
                      Từ chối
                    </button>
                  </>
                ) : r.status === "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => open(r, "revoke")}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    Thu hồi cấp 2
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <ListPager
          page={page}
          pageCount={pageCount}
          onSelect={(next) => setPaging({ key: listKey, page: next })}
        />
      ) : null}

      <ConfirmDialog
        open={dialog !== null}
        danger={dialog?.action !== "approve"}
        pending={busy}
        title={dialogCopy?.title ?? ""}
        body={dialogCopy?.body ?? ""}
        confirmLabel={dialogCopy?.confirm}
        onConfirm={() => void decide()}
        onCancel={() => setDialog(null)}
      >
        {dialog && dialog.action !== "approve" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="verify-note" className={LABEL}>
              Lý do (khách sẽ đọc)
            </label>
            <textarea
              id="verify-note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 300))}
              rows={3}
              placeholder="VD: Tên chủ tài khoản ngân hàng không trùng tên Facebook"
              className={FIELD}
            />
            {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
          </div>
        ) : error ? (
          <p className="text-[12px] text-red-400">{error}</p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
