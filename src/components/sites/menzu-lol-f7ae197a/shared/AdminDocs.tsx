"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, FileText, PencilLine } from "lucide-react";

import { AdminError } from "./AdminStates";

export interface DocView {
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  body: string | null;
  views: number;
  publishedAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  FAQ: "FAQ",
  WARRANTY: "Chính sách bảo hành",
  GUIDE: "Hướng dẫn",
};

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";

/**
 * Wiki editor.
 *
 * Bodies are plain text, split into paragraphs on blank lines by the public
 * page — no HTML is stored, so nothing typed here can inject markup into a
 * page every visitor loads.
 */
export function AdminDocs({ docs }: { docs: DocView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function open(doc: DocView) {
    setEditing(doc.slug);
    setTitle(doc.title);
    setExcerpt(doc.excerpt ?? "");
    setBody(doc.body ?? "");
    setSaved(null);
    setError(null);
  }

  async function save(slug: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/docs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, title, excerpt, body }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Lưu thất bại");
        return;
      }
      setSaved(slug);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {docs.map((doc) => (
        <div
          key={doc.slug}
          className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm font-black text-white">{doc.title}</span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-400">
              {CATEGORY_LABEL[doc.category] ?? doc.category}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                doc.body
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {doc.body ? "Đã có nội dung" : "Chưa có nội dung"}
            </span>
            <span className="text-[11px] text-neutral-500 ml-auto">
              {doc.publishedAt} · {doc.views.toLocaleString("vi-VN")} lượt xem
            </span>
            <button
              type="button"
              onClick={() => (editing === doc.slug ? setEditing(null) : open(doc))}
              className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors inline-flex items-center gap-1.5"
            >
              <PencilLine size={12} />
              {editing === doc.slug ? "Đóng" : "Sửa"}
            </button>
          </div>

          {saved === doc.slug ? (
            <p className="text-[11px] font-bold text-emerald-400 inline-flex items-center gap-1.5">
              <Check size={13} />
              Đã lưu
            </p>
          ) : null}

          {editing === doc.slug ? (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
              <div>
                <label htmlFor={`t-${doc.slug}`} className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                  Tiêu đề
                </label>
                <input id={`t-${doc.slug}`} value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
              </div>

              <div>
                <label htmlFor={`e-${doc.slug}`} className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                  Mô tả ngắn <span className="text-neutral-600">(hiện trong kết quả tìm kiếm)</span>
                </label>
                <input id={`e-${doc.slug}`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={FIELD} />
              </div>

              <div>
                <label htmlFor={`b-${doc.slug}`} className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                  Nội dung
                </label>
                <textarea
                  id={`b-${doc.slug}`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  placeholder="Cách nhau một dòng trống để xuống đoạn mới."
                  className={`${FIELD} resize-y leading-relaxed`}
                />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Văn bản thuần, mỗi đoạn cách nhau một dòng trống. Để trống thì
                  bài hiện trạng thái &ldquo;đang biên soạn&rdquo; và không được
                  Google lập chỉ mục.
                </p>
              </div>

              <button
                type="button"
                onClick={() => save(doc.slug)}
                disabled={pending}
                className="self-start h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center gap-2"
              >
                <FileText size={14} />
                {pending ? "Đang lưu…" : "Lưu bài viết"}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
