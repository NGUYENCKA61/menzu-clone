import { ArrowRight, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/** What a card needs, which is less than a whole article row. */
export interface DocCard {
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  thumbnailUrl: string;
  views: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  FAQ: "FAQ",
  WARRANTY: "Chính sách bảo hành",
  GUIDE: "Hướng dẫn",
};

/**
 * "Xem hướng dẫn" — the wiki articles, on the home page.
 *
 * The shop answers the same handful of questions every day, and until now the
 * answers lived a click away behind a nav item. Which articles appear, and in
 * what order, is set in Cấu hình → Cấu hình trang chủ; the section renders
 * nothing at all when there are none, rather than an empty heading.
 */
export function DocsSection({ articles }: { articles: DocCard[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="w-full">
      <div className="mb-8 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--brand)]" />
          <h2 className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl">
            Xem hướng dẫn
          </h2>
        </div>
        {/* The pill every product row wears for the same link. */}
        <Link href="/docs" className="group inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)] sm:text-[11px]">
          <span className="hidden sm:inline">XEM TẤT CẢ</span>
          <span className="sm:hidden">XEM THÊM</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/docs/${article.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a0a0c]">
              <Image
                src={article.thumbnailUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                {CATEGORY_LABELS[article.category] ?? article.category}
              </span>
              <h3 className="text-[13px] font-bold leading-snug text-white">{article.title}</h3>
              {article.excerpt ? (
                <p className="line-clamp-2 text-[12px] leading-relaxed text-neutral-400">
                  {article.excerpt}
                </p>
              ) : null}
              <span className="mt-auto flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-neutral-600">
                <Eye size={12} />
                {article.views.toLocaleString("vi-VN")} lượt xem
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
