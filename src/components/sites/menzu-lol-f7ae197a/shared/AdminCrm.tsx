"use client";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Headset,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Search,
  SendHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The CRM desk (29/10/2026): every web-chat conversation in one place. Left,
 * the inbox — hand-offs first by filter, newest first in time. Right, the
 * open conversation with the customer's standing beside it: balance, money
 * in and out, open warranty, the desk's own note and labels. The admin
 * answers here and the customer sees it in the widget within its poll.
 *
 * On a phone the two panes become two screens: the list, then the
 * conversation with a back arrow.
 */

type ThreadStatus = "BOT" | "NEED_ADMIN" | "DONE";

interface ListRow {
  id: string;
  status: ThreadStatus;
  channel: string;
  needReason: string | null;
  lastMessageAt: string;
  customer: { uid: number; username: string; tags: string[] } | null;
  preview: { role: "CUSTOMER" | "BOT" | "ADMIN"; body: string } | null;
}

interface Counts {
  needAdmin: number;
  bot: number;
  done: number;
}

interface DetailMessage {
  id: string;
  role: "CUSTOMER" | "BOT" | "ADMIN";
  body: string;
  at: string;
}

interface Detail {
  id: string;
  status: ThreadStatus;
  channel: string;
  needReason: string | null;
  customer: {
    id: string;
    uid: number;
    username: string;
    balance: number;
    totalSpent: number;
    totalToppedUp: number;
    orderCount: number;
    openWarranty: number;
    note: string;
    tags: string[];
    memberSince: string;
  } | null;
  messages: DetailMessage[];
}

export interface AdminCrmInitial {
  threads: ListRow[];
  counts: Counts;
  /** The filter the server rendered `threads` under, so first paint agrees. */
  filter: "ALL" | ThreadStatus;
}

const FILTERS: { key: "ALL" | ThreadStatus; label: string }[] = [
  { key: "NEED_ADMIN", label: "Cần bạn" },
  { key: "BOT", label: "Bot đang trả lời" },
  { key: "DONE", label: "Xong" },
  { key: "ALL", label: "Tất cả" },
];

