"use client";

import { Loader2, Megaphone, Sparkles } from "lucide-react";
import { useState } from "react";

import { dateShort } from "./format";

/**
 * Đăng bài: one piece of writing, out on every ticked channel through the
 * official doors — the web's notice board, the Telegram channel, the Zalo
 * group queue, and the fanpage via the Graph API once its token is pasted
 * in Kết nối. The drafting agent fills the form from a product's own facts;
 * the owner edits and presses post, so nothing leaves unread.
 */

interface ProductOption {
  id: string;
  label: string;
  type: string;
}

interface Readiness {
  telegram: boolean;
  zaloGroups: number;
  facebook: boolean;
}

interface RecentNotice {
  id: string;
  title: string;
  createdAt: string;
}

const TYPE_OPTIONS = [
  { value: "INFO", label: "Thông tin" },
  { value: "UPDATE", label: "Cập nhật" },
  { value: "PROMO", label: "Khuyến mãi" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "GIFT", label: "Tặng quà" },
];

export function CrmPost({
  products,
  ready,
  recent,
}: {
  products: ProductOption[];
  ready: Readiness;
  recent: RecentNotice[];
}) {
  const [type, setType] = useState("INFO");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toTelegram, setToTelegram] = useState(false);
  const [toZalo, setToZalo] = useState(false);
  const [toFacebook, setToFacebook] = useState(false);
  const [productId, setProductId] = useState("");
  const [hint, setHint] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    if (!productId || drafting) return;
    setDrafting(true);
    setError(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draft", productId, hint }),
    });
    const data = (await response.json().catch(() => null)) as
      | { title?: string; body?: string; error?: string }
      | null;
    setDrafting(false);
    if (!response.ok || !data?.body) {
      setError(data?.error ?? "AI chưa viết được, bạn thử lại.");
      return;
    }
    if (data.title) setTitle(data.title);
    setBody(data.body);
  }

  async function post() {
    if (!title.trim() || !body.trim() || posting) return;
    setPosting(true);
    setError(null);
    setResults(null);
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "post",
        type,
        title,
        body,
        telegram: toTelegram,
        zalo: toZalo,
        facebook: toFacebook,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | { results?: Record<string, string>; error?: string }
      | null;
    setPosting(false);
    if (!response.ok || !data?.results) {
      setError(data?.error ?? "Chưa đăng được, bạn thử lại.");
      return;
    }
    setResults(data.results);
    setTitle("");
    setBody("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-5 lg:px-8">
        <div>
          <h1 className="text-[19px] font-bold">Đăng bài</h1>
          <p className="text-[12.5px] text-zinc-500">
            Soạn một lần, đăng lên web và các kênh đã kết nối. Mọi kênh đều đi
            đường chính thức.
          </p>
        </div>

        {/* ----- the drafting agent ----- */}
        <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-bold">
            <Sparkles size={14} className="text-red-600" />
            Nhờ AI viết nháp từ một sản phẩm
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 text-[13px] outline-none focus:border-red-400"
            >
              <option value="">Chọn sản phẩm…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label}
                </option>
              ))}
            </select>
            <input
              value={hint}
              onChange={(event) => setHint(event.target.value)}
              maxLength={300}
              placeholder="Dặn thêm (không bắt buộc): nhấn vào giá rẻ, giọng nhẹ cho Facebook…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-2.5 text-[13px] outline-none placeholder:text-zinc-400 focus:border-red-400"
            />
            <button
              type="button"
              onClick={() => void draft()}
              disabled={!productId || drafting}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
            >
              {drafting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Viết nháp
            </button>
          </div>
          <p className="text-[11.5px] text-zinc-400">
            AI chỉ dùng dữ liệu thật của sản phẩm (tên, gói, giá, link), viết chuẩn
            SEO rồi điền vào mẫu dưới; bạn sửa lại rồi mới đăng.
          </p>
        </div>

        {/* ----- the post itself ----- */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-[13px] outline-none focus:border-red-400 sm:w-[160px]"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Tiêu đề…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-[13.5px] font-semibold outline-none placeholder:font-normal placeholder:text-zinc-400 focus:border-red-400"
            />
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            maxLength={2000}
            placeholder="Nội dung bài đăng…"
            className="resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-[13.5px] leading-relaxed outline-none placeholder:text-zinc-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
              Đăng lên
            </p>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked disabled className="h-4 w-4 accent-red-600" />
              Bảng thông báo trên web (luôn đăng)
            </label>
            <label
              className={`flex items-center gap-2 text-[13px] ${ready.telegram ? "" : "text-zinc-400"}`}
            >
              <input
                type="checkbox"
                checked={toTelegram}
                disabled={!ready.telegram}
                onChange={(event) => setToTelegram(event.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              Kênh Telegram
              {ready.telegram ? (
                <span className="text-[11px] text-amber-700">
                  (gửi thẳng lên kênh thật, cân nhắc khi thử)
                </span>
              ) : (
                <span className="text-[11px]">(chưa cấu hình bot)</span>
              )}
            </label>
            <label
              className={`flex items-center gap-2 text-[13px] ${ready.zaloGroups > 0 ? "" : "text-zinc-400"}`}
            >
              <input
                type="checkbox"
                checked={toZalo}
                disabled={ready.zaloGroups === 0}
                onChange={(event) => setToZalo(event.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              Nhóm Zalo
              <span className="text-[11px]">
                {ready.zaloGroups > 0
                  ? `(${ready.zaloGroups} nhóm; bot Zalo tắt thì tin nằm hàng chờ)`
                  : "(chưa cấu hình nhóm)"}
              </span>
            </label>
            <label
              className={`flex items-center gap-2 text-[13px] ${ready.facebook ? "" : "text-zinc-400"}`}
            >
              <input
                type="checkbox"
                checked={toFacebook}
                disabled={!ready.facebook}
                onChange={(event) => setToFacebook(event.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              Facebook Page
              {ready.facebook ? null : (
                <span className="text-[11px]">(chưa kết nối, xem mục Kết nối)</span>
              )}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void post()}
              disabled={posting || !title.trim() || !body.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              {posting ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
              Đăng bài
            </button>
            {error ? <span className="text-[12.5px] text-red-600">{error}</span> : null}
          </div>

          {results ? (
            <ul className="flex flex-col gap-1 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[12.5px]">
              {Object.entries(results).map(([channel, line]) => (
                <li key={channel}>
                  <span className="font-semibold capitalize">{channel}</span>: {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-[14px] font-bold">Bài gần đây trên web</h2>
          {recent.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-zinc-500">Chưa có bài nào.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {recent.map((notice) => (
                <li key={notice.id} className="flex items-baseline gap-2 text-[13px]">
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                    {dateShort(notice.createdAt)}
                  </span>
                  <span className="truncate">{notice.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
