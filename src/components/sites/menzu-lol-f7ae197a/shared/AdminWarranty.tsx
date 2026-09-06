"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Wrench } from "lucide-react";

import {
  WARRANTY_ISSUE,
  WARRANTY_STATUS,
  type WarrantyIssue,
  type WarrantyStatus,
} from "@/lib/warrantyRequests";

export interface WarrantyRow {
  id: string;
  status: WarrantyStatus;
  issue: WarrantyIssue;
  description: string;
  imageUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  username: string;
  uid: number;
  orderCode: string;
  productName: string;
  packageLabel: string | null;
}

const FILTERS: { key: WarrantyStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OPEN", label: "Mới gửi" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "RESOLVED", label: "Đã xử lý" },
];

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";

/**
 * The warranty queue. Open reports float to the top whatever the filter; a
 * report is answered right on its card — a note and one of two buttons — so
 * the desk never leaves the list to deal with one.
 */
export function AdminWarranty({ rows }: { rows: WarrantyRow[] }) {
  const [filter, setFilter] = useState<WarrantyStatus | "ALL">("ALL");

  const counts = {
    ALL: rows.length,
    OPEN: rows.filter((r) => r.status === "OPEN").length,
    IN_PROGRESS: rows.filter((r) => r.status === "IN_PROGRESS").length,
    RESOLVED: rows.filter((r) => r.status === "RESOLVED").length,
  };
  const rank: Record<WarrantyStatus, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2 };
  const shown = rows
    .filter((r) => filter === "ALL" || r.status === filter)
    .sort((a, b) => rank[a.status] - rank[b.status]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                on
                  ? "border-[var(--brand)]/50 bg-[var(--brand)]/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {f.label}
              <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-neutral-300">
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <Wrench className="mx-auto h-8 w-8 text-neutral-600" />
          <p className="mt-3 text-sm font-bold text-white">Chưa có yêu cầu bảo hành nào</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Khách báo lỗi từ nút &ldquo;Hỗ trợ bảo hành&rdquo; trong hóa đơn đơn hàng.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((row) => (
            <TicketCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ row }: { row: WarrantyRow }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<WarrantyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = WARRANTY_STATUS[row.status];
  const open = row.status !== "RESOLVED";

  async function move(status: "IN_PROGRESS" | "RESOLVED") {
    if (busy) return;
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/admin/warranty-requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id, status, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không lưu được");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${state.tile}`}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
          {state.label}
        </span>
        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-300">
          {WARRANTY_ISSUE[row.issue].label}
        </span>
        <span className="text-[11px] font-semibold text-neutral-500">{row.createdAt}</span>
        {row.resolvedAt ? (
          <span className="text-[11px] font-semibold text-neutral-600">· xong {row.resolvedAt}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-black text-white">{row.productName}</span>
        {row.packageLabel ? (
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
            {row.packageLabel}
          </span>
        ) : null}
        <span className="text-[11px] font-semibold text-neutral-500">
          Đơn <span className="font-mono text-neutral-400">{row.orderCode}</span> · {row.username}{" "}
          <span className="text-neutral-600">#{row.uid}</span>
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">
        {row.description}
      </p>

      {row.imageUrl ? (
        <a
          href={row.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--brand)] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mở ảnh khách gửi
        </a>
      ) : null}
      {row.imageUrl ? (
        <div className="mt-2 w-full max-w-xs overflow-hidden rounded-lg border border-white/10">
          <Image
            src={row.imageUrl}
            alt=""
            width={640}
            height={360}
            unoptimized
            className="max-h-[180px] w-full object-cover"
          />
        </div>
      ) : null}

      {row.adminNote ? (
        <p className="mt-3 rounded-r-lg border-l-2 border-[var(--brand)] bg-[var(--brand)]/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-neutral-300">
          <span className="font-bold text-white">Shop đã trả lời:</span> {row.adminNote}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-white/[0.06] pt-4">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            rows={2}
            placeholder="Trả lời khách: đã cấp key mới / cập nhật bản mới / hướng dẫn… (bắt buộc khi đóng yêu cầu)"
            className={`${FIELD} resize-y leading-relaxed`}
          />
          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {row.status === "OPEN" ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => move("IN_PROGRESS")}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Wrench className="h-3.5 w-3.5" />
                {busy === "IN_PROGRESS" ? "Đang lưu…" : "Đang xử lý"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy !== null || note.trim().length === 0}
              onClick={() => move("RESOLVED")}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {busy === "RESOLVED" ? "Đang lưu…" : "Đã xử lý xong"}
            </button>
            <span className="text-[11px] text-neutral-500">
              Khách nhận thông báo ngay khi bấm.
            </span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