const STATUS_CHIP: Record<ThreadStatus, { label: string; cls: string }> = {
  NEED_ADMIN: {
    label: "Cần bạn",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  BOT: { label: "Bot", cls: "border-white/15 bg-white/[0.04] text-neutral-300" },
  DONE: { label: "Xong", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};

const CHANNEL_LABEL: Record<string, string> = {
  WEB: "Web",
  ZALO: "Zalo",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** "3 phút", "2 giờ", "ba hôm trước" — enough to triage by. */
function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function AdminCrm({ initial }: { initial: AdminCrmInitial }) {
  const [threads, setThreads] = useState<ListRow[]>(initial.threads);
  const [counts, setCounts] = useState<Counts>(initial.counts);
  const [filter, setFilter] = useState<"ALL" | ThreadStatus>(initial.filter);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async (status: "ALL" | ThreadStatus, query: string) => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const response = await fetch(`/api/admin/crm?${params}`);
    if (!response.ok) return;
    const data = (await response.json()) as { threads: ListRow[]; counts: Counts };
    setThreads(data.threads);
    setCounts(data.counts);
  }, []);

  const refreshDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/crm?id=${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { thread: Detail };
    return data.thread;
  }, []);

  // The desk breathes every 10 seconds: list and the open conversation.
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshList(filter, q);
      if (selectedId) {
        void refreshDetail(selectedId).then((fresh) => {
          if (fresh) setDetail((current) => (current?.id === fresh.id ? fresh : current));
        });
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [filter, q, selectedId, refreshList, refreshDetail]);

  /** Filter taps and the search box refetch by hand, not by effect. */
  function pickFilter(key: "ALL" | ThreadStatus) {
    setFilter(key);
    void refreshList(key, q);
  }

  // New lines land in view.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [detail?.messages.length, selectedId]);

  async function open(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    setError(null);
    const fresh = await refreshDetail(id);
    if (fresh) {
      setDetail(fresh);
      setNote(fresh.customer?.note ?? "");
      setTags((fresh.customer?.tags ?? []).join(", "));
      setNoteSaved(false);
    } else {
      setError("Không tải được hội thoại.");
    }
    setLoadingDetail(false);
  }

  async function act(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Có lỗi, bạn thử lại.");
      return false;
    }
    return true;
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !detail || sending) return;
    setSending(true);
    const ok = await act({ action: "reply", id: detail.id, body: text });
    if (ok) {
      setReply("");
      const fresh = await refreshDetail(detail.id);
      if (fresh) setDetail(fresh);
    }
    setSending(false);
  }

  async function setStatus(status: ThreadStatus) {
    if (!detail) return;
    const ok = await act({ action: "status", id: detail.id, status });
    if (ok) {
      setDetail({ ...detail, status, needReason: status === "NEED_ADMIN" ? detail.needReason : null });
      void refreshList(filter, q);
    }
  }

  async function saveNote() {
    if (!detail?.customer || savingNote) return;
    setSavingNote(true);
    const ok = await act({
      action: "note",
      userId: detail.customer.id,
      note,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (ok) setNoteSaved(true);
    setSavingNote(false);
  }

  const detailOpen = selectedId !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* The desk's pulse. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Cần bạn" value={counts.needAdmin} tone="amber" icon={Headset} />
        <Stat label="Bot đang trả lời" value={counts.bot} tone="plain" icon={Bot} />
        <Stat label="Đã xong" value={counts.done} tone="green" icon={CheckCircle2} />
        <Stat
          label="Tổng hội thoại"
          value={counts.needAdmin + counts.bot + counts.done}
          tone="plain"
          icon={MessagesSquare}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px,minmax(0,1fr)]">
        {/* ----- the inbox ----- */}
        <section
          className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 ${
            detailOpen ? "hidden lg:flex" : ""
          }`}
        >
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => pickFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  filter === key
                    ? "border-[var(--brand)] bg-[var(--brand)]/15 text-white"
                    : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {label}
                {key === "NEED_ADMIN" && counts.needAdmin > 0 ? (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-amber-300">
                    {counts.needAdmin}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void refreshList(filter, q);
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2"
          >
            <Search size={13} className="shrink-0 text-neutral-500" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm theo tên khách, Enter để tìm…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder-neutral-500"
            />
          </form>

          <div className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="px-2 py-6 text-center text-[13px] text-neutral-500">
                Chưa có hội thoại nào ở mục này.
              </p>
            ) : (
              threads.map((row) => {
                const chip = STATUS_CHIP[row.status];
                const active = row.id === selectedId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => void open(row.id)}
                    className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[var(--brand)]/60 bg-[var(--brand)]/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-bold text-white">
                        {row.customer ? row.customer.username : "Khách vãng lai"}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}
                      >
                        {chip.label}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-neutral-500">
                        {ago(row.lastMessageAt)}
                      </span>
                    </span>
                    {row.needReason ? (
                      <span className="text-[11px] text-amber-300/90">{row.needReason}</span>
                    ) : null}
                    {row.preview ? (
                      <span className="truncate text-[12px] text-neutral-400">
                        {row.preview.role === "CUSTOMER"
                          ? "Khách: "
                          : row.preview.role === "ADMIN"
                            ? "Bạn: "
                            : "Bot: "}
                        {row.preview.body}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ----- the open conversation ----- */}
        <section
          className={`flex min-h-[420px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 ${
            detailOpen ? "" : "hidden lg:flex"
          }`}
        >
          {!detail && !loadingDetail ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-500">
              <MessagesSquare size={28} />
              <p className="text-[13px]">Chọn một hội thoại bên trái để xem và trả lời.</p>
            </div>
          ) : null}

          {loadingDetail ? (
            <div className="flex flex-1 items-center justify-center text-neutral-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : null}

          {detail && !loadingDetail ? (
            <>
              <header className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-neutral-300 hover:text-white lg:hidden"
                  aria-label="Quay lại danh sách"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black text-white">
                    {detail.customer ? (
                      <Link
                        href={`/admin/users/${detail.customer.uid}`}
                        className="hover:text-[var(--brand)]"
                      >
                        {detail.customer.username}
                        <span className="ml-1.5 text-[11px] font-bold text-neutral-500">
                          UID {detail.customer.uid}
                        </span>
                      </Link>
                    ) : (
                      "Khách vãng lai"
                    )}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Kênh {CHANNEL_LABEL[detail.channel] ?? detail.channel}
                    {detail.needReason ? ` · ${detail.needReason}` : ""}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {detail.status !== "DONE" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus("DONE")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[12px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 size={13} />
                      Xong
                    </button>
                  ) : null}
                  {detail.status === "NEED_ADMIN" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus("BOT")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-bold text-neutral-300 transition-colors hover:bg-white/5"
                    >
                      <Bot size={13} />
                      Trả lại bot
                    </button>
                  ) : null}
                  {detail.status === "DONE" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus("NEED_ADMIN")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-3 py-1.5 text-[12px] font-bold text-amber-300 transition-colors hover:bg-amber-500/10"
                    >
                      <RotateCcw size={13} />
                      Mở lại
                    </button>
                  ) : null}
                </div>
              </header>

              {detail.customer ? (
                <div className="grid gap-2 rounded-xl border border-white/5 bg-neutral-950/40 p-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
                  <Fact label="Số dư ví" value={`${formatVnd(detail.customer.balance)}đ`} />
                  <Fact label="Tổng đã nạp" value={`${formatVnd(detail.customer.totalToppedUp)}đ`} />
                  <Fact
                    label="Tổng đã mua"
                    value={`${formatVnd(detail.customer.totalSpent)}đ · ${detail.customer.orderCount} đơn`}
                  />
                  <Fact
                    label="Bảo hành đang mở"
                    value={detail.customer.openWarranty > 0 ? `${detail.customer.openWarranty} phiếu` : "Không"}
                    warn={detail.customer.openWarranty > 0}
                  />
                </div>
              ) : (
                <p className="rounded-xl border border-white/5 bg-neutral-950/40 p-3 text-[12px] text-neutral-500">
                  Khách chưa đăng nhập, không có hồ sơ. Hỏi tên đăng nhập hoặc mã
                  đơn để tra trong mục Người dùng.
                </p>
              )}

              <div
                ref={scrollRef}
                className="flex max-h-[44vh] min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-white/5 bg-neutral-950/30 p-3"
              >
                {detail.messages.map((message) => (
                  <DeskBubble key={message.id} message={message} />
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendReply();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendReply();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Trả lời khách… (Enter gửi, Shift+Enter xuống dòng)"
                  className="min-h-[44px] flex-1 resize-y rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-[13px] text-white outline-none transition-colors placeholder-neutral-500 focus:border-[var(--brand)]/60"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-dark)] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[var(--brand)] disabled:opacity-40"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
                  Gửi
                </button>
              </form>

              {detail.customer ? (
                <details className="rounded-xl border border-white/5 bg-neutral-950/40 p-3">
                  <summary className="cursor-pointer text-[12px] font-bold text-neutral-300">
                    Ghi chú và nhãn của shop về khách này
                    {detail.customer.tags.length > 0 ? (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {detail.customer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold text-neutral-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      value={tags}
                      onChange={(event) => {
                        setTags(event.target.value);
                        setNoteSaved(false);
                      }}
                      placeholder="Nhãn, cách nhau dấu phẩy: VIP, hay đòi bảo hành…"
                      className="rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-[12px] text-white outline-none placeholder-neutral-600 focus:border-[var(--brand)]/60"
                    />
                    <textarea
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        setNoteSaved(false);
                      }}
                      rows={2}
                      maxLength={2000}
                      placeholder="Ghi chú riêng, khách không thấy…"
                      className="resize-y rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-[12px] text-white outline-none placeholder-neutral-600 focus:border-[var(--brand)]/60"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveNote()}
                        disabled={savingNote}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-bold text-neutral-200 transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        {savingNote ? "Đang lưu…" : "Lưu ghi chú"}
                      </button>
                      {noteSaved ? (
                        <span className="text-[12px] text-emerald-300">Đã lưu.</span>
                      ) : null}
                    </div>
                  </div>
                </details>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "plain";
  icon: typeof Headset;
}) {
  const toneCls =
    tone === "amber" && value > 0
      ? "border-amber-500/40"
      : tone === "green"
        ? "border-emerald-500/30"
        : "border-white/10";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${toneCls} bg-white/[0.02] px-4 py-3`}>
      <Icon size={18} className="shrink-0 text-neutral-400" />
      <div>
        <p className="text-xl font-black leading-tight text-white">{value}</p>
        <p className="text-[11px] text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className={`font-bold ${warn ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

/** One stored line on the desk: customer left, the shop's two voices right. */
function DeskBubble({ message }: { message: DetailMessage }) {
  const ours = message.role !== "CUSTOMER";
  const label =
    message.role === "CUSTOMER" ? null : message.role === "ADMIN" ? "Bạn" : "Bot";
  return (
    <div className={`flex max-w-[85%] flex-col gap-0.5 ${ours ? "self-end items-end" : "self-start"}`}>
      <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {label ? `${label} · ` : ""}
        {clock(message.at)}
      </span>
      <p
        className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          message.role === "ADMIN"
            ? "rounded-br-sm bg-[var(--brand)]/20 text-white"
            : message.role === "BOT"
              ? "rounded-br-sm border border-white/10 bg-white/[0.03] text-neutral-300"
              : "rounded-bl-sm bg-white/[0.06] text-neutral-100"
        }`}
      >
        {message.body}
      </p>
    </div>
  );
}
