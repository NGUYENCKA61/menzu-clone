"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Info,
  Loader2,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ago, avatarTone, clock, dateShort, dayLabel, formatVnd, initials } from "./format";

/**
 * The inbox, three panes like every working CRM: conversations, the open
 * conversation, the customer beside it. One list carries every channel —
 * the web chat's threads and the open warranty tickets, with Messenger
 * joining through ManyChat — newest word first, hand-offs a tab away. On a
 * phone the panes become screens: list, then chat with a back arrow, the
 * customer card behind the ⓘ button.
 *
 * A warranty row is read-and-reply here; its money moves (refunds, the bank
 * form, statuses) stay on the admin warranty desk, one link away.
 */

type ThreadStatus = "BOT" | "NEED_ADMIN" | "DONE";
type ChannelFilter = "ALL" | "WEB" | "WARRANTY" | "FACEBOOK";

interface ListRow {
  id: string;
  kind: "CHAT" | "WARRANTY";
  status: ThreadStatus;
  warrantyStatus?: string;
  channel: string;
  needReason: string | null;
  lastMessageAt: string;
  unread: boolean;
  customer: { uid: number; username: string; tags: string[] } | null;
  guestName: string | null;
  preview: { role: "CUSTOMER" | "BOT" | "ADMIN"; body: string } | null;
}

interface Counts {
  needAdmin: number;
  bot: number;
  done: number;
}

interface QuickReply {
  label: string;
  body: string;
}

interface DetailMessage {
  id: string;
  role: "CUSTOMER" | "BOT" | "ADMIN";
  body: string;
  imageUrl: string | null;
  at: string;
}

