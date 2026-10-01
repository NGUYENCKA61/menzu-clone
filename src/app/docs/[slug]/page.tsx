import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";

import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { DOC_SHELF_LABEL, isDocShelf } from "@/lib/docCategories";
import { DocBody, DocHtml } from "@/lib/docFormat";
import { isHtmlBody } from "@/lib/docHtml";
import { getDocArticle, listRelatedDocs } from "@/lib/queries";
import { shareCard } from "@/lib/shareCard";

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
    description: article.excerpt ?? `${article.title} — Wiki & Hướng dẫn THICHTHIHACK.`,
    alternates: { canonical: `/docs/${slug}` },
    ...(await shareCard({
      url: `/docs/${slug}`,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      image: { url: article.thumbnailUrl, alt: article.title },
    })),
    // An article with no body has nothing to rank for, and indexing empty
    // pages costs crawl budget that the catalogue needs.
    ...(article.body ? {} : { robots: { index: false, follow: true } }),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One wiki article, the way menzu lays one out: the breadcrumb through the
 * wiki, the title as written (not in capitals), one line of its shelf, dates
 * and reads, the article itself, and the shelf's other articles at the end.
 */
export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getDocArticle(slug);
  if (!article) notFound();
  const related = await listRelatedDocs(article.slug, article.category);

  const shelf = isDocShelf(article.category) ? DOC_SHELF_LABEL[article.category] : article.category;
  // An edit the day it went up is not news; a later one is worth saying.
  const updated =
    article.updatedAt.getTime() - article.publishedAt.getTime() > DAY_MS ? article.updatedAt : null;

  return (
    <SimplePage
      title={article.title}
      crumb="Wiki & Hướng dẫn"
      crumbs={[{ label: "Wiki & Hướng dẫn", href: "/docs" }, { label: article.title }]}
      titleCase="normal"
      subtitle={
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] font-semibold text-neutral-500">
          <Link
            href={`/docs#${article.category}`}
            className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:text-white"
          >
            {shelf}
          </Link>
          <span>Đăng ngày {dateFormat.format(article.publishedAt)}</span>
          {updated ? (
            <>
              <span aria-hidden>·</span>
              <span>Cập nhật {dateFormat.format(updated)}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span>{article.views.toLocaleString("vi-VN")} lượt xem</span>
        </p>
      }
    >
      <article className="max-w-3xl">
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
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
          // Said to the reader, not to whoever runs the database.
          <div className="space-y-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <FileText size={24} className="mx-auto text-neutral-600" aria-hidden />
            <p className="text-sm font-bold text-white">Bài viết đang được cập nhật</p>
            <p className="text-xs text-neutral-400">Shop đang soạn nội dung cho bài này, bạn quay lại sau nhé.</p>
          </div>
        )}
      </article>

      {/* The shelf's other articles, as menzu ends one with "Cùng chuyên mục"
          — cards in the site's own dress, each with its "Chi tiết". */}
      {related.length > 0 ? (
        <section className="mt-14 border-t border-white/10 pt-10">
          <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-widest text-white">
            <span aria-hidden className="h-4 w-0.5 rounded-full bg-[var(--menzu-accent)]" />
            Các bài viết liên quan
          </h2>
          <p className="mt-1.5 text-[12px] text-neutral-500">Cùng mục {shelf}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="relative aspect-video overflow-hidden bg-neutral-900">
                  <Image
                    src={item.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <h3 className="line-clamp-2 text-sm font-black leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)] sm:text-base">
                    {item.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-[11px] tabular-nums text-neutral-500 sm:text-xs">
                      {dateFormat.format(item.publishedAt)} · {item.views.toLocaleString("vi-VN")} lượt xem
                    </span>
                    <span className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 text-xs font-bold text-white transition-colors group-hover:bg-white/20">
                      Chi tiết
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </SimplePage>
  );
}
