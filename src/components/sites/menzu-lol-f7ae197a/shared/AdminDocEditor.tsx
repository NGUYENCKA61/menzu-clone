"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Check,
  CircleHelp,
  ExternalLink,
  Eye,
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { AdminError } from "./AdminStates";
import { RichTextEditor } from "./RichTextEditor";

export interface DocEditorView {
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  body: string | null;
  views: number;
  publishedAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; tint: string }> = {
  FAQ: {
    label: "FAQ",
    icon: CircleHelp,
    tint: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400",
  },
  GUIDE: {
    label: "Hướng dẫn",
    icon: BookOpen,
    tint: "border-violet-500/25 bg-violet-500/10 text-violet-400",
  },
  WARRANTY: {
    label: "Chính sách bảo hành",
    icon: ShieldCheck,
    tint: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
};

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

/**
 * One article, full page: papers on top, the shared TipTap desk below.
 *
 * The document saves as HTML; the API strips it to the sanctioned tags before
 * storing, and the public renderer strips again before showing.
 */
export function AdminDocEditor({
  doc,
  initialHtml,
}: {
  doc: DocEditorView;
  /** doc.body lifted to editor HTML on the server — legacy plain text arrives
   *  already converted, so this component never needs the converter. */
  initialHtml: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [excerpt, setExcerpt] = useState(doc.excerpt ?? "");
  const [html, setHtml] = useState(initialHtml);
  /** What the database currently holds, advanced on every successful save. */
  const [baseline, setBaseline] = useState({
    title: doc.title,
    excerpt: doc.excerpt ?? "",
    html: initialHtml,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const meta = CATEGORY_META[doc.category];
  const Icon = meta?.icon ?? FileText;
  const dirty =
    title !== baseline.title || excerpt !== baseline.excerpt || html !== baseline.html;
  const hasBody = html !== "";

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/docs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: doc.slug, title, excerpt, body: html }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Lưu thất bại");
        return;
      }
      setBaseline({ title, excerpt, html });
      setSaved(true);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {/* The article's papers: where it lives and how it is doing. */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-wrap items-center gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
            meta?.tint ?? "border-white/10 bg-white/5 text-neutral-400"
          }`}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-black text-white">{doc.title}</span>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                hasBody
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {hasBody ? "Đã có nội dung" : "Đang biên soạn"}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
            <span>{meta?.label ?? doc.category}</span>
            <span className="font-mono text-neutral-600">/docs/{doc.slug}</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye size={11} />
              {doc.views.toLocaleString("vi-VN")}
            </span>
            <span className="tabular-nums">{doc.publishedAt}</span>
          </p>
        </div>
        <a
          href={`/docs/${doc.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink size={13} />
          Xem trang công khai
        </a>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
          <FileText size={13} className="text-neutral-400" />
          Soạn nội dung
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label htmlFor="doc-title" className={LABEL}>
              Tiêu đề
            </label>
            <input
              id="doc-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="doc-excerpt" className={LABEL}>
              Mô tả ngắn{" "}
              <span className="text-neutral-600">(hiện trong kết quả tìm kiếm)</span>
            </label>
            <input
              id="doc-excerpt"
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                setSaved(false);
              }}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <span className={LABEL}>Nội dung</span>
          <RichTextEditor
            initialHtml={initialHtml}
            onUpdate={(value) => {
              setHtml(value);
              setSaved(false);
            }}
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Soạn trực tiếp như Word — đậm, nghiêng, màu, ảnh hiện ngay trong khung, và
            trang khách sẽ hiển thị đúng như bạn thấy. Để trống thì bài hiện trạng thái
            &ldquo;đang biên soạn&rdquo; và không được Google lập chỉ mục.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="h-10 px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center gap-2"
          >
            <FileText size={14} />
            {pending ? "Đang lưu…" : "Lưu bài viết"}
          </button>
          {saved && !dirty ? (
            <span className="text-[11px] font-bold text-emerald-400 inline-flex items-center gap-1.5">
              <Check size={13} />
              Đã lưu
            </span>
          ) : dirty ? (
            <span className="text-[11px] text-neutral-500">Có thay đổi chưa lưu</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
