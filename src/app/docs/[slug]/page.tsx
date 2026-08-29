import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Eye, FileText } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { DocBody, DocHtml } from "@/lib/docFormat";
import { isHtmlBody } from "@/lib/docHtml";
import { getDocArticle } from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getDocArticle(slug);
  if (!article) return { title: "Không tìm thấy bài viết" };

  return {
    title: article.title,
    description: article.excerpt ?? `${article.title} — Wiki & Hướng dẫn Menzu Valorant.`,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      publishedTime: article.publishedAt.toISOString(),
      images: [{ url: article.thumbnailUrl }],
    },
    // An article with no body has nothing to rank for, and indexing empty
    // pages costs crawl budget that the catalogue needs.
    ...(article.body ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getDocArticle(slug);
  if (!article) notFound();

  return (
    <SimplePage title={article.title} crumb="Wiki & Hướng dẫn">
      <article className="max-w-3xl">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest mb-6"
        >
          <ArrowLeft size={13} />
          Tất cả bài viết
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-neutral-500 mb-6">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {dateFormat.format(article.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye size={13} />
            {article.views.toLocaleString("vi-VN")} lượt xem
          </span>
        </div>

        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-zinc-800/80 mb-8 bg-black/40">
          <Image
            src={article.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </div>

        {article.body ? (
          // Editor-era bodies are HTML, sanitized inside DocHtml before they
          // reach the reader; legacy plain-text bodies keep the old renderer.
          isHtmlBody(article.body) ? (
            <DocHtml body={article.body} />
          ) : (
            <DocBody body={article.body} />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
            <FileText size={24} className="mx-auto text-neutral-600" />
            <p className="text-sm font-bold text-white">Nội dung đang được biên soạn</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Bài viết này chưa có nội dung. Thêm nội dung vào trường{" "}
              <code className="text-[var(--menzu-accent)] font-mono">body</code> của bài{" "}
              <code className="text-[var(--menzu-accent)] font-mono">{article.slug}</code> trong bảng{" "}
              <code className="text-[var(--menzu-accent)] font-mono">doc_articles</code>.
            </p>
          </div>
        )}
      </article>
    </SimplePage>
  );
}