interface Detail {
  id: string;
  kind: "CHAT" | "WARRANTY";
  status: ThreadStatus;
  warrantyStatus?: string;
  warrantyOpen?: boolean;
  channel: string;
  needReason: string | null;
  guestName: string | null;
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

export interface CrmInboxInitial {
  threads: ListRow[];
  counts: Counts;
  filter: "ALL" | ThreadStatus;
  quickReplies: QuickReply[];
  openThreadId: string | null;
}

const CHANNEL_TABS: { key: ChannelFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả kênh" },
  { key: "WEB", label: "Chat web" },
  { key: "WARRANTY", label: "Bảo hành" },
  { key: "FACEBOOK", label: "Messenger" },
];

const FILTERS: { key: "ALL" | ThreadStatus; label: string }[] = [
  { key: "NEED_ADMIN", label: "Cần xử lý" },
  { key: "BOT", label: "Bot trả lời" },
  { key: "DONE", label: "Xong" },
  { key: "ALL", label: "Tất cả" },
];

const BADGE: Record<ThreadStatus, { label: string; cls: string }> = {
  NEED_ADMIN: { label: "Cần xử lý", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  BOT: { label: "Bot", cls: "border-zinc-200 bg-zinc-50 text-zinc-600" },
  DONE: { label: "Xong", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const WARRANTY_LABEL: Record<string, string> = {
  OPEN: "Bảo hành: đang mở",
  IN_PROGRESS: "Bảo hành: đang xử lý",
  REFUNDING: "Bảo hành: chờ hoàn tiền",
  RESOLVED: "Bảo hành: đã xong",
  REFUNDED: "Bảo hành: đã hoàn",
};

const CHANNEL_NAME: Record<string, string> = {
  WEB: "Chat web",
  WARRANTY: "Bảo hành",
  FACEBOOK: "Messenger",
  ZALO: "Zalo",
  TELEGRAM: "Telegram",
};

function rowName(row: { customer: { username: string } | null; guestName: string | null }) {
  return row.customer?.username ?? row.guestName ?? "Khách vãng lai";
}

export function CrmInbox({ initial }: { initial: CrmInboxInitial }) {
  const [threads, setThreads] = useState<ListRow[]>(initial.threads);
  const [counts, setCounts] = useState<Counts>(initial.counts);
  const [channel, setChannel] = useState<ChannelFilter>("ALL");
  const [filter, setFilter] = useState<"ALL" | ThreadStatus>(initial.filter);
  const [q, setQ] = useState("");
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(initial.quickReplies);
  const [qrMenuOpen, setQrMenuOpen] = useState(false);
  const [qrEditOpen, setQrEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [infoOpen, setInfoOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendWarn, setSendWarn] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [knowledgeNote, setKnowledgeNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(
    async (ch: ChannelFilter, status: "ALL" | ThreadStatus, query: string) => {
      const params = new URLSearchParams();
      if (ch !== "ALL") params.set("channel", ch);
      if (status !== "ALL" && ch !== "WARRANTY") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/crm?${params}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        threads: ListRow[];
        counts: Counts;
        quickReplies: QuickReply[];
      };
      setThreads(data.threads);
      setCounts(data.counts);
      setQuickReplies(data.quickReplies);
    },
    [],
  );

  const refreshDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/crm?id=${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { thread: Detail };
    return data.thread;
  }, []);

  const open = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setView("chat");
      setLoadingDetail(true);
      setError(null);
      setSendWarn(null);
      const fresh = await refreshDetail(id);
      if (fresh) {
        setDetail(fresh);
        setNote(fresh.customer?.note ?? "");
        setTags(fresh.customer?.tags ?? []);
        setNoteSaved(false);
        if (fresh.kind === "CHAT") {
          // The unread dot goes out quietly; the next list tick agrees.
          void fetch("/api/admin/crm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "seen", id }),
          });
          setThreads((rows) =>
            rows.map((row) => (row.id === id ? { ...row, unread: false } : row)),
          );
        }
      } else {
        setError("Không tải được hội thoại.");
      }
      setLoadingDetail(false);
    },
    [refreshDetail],
  );

  // A ?thread= link (from the customer book) opens its conversation once the
  // screen is up. Scheduled, so the open's setState runs from a timer
  // callback rather than the effect body.
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current || !initial.openThreadId) return;
    openedFromLink.current = true;
    const timer = setTimeout(() => void open(initial.openThreadId!), 0);
    return () => clearTimeout(timer);
  }, [initial.openThreadId, open]);

  // The desk breathes every 10 seconds: the list and the open conversation.
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshList(channel, filter, q);
      if (selectedId) {
        void refreshDetail(selectedId).then((fresh) => {
          if (fresh) setDetail((current) => (current?.id === fresh.id ? fresh : current));
        });
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [channel, filter, q, selectedId, refreshList, refreshDetail]);

  // New lines land in view.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [detail?.messages.length, selectedId, loadingDetail]);

  function pickChannel(key: ChannelFilter) {
    setChannel(key);
    void refreshList(key, filter, q);
  }

  function pickFilter(key: "ALL" | ThreadStatus) {
    setFilter(key);
    void refreshList(channel, key, q);
  }

  async function act(body: Record<string, unknown>): Promise<{ ok: boolean; warn?: string }> {
    setError(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as
      | { error?: string; warn?: string }
      | null;
    if (!response.ok) {
      setError(data?.error ?? "Có lỗi, bạn thử lại.");
      return { ok: false };
    }
    return { ok: true, warn: data?.warn };
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !detail || sending) return;
    setSending(true);
    setSendWarn(null);
    const result = await act({ action: "reply", id: detail.id, body: text });
    if (result.ok) {
      setReply("");
      if (result.warn) setSendWarn(result.warn);
      const fresh = await refreshDetail(detail.id);
      if (fresh) setDetail(fresh);
    }
    setSending(false);
  }

  async function moveStatus(status: ThreadStatus) {
    if (!detail || detail.kind !== "CHAT") return;
    const result = await act({ action: "status", id: detail.id, status });
    if (result.ok) {
      setDetail({
        ...detail,
        status,
        needReason: status === "NEED_ADMIN" ? detail.needReason : null,
      });
      void refreshList(channel, filter, q);
    }
  }

  async function saveNote() {
    if (!detail?.customer || savingNote) return;
    setSavingNote(true);
    const result = await act({ action: "note", userId: detail.customer.id, note, tags });
    if (result.ok) setNoteSaved(true);
    setSavingNote(false);
  }

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || tags.includes(tag) || tags.length >= 8) return;
    setTags([...tags, tag]);
    setTagDraft("");
    setNoteSaved(false);
  }

  /**
   * The teach-the-bot shortcut: the customer's last question becomes the
   * entry's title, the answer in the box its body. One tap while answering,
   * and the bot gives this answer itself next time.
   */
  async function saveReplyToKnowledge() {
    if (!detail || !reply.trim()) return;
    const lastCustomer = [...detail.messages].reverse().find((m) => m.role === "CUSTOMER");
    const title = (lastCustomer?.body ?? "Câu trả lời của shop").slice(0, 150);
    const result = await act({
      action: "knowledge-save",
      title,
      body: reply.trim(),
      internal: false,
    });
    if (result.ok) {
      setKnowledgeNote("Đã lưu vào sổ tay.");
      setTimeout(() => setKnowledgeNote(null), 2500);
    }
  }

  // Messages grouped by the shop's day, each group under one date chip.
  const groups: { day: string; messages: DetailMessage[] }[] = [];
  for (const message of detail?.messages ?? []) {
    const day = dayLabel(message.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(message);
    else groups.push({ day, messages: [message] });
  }

  const customerName = detail ? (detail.customer?.username ?? detail.guestName ?? "Khách vãng lai") : "";
  const warrantyClosed = detail?.kind === "WARRANTY" && detail.warrantyOpen === false;

  return (
    <div className="flex min-h-0 flex-1">
      {/* ================= conversations ================= */}
      <section
        className={`${view === "chat" ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-zinc-200 bg-white lg:w-[340px] lg:shrink-0`}
      >
        <div className="px-4 pb-2.5 pt-4">
          <h1 className="text-[17px] font-bold">Hộp thư</h1>
          <p className="text-[12px] text-zinc-500">
            Chat web, bảo hành và Messenger về một chỗ.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {CHANNEL_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => pickChannel(key)}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                channel === key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {channel !== "WARRANTY" ? (
          <div className="flex gap-0.5 border-b border-zinc-200 px-2">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => pickFilter(key)}
                className={`relative px-2.5 pb-2.5 pt-1 text-[12.5px] font-semibold transition-colors ${
                  filter === key ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {label}
                {key === "NEED_ADMIN" && counts.needAdmin > 0 ? (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">
                    {counts.needAdmin}
                  </span>
                ) : null}
                {filter === key ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-zinc-900" />
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="border-b border-zinc-200 px-4 pb-2.5 text-[12px] text-zinc-500">
            Phiếu bảo hành đang mở. Hoàn tiền và đổi trạng thái làm ở trang quản trị.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void refreshList(channel, filter, q);
          }}
          className="px-3 py-2.5"
        >
          <label className="flex h-9 items-center gap-2 rounded-lg bg-zinc-100 px-3">
            <Search size={14} className="shrink-0 text-zinc-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tên khách hoặc nội dung chat, Enter để tìm"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
            />
          </label>
        </form>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-zinc-400">
              <Inbox size={26} />
              <p className="text-[13px]">
                {channel === "FACEBOOK"
                  ? "Chưa có tin Messenger. Kết nối ManyChat ở mục Kết nối."
                  : "Chưa có hội thoại nào ở mục này."}
              </p>
            </div>
          ) : (
            threads.map((row) => {
              const name = rowName(row);
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => void open(row.id)}
                  className={`flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors ${
                    active ? "bg-zinc-100" : "hover:bg-zinc-50"
                  }`}
                >
                  <span className="relative mt-0.5 shrink-0">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold ${avatarTone(name)}`}
                    >
                      {initials(name)}
                    </span>
                    {row.unread ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`truncate text-[13.5px] ${row.unread ? "font-bold" : "font-semibold"}`}
                      >
                        {name}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-zinc-400">
                        {ago(row.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      {row.kind === "WARRANTY" ? (
                        <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-[1px] text-[10px] font-bold text-sky-700">
                          Bảo hành
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-[1px] text-[10px] font-bold ${BADGE[row.status].cls}`}
                        >
                          {BADGE[row.status].label}
                        </span>
                      )}
                      {row.channel === "FACEBOOK" ? (
                        <span className="shrink-0 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-[1px] text-[10px] font-bold text-indigo-700">
                          Messenger
                        </span>
                      ) : null}
                      {row.preview ? (
                        <span
                          className={`truncate text-[12.5px] ${row.unread ? "font-semibold text-zinc-700" : "text-zinc-500"}`}
                        >
                          {row.preview.role === "ADMIN"
                            ? "Bạn: "
                            : row.preview.role === "BOT"
                              ? "Bot: "
                              : ""}
                          {row.preview.body}
                        </span>
                      ) : null}
                    </span>
                    {row.needReason ? (
                      <span className="mt-0.5 block truncate text-[11.5px] text-amber-700">
                        {row.needReason}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ================= the open conversation ================= */}
      <section
        className={`${view === "chat" ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-[#fafafa]`}
      >
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-400">
            <Inbox size={30} />
            <p className="text-[13.5px]">Chọn một hội thoại để xem và trả lời.</p>
          </div>
        ) : loadingDetail || !detail ? (
          <div className="flex flex-1 items-center justify-center text-zinc-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-3 lg:px-5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
                aria-label="Quay lại danh sách"
              >
                <ArrowLeft size={16} />
              </button>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(customerName)}`}
              >
                {initials(customerName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-tight">{customerName}</p>
                <p className="text-[11px] text-zinc-500">
                  {CHANNEL_NAME[detail.channel] ?? detail.channel}
                  {detail.customer ? ` · UID ${detail.customer.uid}` : ""}
                </p>
              </div>
              <span
                className={`hidden rounded-md border px-2 py-0.5 text-[10.5px] font-bold sm:inline ${
                  detail.kind === "WARRANTY"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : BADGE[detail.status].cls
                }`}
              >
                {detail.kind === "WARRANTY"
                  ? (WARRANTY_LABEL[detail.warrantyStatus ?? ""] ?? "Bảo hành")
                  : BADGE[detail.status].label}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                {detail.kind === "WARRANTY" ? (
                  <Link
                    href="/admin/warranty"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-[12.5px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                  >
                    Mở phiếu trong quản trị
                    <ArrowUpRight size={13} />
                  </Link>
                ) : detail.status !== "DONE" ? (
                  <button
                    type="button"
                    onClick={() => void moveStatus("DONE")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} />
                    Xong
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void moveStatus("NEED_ADMIN")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 px-3 text-[12.5px] font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                  >
                    <RotateCcw size={13} />
                    Mở lại
                  </button>
                )}
                {detail.kind === "CHAT" && detail.status === "NEED_ADMIN" ? (
                  <button
                    type="button"
                    onClick={() => void moveStatus("BOT")}
                    className="hidden h-8 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-[12.5px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 sm:inline-flex"
                  >
                    <Bot size={14} />
                    Trả lại bot
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setInfoOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 xl:hidden"
                  aria-label="Hồ sơ khách"
                >
                  <Info size={16} />
                </button>
              </div>
            </header>

            {detail.kind === "CHAT" && detail.status === "NEED_ADMIN" && detail.needReason ? (
              <p className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-[12.5px] text-amber-800">
                Bot đã chuyển ca: {detail.needReason}. Khách đang chờ bạn trả lời.
              </p>
            ) : null}
            {detail.kind === "WARRANTY" ? (
              <p className="border-b border-sky-100 bg-sky-50 px-5 py-2 text-[12.5px] text-sky-800">
                {detail.needReason}. Trả lời ở đây là nhắn thẳng vào phiếu; hoàn tiền
                và trạng thái làm trong quản trị.
              </p>
            ) : null}

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
              {groups.map((group) => (
                <div key={group.day} className="flex flex-col gap-3">
                  <span className="mx-auto my-2 rounded-full bg-zinc-200/70 px-3 py-1 text-[11px] font-semibold text-zinc-500">
                    {group.day}
                  </span>
                  {group.messages.map((message) => (
                    <ChatLine key={message.id} message={message} customerName={customerName} />
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 bg-white p-3 lg:px-5">
              {warrantyClosed ? (
                <p className="text-[13px] text-zinc-500">
                  Phiếu này đã xử lý xong, khung trao đổi đã đóng.
                </p>
              ) : (
                <>
                  <div className="relative mb-2 flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setQrMenuOpen((openNow) => !openNow)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-300 px-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                      >
                        Câu mẫu
                        <ChevronDown size={12} />
                      </button>
                      {qrMenuOpen ? (
                        <div className="absolute bottom-9 left-0 z-20 w-[280px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
                          {quickReplies.length === 0 ? (
                            <p className="px-2.5 py-2 text-[12px] text-zinc-500">
                              Chưa có câu mẫu nào.
                            </p>
                          ) : (
                            quickReplies.map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  setReply((current) =>
                                    current.trim() ? `${current.trimEnd()}\n${item.body}` : item.body,
                                  );
                                  setQrMenuOpen(false);
                                }}
                                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-zinc-100"
                              >
                                <span className="block text-[12.5px] font-semibold">{item.label}</span>
                                <span className="block truncate text-[11.5px] text-zinc-500">
                                  {item.body}
                                </span>
                              </button>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setQrMenuOpen(false);
                              setQrEditOpen(true);
                            }}
                            className="mt-1 block w-full rounded-lg border-t border-zinc-100 px-2.5 py-2 text-left text-[12px] font-semibold text-zinc-900 hover:bg-zinc-100"
                          >
                            Sửa bộ câu mẫu…
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {reply.trim() && detail.kind === "CHAT" ? (
                      <button
                        type="button"
                        onClick={() => void saveReplyToKnowledge()}
                        className="inline-flex h-7 items-center rounded-lg border border-zinc-300 px-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                        title="Lưu câu hỏi của khách và câu trả lời này vào sổ tay để bot tự trả lời lần sau"
                      >
                        Lưu vào sổ tay bot
                      </button>
                    ) : null}
                    {knowledgeNote ? (
                      <span className="text-[12px] font-semibold text-emerald-600">
                        {knowledgeNote}
                      </span>
                    ) : null}
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
                      maxLength={detail.kind === "WARRANTY" ? 500 : 2000}
                      placeholder={`Trả lời ${customerName}…`}
                      className="min-h-[44px] flex-1 resize-y rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Gửi
                    </button>
                  </form>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Enter gửi, Shift+Enter xuống dòng.
                    {detail.kind === "CHAT"
                      ? detail.channel === "FACEBOOK"
                        ? " Câu trả lời gửi qua ManyChat vào Messenger của khách."
                        : " Khách thấy câu trả lời trong khung chat trên web trong vòng 10 giây."
                      : " Khách thấy trong mục Bảo hành của họ trên web."}
                  </p>
                </>
              )}
              {sendWarn ? <p className="mt-1 text-[12px] text-amber-700">{sendWarn}</p> : null}
              {error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null}
            </div>
          </>
        )}
      </section>

      {/* ================= the customer beside it ================= */}
      {infoOpen ? (
        <button
          type="button"
          aria-label="Đóng hồ sơ khách"
          onClick={() => setInfoOpen(false)}
          className="fixed inset-0 z-30 bg-black/25 xl:hidden"
        />
      ) : null}
      <aside
        className={`${
          infoOpen ? "fixed inset-y-0 right-0 z-40 flex w-[320px] shadow-2xl" : "hidden xl:flex"
        } flex-col overflow-y-auto border-l border-zinc-200 bg-white xl:static xl:z-auto xl:w-[300px] xl:shrink-0 xl:shadow-none`}
      >
        {detail ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold ${avatarTone(customerName)}`}
              >
                {initials(customerName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold">{customerName}</p>
                {detail.customer ? (
                  <p className="text-[11.5px] text-zinc-500">
                    UID {detail.customer.uid} · Thành viên từ {dateShort(detail.customer.memberSince)}
                  </p>
                ) : (
                  <p className="text-[11.5px] text-zinc-500">
                    {detail.channel === "FACEBOOK" ? "Khách Messenger" : "Chưa đăng nhập"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 xl:hidden"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {detail.customer ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Figure label="Số dư ví" value={`${formatVnd(detail.customer.balance)}đ`} />
                  <Figure label="Tổng đã nạp" value={`${formatVnd(detail.customer.totalToppedUp)}đ`} />
                  <Figure label="Tổng đã mua" value={`${formatVnd(detail.customer.totalSpent)}đ`} />
                  <Figure label="Đơn hàng" value={`${detail.customer.orderCount}`} />
                </div>
                {detail.customer.openWarranty > 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                    Đang có {detail.customer.openWarranty} phiếu bảo hành mở.
                  </p>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                    Nhãn
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            setTags(tags.filter((t) => t !== tag));
                            setNoteSaved(false);
                          }}
                          className="text-zinc-400 hover:text-zinc-700"
                          aria-label={`Bỏ nhãn ${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    <input
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder={tags.length === 0 ? "VIP, hay hỏi giá…" : "Thêm nhãn"}
                      className="h-7 min-w-[90px] flex-1 rounded-full border border-dashed border-zinc-300 px-2.5 text-[11.5px] outline-none placeholder:text-zinc-400 focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                    Ghi chú riêng của shop
                  </p>
                  <textarea
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setNoteSaved(false);
                    }}
                    rows={3}
                    maxLength={2000}
                    placeholder="Khách không thấy phần này."
                    className="resize-y rounded-lg border border-zinc-300 px-3 py-2 text-[12.5px] outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveNote()}
                      disabled={savingNote}
                      className="h-8 rounded-lg bg-zinc-900 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {savingNote ? "Đang lưu…" : "Lưu"}
                    </button>
                    {noteSaved ? (
                      <span className="text-[12px] font-semibold text-emerald-600">Đã lưu.</span>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={`/admin/users/${detail.customer.uid}`}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Mở hồ sơ đầy đủ trong quản trị
                  <ArrowUpRight size={13} />
                </Link>
              </>
            ) : (
              <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-500">
                {detail.channel === "FACEBOOK"
                  ? "Khách nhắn từ Messenger, chưa gắn với tài khoản web nào. Hỏi tên tài khoản rồi tra ở trang Khách hàng."
                  : "Khách chưa đăng nhập nên chưa có hồ sơ. Hỏi tên tài khoản hoặc mã đơn, rồi tra ở trang Khách hàng."}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-[12.5px] text-zinc-400">
            Hồ sơ khách hiện ở đây khi mở một hội thoại.
          </div>
        )}
      </aside>

      {/* ================= the canned-answer editor ================= */}
      {qrEditOpen ? (
        <QuickReplyEditor
          list={quickReplies}
          onClose={() => setQrEditOpen(false)}
          onSaved={(fresh) => {
            setQuickReplies(fresh);
            setQrEditOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-[13.5px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

/** One line of the conversation: customer left, the shop's two voices right. */
function ChatLine({
  message,
  customerName,
}: {
  message: DetailMessage;
  customerName: string;
}) {
  const ours = message.role !== "CUSTOMER";
  const who = message.role === "CUSTOMER" ? customerName : message.role === "ADMIN" ? "Bạn" : "Bot";
  return (
    <div className={`flex max-w-[78%] flex-col gap-1 ${ours ? "items-end self-end" : "self-start"}`}>
      <span className="px-1 text-[10.5px] font-semibold text-zinc-400">
        {who} · {clock(message.at)}
      </span>
      <div
        className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          message.role === "ADMIN"
            ? "rounded-br-md bg-zinc-900 text-white"
            : message.role === "BOT"
              ? "rounded-br-md bg-zinc-200/70 text-zinc-700"
              : "rounded-bl-md border border-zinc-200 bg-white text-zinc-800 shadow-sm"
        }`}
      >
        {message.imageUrl ? (
          <a href={message.imageUrl} target="_blank" rel="noreferrer">
            {/* A warranty photo at its stored size; next/image fights a
                chat scroller for no gain on an already-small upload. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Ảnh khách gửi"
              className="mb-1.5 max-h-[220px] rounded-lg"
            />
          </a>
        ) : null}
        {message.body}
      </div>
    </div>
  );
}

/** The shared canned answers, edited in place and saved as one set. */
function QuickReplyEditor({
  list,
  onClose,
  onSaved,
}: {
  list: QuickReply[];
  onClose: () => void;
  onSaved: (fresh: QuickReply[]) => void;
}) {
  const [rows, setRows] = useState<QuickReply[]>(list.length ? list : [{ label: "", body: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quickreplies", list: rows }),
    });
    const data = (await response.json().catch(() => null)) as
      | { quickReplies?: QuickReply[]; error?: string }
      | null;
    setSaving(false);
    if (!response.ok || !data?.quickReplies) {
      setError(data?.error ?? "Chưa lưu được.");
      return;
    }
    onSaved(data.quickReplies);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <div className="fixed inset-x-3 top-[8dvh] z-50 mx-auto flex max-h-[80dvh] w-auto max-w-[560px] flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Bộ câu trả lời mẫu</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[12px] text-zinc-500">
          Dùng chung cho cả desk. Tối đa 20 câu; dòng trống sẽ bị bỏ khi lưu.
        </p>
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 p-2.5">
            <div className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(event) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, label: event.target.value } : r)))
                }
                maxLength={40}
                placeholder="Tên ngắn (ví dụ: Chào hỏi)"
                className="h-8 flex-1 rounded-lg border border-zinc-300 px-2.5 text-[12.5px] outline-none focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                aria-label="Xoá câu này"
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              value={row.body}
              onChange={(event) =>
                setRows(rows.map((r, i) => (i === index ? { ...r, body: event.target.value } : r)))
              }
              rows={2}
              maxLength={1000}
              placeholder="Nội dung gửi cho khách…"
              className="resize-y rounded-lg border border-zinc-300 px-2.5 py-2 text-[12.5px] outline-none focus:border-zinc-500"
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRows([...rows, { label: "", body: "" }])}
            disabled={rows.length >= 20}
            className="h-8 rounded-lg border border-zinc-300 px-3 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
          >
            Thêm câu
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-8 rounded-lg bg-zinc-900 px-4 text-[12px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu bộ câu mẫu"}
          </button>
          {error ? <span className="text-[12px] text-red-600">{error}</span> : null}
        </div>
      </div>
    </>
  );
}
