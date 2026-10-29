"use client";

import { BookOpen, EyeOff, Loader2, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { dateShort } from "./format";

/**
 * Sổ tay bot — where the owner trains the assistant with the shop's own
 * knowledge, including things not published anywhere on the web. Two
 * drawers with one honest line between them: an entry the bot reads can,
 * with enough patience, be teased out of it by a customer; the truly
 * private notes go in "Chỉ nội bộ" and never reach the model at all.
 */

interface Entry {
  id: string;
  title: string;
  body: string;
  internal: boolean;
  updatedAt: string;
}

type Draft = { id: string | null; title: string; body: string; internal: boolean };

export function CrmKnowledge({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"ALL" | "BOT" | "INTERNAL">("ALL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const params = new URLSearchParams({ view: "knowledge" });
    if (q.trim()) params.set("q", q.trim());
    const response = await fetch(`/api/admin/crm?${params}`);
    if (response.ok) {
      const data = (await response.json()) as { entries: Entry[] };
      setEntries(data.entries);
    }
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "knowledge-save",
        id: draft.id ?? undefined,
        title: draft.title,
        body: draft.body,
        internal: draft.internal,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | { entries?: Entry[]; error?: string }
      | null;
    setSaving(false);
    if (!response.ok || !data?.entries) {
      setError(data?.error ?? "Chưa lưu được.");
      return;
    }
    setEntries(data.entries);
    setDraft(null);
  }

  async function remove(id: string) {
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "knowledge-delete", id }),
    });
    const data = (await response.json().catch(() => null)) as { entries?: Entry[] } | null;
    if (response.ok && data?.entries) {
      setEntries(data.entries);
      setDraft(null);
    }
  }

  const visible = entries.filter((entry) =>
    show === "ALL" ? true : show === "INTERNAL" ? entry.internal : !entry.internal,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold">Sổ tay bot</h1>
            <p className="max-w-[560px] text-[12.5px] text-zinc-500">
              Dạy bot bằng kiến thức riêng của shop: chính sách, cách xử lý lỗi,
              thông tin chưa công khai trên web. Gặp câu hỏi khớp, bot đọc mục
              liên quan rồi mới trả lời.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft({ id: null, title: "", body: "", internal: false })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700"
          >
            <Plus size={14} />
            Thêm mục
          </button>
        </div>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-800">
          Mục cho bot đọc có thể bị khách kiên nhẫn moi ra từng phần, nên đừng để
          mật khẩu, khóa hay giá vốn ở đó. Thứ tuyệt mật thì chọn &quot;Chỉ nội
          bộ&quot;: admin đọc được trong này, bot không bao giờ thấy.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
            className="flex h-9 w-full max-w-[300px] items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-red-400"
          >
            <Search size={14} className="shrink-0 text-zinc-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm trong sổ tay…"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
            />
          </form>
          {(
            [
              ["ALL", "Tất cả"],
              ["BOT", "Bot đọc"],
              ["INTERNAL", "Chỉ nội bộ"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setShow(key)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                show === key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-zinc-400">
            <BookOpen size={26} />
            <p className="text-[13px]">
              Chưa có mục nào. Bấm &quot;Thêm mục&quot; để dạy bot điều đầu tiên.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  setDraft({
                    id: entry.id,
                    title: entry.title,
                    body: entry.body,
                    internal: entry.internal,
                  })
                }
                className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-red-300"
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold">{entry.title}</span>
                  {entry.internal ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-[1px] text-[10px] font-bold text-zinc-600">
                      <EyeOff size={10} />
                      Chỉ nội bộ
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-[1px] text-[10px] font-bold text-emerald-700">
                      Bot đọc
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-zinc-400">
                    {dateShort(entry.updatedAt)}
                  </span>
                </span>
                <span className="line-clamp-2 text-[12.5px] text-zinc-500">{entry.body}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {draft ? (
        <>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setDraft(null)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-3 top-[7dvh] z-50 mx-auto flex max-h-[84dvh] w-auto max-w-[620px] flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">
                {draft.id ? "Sửa mục sổ tay" : "Thêm mục sổ tay"}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              maxLength={150}
              placeholder="Tiêu đề, cũng là từ khóa để bot tìm thấy (ví dụ: Lỗi thiếu file .dll)"
              className="h-10 rounded-lg border border-zinc-300 px-3 text-[13.5px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <textarea
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              rows={8}
              maxLength={4000}
              placeholder="Nội dung bot nên biết hoặc câu trả lời chuẩn của shop…"
              className="resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <label className="flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-[12.5px] text-zinc-600">
              <input
                type="checkbox"
                checked={draft.internal}
                onChange={(event) => setDraft({ ...draft, internal: event.target.checked })}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              <span>
                <span className="font-semibold">Chỉ nội bộ.</span> Bot không bao giờ
                đọc mục này; chỉ admin thấy trong sổ tay. Dành cho dữ liệu mật.
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="h-9 rounded-lg bg-red-600 px-4 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Lưu"}
              </button>
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => void remove(draft.id!)}
                  className="h-9 rounded-lg border border-zinc-300 px-3 text-[13px] font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
                >
                  Xoá mục này
                </button>
              ) : null}
              {error ? <span className="text-[12px] text-red-600">{error}</span> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
