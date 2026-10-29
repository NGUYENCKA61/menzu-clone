"use client";

import { ArrowUpRight, Loader2, MessagesSquare, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { ago, avatarTone, dateShort, formatVnd, initials } from "./format";

/**
 * The customer book: every account with the figures a support desk triages
 * by, searchable by name or label. A row opens the customer's card in a
 * drawer — their standing, the shop's note and labels, and their
 * conversations, each one a link back into the inbox.
 *
 * Desktop is a table because that is what this data is; a phone gets the
 * same rows as cards.
 */

interface CustomerRow {
  id: string;
  uid: number;
  username: string;
  balance: number;
  totalSpent: number;
  totalToppedUp: number;
  orderCount: number;
  threadCount: number;
  note: string;
  tags: string[];
  lastLoginAt: string | null;
  memberSince: string;
}

interface ThreadRow {
  id: string;
  status: "BOT" | "NEED_ADMIN" | "DONE";
  lastMessageAt: string;
  preview: { role: string; body: string } | null;
}

interface OrderRow {
  code: string;
  total: number;
  status: string;
  at: string;
  product: string;
}

interface TopUpRow {
  code: string;
  amount: number;
  status: string;
  at: string;
}

const THREAD_BADGE: Record<ThreadRow["status"], { label: string; cls: string }> = {
  NEED_ADMIN: { label: "Cần xử lý", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  BOT: { label: "Bot", cls: "border-zinc-200 bg-zinc-50 text-zinc-600" },
  DONE: { label: "Xong", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export function CrmCustomers({ initial }: { initial: CustomerRow[] }) {
  const [rows, setRows] = useState<CustomerRow[]>(initial);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [moreLeft, setMoreLeft] = useState(initial.length === 30);
  const [picked, setPicked] = useState<CustomerRow | null>(null);
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [topUps, setTopUps] = useState<TopUpRow[]>([]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const fetchPage = useCallback(async (query: string, skip: number) => {
    const params = new URLSearchParams({ view: "customers" });
    if (query.trim()) params.set("q", query.trim());
    if (skip > 0) params.set("skip", String(skip));
    const response = await fetch(`/api/admin/crm?${params}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { customers: CustomerRow[] };
    return data.customers;
  }, []);

  async function search() {
    setLoading(true);
    const page = await fetchPage(q, 0);
    if (page) {
      setRows(page);
      setMoreLeft(page.length === 30);
    }
    setLoading(false);
  }

  async function loadMore() {
    setLoading(true);
    const page = await fetchPage(q, rows.length);
    if (page) {
      setRows([...rows, ...page]);
      setMoreLeft(page.length === 30);
    }
    setLoading(false);
  }

  async function openCustomer(row: CustomerRow) {
    setPicked(row);
    setNote(row.note);
    setTags(row.tags);
    setTagDraft("");
    setNoteSaved(false);
    setThreads(null);
    setOrders([]);
    setTopUps([]);
    const response = await fetch(`/api/admin/crm?userId=${encodeURIComponent(row.id)}`);
    if (response.ok) {
      const data = (await response.json()) as {
        threads: ThreadRow[];
        orders: OrderRow[];
        topUps: TopUpRow[];
      };
      setThreads(data.threads);
      setOrders(data.orders);
      setTopUps(data.topUps);
    } else {
      setThreads([]);
    }
  }

  async function saveNote() {
    if (!picked || savingNote) return;
    setSavingNote(true);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "note", userId: picked.id, note, tags }),
    });
    if (response.ok) {
      setNoteSaved(true);
      setRows(rows.map((row) => (row.id === picked.id ? { ...row, note, tags } : row)));
    }
    setSavingNote(false);
  }

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || tags.includes(tag) || tags.length >= 8) return;
    setTags([...tags, tag]);
    setTagDraft("");
    setNoteSaved(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1060px] px-4 py-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold">Khách hàng</h1>
            <p className="text-[12.5px] text-zinc-500">
              Sắp theo hoạt động gần nhất. Bấm một dòng để xem hồ sơ và hội thoại.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
            className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
          >
            <Search size={14} className="shrink-0 text-zinc-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tên đăng nhập hoặc nhãn…"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
            />
          </form>
        </div>

        {/* ----- desktop table ----- */}
        <div className="mt-4 hidden overflow-hidden rounded-xl border border-zinc-200 bg-white md:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2.5 font-semibold">Khách</th>
                <th className="px-3 py-2.5 font-semibold">Nhãn</th>
                <th className="px-3 py-2.5 text-right font-semibold">Số dư</th>
                <th className="px-3 py-2.5 text-right font-semibold">Đã nạp</th>
                <th className="px-3 py-2.5 text-right font-semibold">Đã mua</th>
                <th className="px-3 py-2.5 text-right font-semibold">Đơn</th>
                <th className="px-3 py-2.5 text-right font-semibold">Chat</th>
                <th className="px-4 py-2.5 text-right font-semibold">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => void openCustomer(row)}
                  className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(row.username)}`}
                      >
                        {initials(row.username)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{row.username}</span>
                        <span className="block text-[11px] text-zinc-400">UID {row.uid}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {row.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {formatVnd(row.balance)}đ
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                    {formatVnd(row.totalToppedUp)}đ
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                    {formatVnd(row.totalSpent)}đ
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                    {row.orderCount}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                    {row.threadCount}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[12px] text-zinc-400">
                    {row.lastLoginAt ? `${ago(row.lastLoginAt)} trước` : "Chưa đăng nhập"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ----- phone cards ----- */}
        <div className="mt-4 flex flex-col gap-2 md:hidden">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => void openCustomer(row)}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-left"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${avatarTone(row.username)}`}
              >
                {initials(row.username)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{row.username}</span>
                <span className="block text-[11.5px] text-zinc-500">
                  Ví {formatVnd(row.balance)}đ · {row.orderCount} đơn · {row.threadCount} chat
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-zinc-400">
                {row.lastLoginAt ? ago(row.lastLoginAt) : ""}
              </span>
            </button>
          ))}
        </div>

        {rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
            <Users size={26} />
            <p className="text-[13px]">Không thấy khách nào khớp.</p>
          </div>
        ) : null}

        <div className="mt-4 flex justify-center">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-zinc-400" />
          ) : moreLeft ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-4 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Tải thêm
            </button>
          ) : null}
        </div>
      </div>

      {/* ----- the customer drawer ----- */}
      {picked ? (
        <>
          <button
            type="button"
            aria-label="Đóng hồ sơ"
            onClick={() => setPicked(null)}
            className="fixed inset-0 z-30 bg-black/25"
          />
          <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[360px] flex-col gap-4 overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold ${avatarTone(picked.username)}`}
              >
                {initials(picked.username)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{picked.username}</p>
                <p className="text-[11.5px] text-zinc-500">
                  UID {picked.uid} · Thành viên từ {dateShort(picked.memberSince)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Figure label="Số dư ví" value={`${formatVnd(picked.balance)}đ`} />
              <Figure label="Tổng đã nạp" value={`${formatVnd(picked.totalToppedUp)}đ`} />
              <Figure label="Tổng đã mua" value={`${formatVnd(picked.totalSpent)}đ`} />
              <Figure label="Đơn hàng" value={`${picked.orderCount}`} />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Nhãn</p>
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
                  placeholder={tags.length === 0 ? "VIP, đại lý cũ…" : "Thêm nhãn"}
                  className="h-7 min-w-[90px] flex-1 rounded-full border border-dashed border-zinc-300 px-2.5 text-[11.5px] outline-none placeholder:text-zinc-400 focus:border-red-400"
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
                className="resize-y rounded-lg border border-zinc-300 px-3 py-2 text-[12.5px] outline-none placeholder:text-zinc-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
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

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                Hội thoại ({picked.threadCount})
              </p>
              {threads === null ? (
                <Loader2 size={16} className="animate-spin text-zinc-400" />
              ) : threads.length === 0 ? (
                <p className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-[12.5px] text-zinc-500">
                  <MessagesSquare size={14} />
                  Khách này chưa chat lần nào.
                </p>
              ) : (
                threads.map((thread) => {
                  const badge = THREAD_BADGE[thread.status];
                  return (
                    <Link
                      key={thread.id}
                      href={`/crm?thread=${thread.id}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 transition-colors hover:border-red-300 hover:bg-red-50/40"
                    >
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-[1px] text-[10px] font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-600">
                        {thread.preview?.body ?? "(trống)"}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-400">
                        {ago(thread.lastMessageAt)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                Đơn gần nhất
              </p>
              {orders.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
                  Chưa có đơn nào.
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.code}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-[12px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{order.product || order.code}</span>
                      <span className="text-[11px] text-zinc-400">
                        {order.code} · {dateShort(order.at)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatVnd(order.total)}đ
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-[1px] text-[10px] font-bold ${
                        order.status === "PAID"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : order.status === "REFUNDED"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      {order.status === "PAID"
                        ? "Đã trả"
                        : order.status === "REFUNDED"
                          ? "Đã hoàn"
                          : order.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                Nạp gần nhất
              </p>
              {topUps.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
                  Chưa nạp lần nào.
                </p>
              ) : (
                topUps.map((topUp) => (
                  <div
                    key={topUp.code}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-[12px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{topUp.code}</span>
                      <span className="text-[11px] text-zinc-400">{dateShort(topUp.at)}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatVnd(topUp.amount)}đ
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-[1px] text-[10px] font-bold ${
                        topUp.status === "COMPLETED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      {topUp.status === "COMPLETED" ? "Đã vào ví" : topUp.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <Link
              href={`/admin/users/${picked.uid}`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
            >
              Mở hồ sơ đầy đủ trong quản trị
              <ArrowUpRight size={13} />
            </Link>
          </aside>
        </>
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
