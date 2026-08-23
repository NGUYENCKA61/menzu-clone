"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  CircleHelp,
  ExternalLink,
  Eye,
  FileText,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";

import { AdminEmpty, AdminError } from "./AdminStates";

export interface DocView {
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  body: string | null;
  views: number;
  publishedAt: string;
}

/** Each shelf of the wiki keeps its own glyph and hue. */
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

/** The order the shelves are laid out in, whatever order rows arrive. */
const CATEGORY_ORDER = ["FAQ", "GUIDE", "WARRANTY"];

const FIELD =
  "w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--brand)]/60 transition-colors placeholder-neutral-600";
const LABEL =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

function StatMini({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tint}`}
        >
          <Icon size={15} />
        </span>
      </div>
      <span
        className={`text-[26px] font-black leading-none tabular-nums ${
          value === "0" ? "text-neutral-600" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Wiki editor.
 *
 * Bodies are plain text, split into paragraphs on blank lines by the public
 * page — no HTML is stored, so nothing typed here can inject markup into a
 * page every visitor loads.
 */
export function AdminDocs({ docs }: { docs: DocView[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("FAQ");
  /** "" = every shelf; otherwise only that category's shelf renders. */
  const [catFilter, setCatFilter] = useState("");

  // The cards always describe the whole wiki; only the shelves filter.
  const written = docs.filter((d) => d.body).length;
  const totalViews = docs.reduce((sum, d) => sum + d.views, 0);

  const q = query.trim().toLowerCase().replace(/^\//, "");
  const shown = docs.filter(
    (d) =>
      (!catFilter || d.category === catFilter) &&
      (!q ||
        d.title.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        (d.excerpt ?? "").toLowerCase().includes(q) ||
        (d.body ?? "").toLowerCase().includes(q)),
  );

  const categories = CATEGORY_ORDER.filter((c) => shown.some((d) => d.category === c));
  // Anything with a category the shelf plan does not know still gets shown,
  // at the end, rather than silently vanishing from the editor.
  const strays = shown.filter((d) => !CATEGORY_ORDER.includes(d.category));

  async function create() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle, category: newCategory }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        slug?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Tạo bài viết thất bại");
        return;
      }
      setNewTitle("");
      setCreating(false);
      // Straight to the new article's desk — creating and writing are one
      // errand, not two.
      if (data.slug) {
        router.push(`/admin/docs/${data.slug}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  function DocCard({ doc }: { doc: DocView }) {
    const meta = CATEGORY_META[doc.category];
    const Icon = meta?.icon ?? FileText;

    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:border-white/[0.14]">
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              meta?.tint ?? "border-white/10 bg-white/5 text-neutral-400"
            }`}
          >
            <Icon size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-sm font-black text-white">{doc.title}</span>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  doc.body
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {doc.body ? "Đã có nội dung" : "Đang biên soạn"}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
              <span className="font-mono text-neutral-600">/{doc.slug}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye size={11} />
                {doc.views.toLocaleString("vi-VN")}
              </span>
              <span className="tabular-nums">{doc.publishedAt}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={`/docs/${doc.slug}`}
              target="_blank"
              rel="noreferrer"
              title="Mở trang khách đang thấy"
              aria-label={`Xem bài ${doc.title} ngoài trang`}
              className="h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08] hover:text-white transition-colors inline-flex items-center justify-center"
            >
              <ExternalLink size={13} />
            </a>
            {/* The editor lives on its own page now — a full desk with a live
                preview instead of a strip squeezed into the list. */}
            <Link
              href={`/admin/docs/${doc.slug}`}
              className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5"
            >
              <PencilLine size={12} />
              Sửa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatMini
          label="Tổng bài viết"
          value={String(docs.length)}
          icon={FileText}
          tint="border-indigo-500/25 bg-indigo-500/10 text-indigo-400"
        />
        <StatMini
          label="Đã có nội dung"
          value={String(written)}
          icon={BookOpenCheck}
          tint="border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
        />
        <StatMini
          label="Đang biên soạn"
          value={String(docs.length - written)}
          icon={PencilLine}
          tint="border-amber-500/25 bg-amber-500/10 text-amber-400"
        />
        <StatMini
          label="Tổng lượt xem"
          value={totalViews.toLocaleString("vi-VN")}
          icon={Eye}
          tint="border-violet-500/25 bg-violet-500/10 text-violet-400"
        />
      </div>

      {error ? <AdminError message={error} onRetry={() => setError(null)} /> : null}

      {/* The shelf picker — one glance says where everything lives. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={catFilter === ""}
          onClick={() => setCatFilter("")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${
            catFilter === ""
              ? "bg-[var(--brand)] text-white"
              : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white"
          }`}
        >
          Tất cả
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
              catFilter === "" ? "bg-white/20" : "bg-white/[0.06] text-neutral-500"
            }`}
          >
            {docs.length}
          </span>
        </button>
        {CATEGORY_ORDER.filter((c) => docs.some((d) => d.category === c)).map((value) => {
          const meta = CATEGORY_META[value]!;
          const Icon = meta.icon;
          const on = catFilter === value;
          const count = docs.filter((d) => d.category === value).length;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setCatFilter(on ? "" : value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-colors ${
                on
                  ? meta.tint
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white"
              }`}
            >
              <Icon size={13} />
              {value === "WARRANTY" ? "Chính sách" : meta.label}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                  on ? "bg-white/10" : "bg-white/[0.06] text-neutral-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex-1 min-w-[240px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tiêu đề, slug hoặc nội dung..."
            className="w-full h-10 rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[13px] text-white outline-none focus:border-rose-500/50 transition-colors"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-neutral-500 tabular-nums">
            {q || catFilter ? `${shown.length}/${docs.length}` : docs.length} bài viết
          </span>
          <button
            type="button"
            onClick={() => {
              setCreating((v) => !v);
              setError(null);
            }}
            className={`h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 ${
              creating
                ? "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                : "bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white"
            }`}
          >
            {creating ? <X size={14} /> : <Plus size={14} />}
            {creating ? "Đóng" : "Tạo bài viết"}
          </button>
        </div>
      </div>

      {creating ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11] p-5 flex flex-col gap-4">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
            <Plus size={13} className="text-neutral-400" />
            Bài viết mới
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="doc-new-title" className={LABEL}>
                Tiêu đề
              </label>
              <input
                id="doc-new-title"
                value={newTitle}
                maxLength={150}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Chính sách đổi trả key"
                className={FIELD}
              />
            </div>
            <div>
              <span className={LABEL}>Nhóm</span>
              <div className="flex gap-1.5">
                {CATEGORY_ORDER.map((value) => {
                  const meta = CATEGORY_META[value]!;
                  const Icon = meta.icon;
                  const on = newCategory === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setNewCategory(value)}
                      className={`inline-flex h-[42px] items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-colors ${
                        on
                          ? meta.tint
                          : "border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Icon size={13} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={pending || !newTitle.trim()}
              onClick={create}
              className="h-[42px] px-5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-[11px] font-black uppercase tracking-widest text-white transition-colors inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              {pending ? "Đang tạo…" : "Tạo"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            Đường dẫn sinh tự động từ tiêu đề và giữ nguyên về sau. Bài mới ở trạng thái
            &ldquo;đang biên soạn&rdquo; — bấm Sửa để viết nội dung rồi mới hiện đầy đủ cho
            khách.
          </p>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <AdminEmpty
          title={
            q
              ? `Không có bài viết nào khớp "${query.trim()}"`
              : "Nhóm này chưa có bài viết nào"
          }
        />
      ) : null}

      {categories.map((category) => {
        const meta = CATEGORY_META[category]!;
        const Icon = meta.icon;
        const rows = shown.filter((d) => d.category === category);
        return (
          <section key={category} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                <Icon size={14} className={meta.tint.split(" ").at(-1)} />
                {meta.label}
              </h2>
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-[11px] text-neutral-600 tabular-nums">
                {rows.length} bài
              </span>
            </div>
            {rows.map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </section>
        );
      })}

      {strays.map((doc) => (
        <DocCard key={doc.slug} doc={doc} />
      ))}
    </div>
  );
}
