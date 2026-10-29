"use client";

import Link from "next/link";
import { ArrowRight, Paperclip } from "lucide-react";

import { REFUND_METHOD, REFUND_STATUS, type RefundMethod, type RefundStatus } from "@/lib/refundRequests";

export interface RefundRequestRow {
  id: string;
  status: RefundStatus;
  /** How it was paid, once it was. Null while waiting and on a rejection. */
  method: RefundMethod | null;
  /** What went back, already formatted. Null until there is a figure. */
  amount: string | null;
  reason: string;
  hasImage: boolean;
  createdAt: string;
  orderCode: string;
  productName: string;
  /** What the order was worth, already formatted — the figure being argued. */
  total: string;
  username: string;
  uid: number;
}

const ROW =
  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-4 transition-colors";

/** The white desk's own status tones; the shared lib keeps the labels. */
const STATE_CHIP: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

/**
 * The refund queue, as a list.
 *
 * Deliberately shallow: order, customer, money, and the first line of what
 * they said. Deciding happens on the request's own page, where the whole
 * complaint and its screenshot are readable — a decision made off a truncated
 * line in a tab is a decision made without reading it.
 *
 * Waiting ones on top whatever their age, so last week's unanswered request
 * cannot sink under this morning's decided ones.
 */
export function AdminRefundRequests({ rows }: { rows: RefundRequestRow[] }) {
  const waiting = rows.filter((r) => r.status === "PENDING");
  const decided = rows.filter((r) => r.status !== "PENDING");

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white py-10 text-center text-[13px] text-zinc-500">
        Chưa có yêu cầu hoàn trả nào.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {[...waiting, ...decided].map((r) => {
        const state = REFUND_STATUS[r.status];
        const open = r.status === "PENDING";
        return (
          <Link
            key={r.id}
            href={`/admin/refunds/${r.id}`}
            className={`${ROW} ${
              open
                ? "border-amber-300 bg-amber-50/50 hover:border-amber-400"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                STATE_CHIP[r.status] ?? "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {state.label}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-mono text-[12px] font-bold text-zinc-900">
                  {r.orderCode}
                </span>
                <span className="truncate text-[12px] font-semibold text-zinc-700">
                  {r.productName}
                </span>
                <span className="text-[12px] font-bold tabular-nums text-zinc-900">
                  {r.total}
                </span>
                {r.hasImage ? (
                  <Paperclip size={11} className="text-zinc-400" />
                ) : null}
              </div>
              {/* One line of it. The rest is a click away, and a decision made
                  off a truncated complaint is one made without reading it. */}
              <p className="mt-1 truncate text-[12px] text-zinc-500">
                {r.reason}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {r.username} · UID {r.uid} · {r.createdAt}
                {r.method ? ` · ${REFUND_METHOD[r.method].label}` : ""}
                {r.amount ? ` ${r.amount}` : ""}
              </p>
            </div>

            <ArrowRight size={14} className="shrink-0 text-zinc-300" />
          </Link>
        );
      })}
    </div>
  );
}
