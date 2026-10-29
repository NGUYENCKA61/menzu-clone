import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Calendar, ChevronRight, Clock, Eye, FileText } from "lucide-react";

import { DocsLockPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/DocsLockPanel";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { DOC_SHELF_LABEL, isDocShelf } from "@/lib/docCategories";
import { DocBody, DocHtml } from "@/lib/docFormat";
import { embedVideos, isHtmlBody, outlineDocHtml, sanitizeDocHtml, type DocHeading } from "@/lib/docHtml";
import { getDocArticle, listRelatedDocs, listToolArticles } from "@/lib/queries";
import { docHref, productHref, toolDocsHref } from "@/lib/routes";

/** One read per request, shared by generateMetadata and the page. */
const articleBySlug = cache((slug: string) => getDocArticle(slug));
import { articleJsonLd, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { shareCard } from "@/lib/shareCard";
import { toolDocsAccess } from "@/lib/toolDocs";

interface PageProps {
  params: Promise<{ slug: string }>;
  /** LAB: ?ban=cu, see DocArticlePage. */
  searchParams?: Promise<{ ban?: string }>;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await articleBySlug(slug);
  if (!article) return { title: "Không tìm thấy bài viết" };

  return {
    title: article.title,
    description: article.excerpt ?? `${article.title}. Wiki & Hướng dẫn THICHTHIHACK.`,
    alternates: { canonical: `/docs/${slug}` },
    ...(await shareCard({
      url: `/docs/${slug}`,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      image: { url: article.thumbnailUrl, alt: article.title },
    })),
    // An article with no body has nothing to rank for, and indexing empty
    // pages costs crawl budget that the catalogue needs. A tool's article is
    // behind a key, so it is not offered to crawlers either.
    ...(article.body && !article.productId ? {} : { robots: { index: false, follow: true } }),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One wiki article, the way menzu lays one out: the breadcrumb through the
 * wiki, the title as written (not in capitals), one line of dates and reads,
 * the article itself, and the shelf's other articles at the end.
 */
export default async function DocArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  // LAB: ?ban=cu shows the article as it was before the 18/10/2026 review
  // (the cover at 768px, no "Mục lục", the screenshots square), to set
  // beside the new one ("làm url trang wiki bản cũ để tui so sánh thêm đi").
  // A production build always shows the new.
  const old = process.env.NODE_ENV !== "production" && (await searchParams)?.ban === "cu";
  const article = await articleBySlug(slug);
  if (!article) notFound();
  // A tool's article: the body opens for as long as the reader's key says
  // (lib/docsAccess.ts), and the neighbours are the tool's other pages.
  const tool = article.product;
  const user = tool ? await getCurrentUser() : null;
  const access = tool
    ? await toolDocsAccess(user ? { id: user.id, role: user.role } : null, tool.code)
    : null;
  const locked = tool !== null && access !== null && access.state !== "open";
  const related = tool
    ? await listToolArticles(tool.id, article.slug)
    : await listRelatedDocs(article.slug, article.category);

  const shelf = isDocShelf(article.category) ? DOC_SHELF_LABEL[article.category] : article.category;
  // An edit the day it went up is not news; a later one is worth saying.
  const updated =
    article.updatedAt.getTime() - article.publishedAt.getTime() > DAY_MS ? article.updatedAt : null;
  // The same test as the robots tag in generateMetadata: only a written,
  // public article is offered to crawlers, so only it is described to them.
  const indexable = Boolean(article.body) && !article.productId;
  const { brandName } = indexable ? await getShopSettings() : { brandName: "" };
  // The h2s for "Mục lục", from the pipeline DocHtml runs so the ids match;
  // a locked or plain-text body lists nothing, and a single heading is no
  // contents.
  const outline =
    !locked && article.body && isHtmlBody(article.body)
      ? outlineDocHtml(embedVideos(sanitizeDocHtml(article.body))).headings
      : [];
  const showOutline = !old && outline.length >= 2;
  const column = old ? "max-w-3xl" : "max-w-[72ch]";

  return (
    <SimplePage
      title={article.title}
      crumb="Wiki & Hướng dẫn"
      crumbs={
        tool
          ? [
              { label: "Tài liệu", href: "/tai-lieu" },
              { label: tool.name ?? tool.code, href: toolDocsHref(tool.slug) },
              { label: article.title },
            ]
          : [{ label: "Wiki & Hướng dẫn", href: "/docs" }, { label: article.title }]
      }
      titleCase="normal"
      titleBar={false}
      ground="home"
      subtitle={
        // Each fact behind its own icon, spaced rather than dotted apart, as
        // menzu prints the line (the owner, 02/10/2026: "icon mắt lịch đồng
        // hồ").
        // No shelf chip ahead of them any more (the owner, 07/10/2026: "bỏ
        // nhãn ... dư thừa"): the shelf is named again at the foot, over the
        // articles it shares.
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} aria-hidden className="shrink-0 text-neutral-500" />
            Đăng ngày: {dateFormat.format(article.publishedAt)}
          </span>
          {updated ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden className="shrink-0 text-neutral-500" />
              Cập nhật: {dateFormat.format(updated)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Eye size={13} aria-hidden className="shrink-0 text-neutral-500" />
            Lượt xem: {article.views.toLocaleString("vi-VN")}
          </span>
        </p>
      }
    >
      {/* The article and the trail above it, for crawlers (the owner's SEO
          review, 13/10/2026): dates, author and the wiki it sits in. */}
      {indexable ? (
        <>
          <JsonLd
            data={articleJsonLd({
              headline: article.title,
              description: article.excerpt,
              image: article.thumbnailUrl,
              datePublished: article.publishedAt,
              dateModified: article.updatedAt,
              path: `/docs/${article.slug}`,
              brandName,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Trang chủ", path: "/" },
              { name: "Wiki & Hướng dẫn", path: "/docs" },
              { name: article.title },
            ])}
          />
        </>
      ) : null}
      {/* The body as wide as a product page's description (the owner,
          02/10/2026: "nó phải đồng bộ giống với trang sản phẩm chứ"), so a
          picture set to 100% in the editor is the same size on both. The
          cover, the lock and the empty notice keep to the same 72ch: the
          cover had 768px and stood 41px past the words (18/10/2026, "rà soát
          ... cho đồng bộ"). From lg the "Mục lục" takes the right, which
          stood empty beside them. */}
      <div className={showOutline ? "lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12" : undefined}>
        <article>
          <div className={`relative mb-8 aspect-[16/9] ${column} overflow-hidden rounded-2xl border border-white/10 bg-black/40`}>
            <Image
              src={article.thumbnailUrl}
              alt=""
              fill
              sizes={old ? "(min-width: 768px) 768px, 100vw" : "(min-width: 768px) 728px, 100vw"}
              // The article's LCP image, so the one fetched at High.
              preload
              fetchPriority="high"
              className="object-cover"
            />
          </div>

          {locked && tool && access ? (
            <div className={column}>
              <DocsLockPanel
                access={access}
                productHref={productHref(tool.category.slug, tool.slug)}
                loginHref={`/login?next=${encodeURIComponent(`/docs/${article.slug}`)}`}
                what="Bài viết này"
              />
            </div>
          ) : article.body ? (
            // Editor-era bodies are HTML, sanitized inside DocHtml before they
            // reach the reader; legacy plain-text bodies keep the old renderer.
            isHtmlBody(article.body) ? (
              <DocHtml body={article.body} outlined={showOutline} squareShots={old} />
            ) : (
              <DocBody body={article.body} />
            )
          ) : (
            // Said to the reader, not to whoever runs the database.
            <div className={`${column} space-y-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center`}>
              <FileText size={24} className="mx-auto text-neutral-600" aria-hidden />
              <p className="text-sm font-bold text-white">Bài viết đang được cập nhật</p>
              <p className="text-xs text-neutral-400">Shop đang soạn nội dung cho bài này, bạn quay lại sau nhé.</p>
            </div>
          )}
        </article>
        {showOutline ? <DocOutline headings={outline} /> : null}
      </div>

      {/* The shelf's other articles, as menzu ends one with "Cùng chuyên mục"
          — cards in the site's own dress, each with its "Chi tiết". */}
      {related.length > 0 ? (
        <section className="mt-14 border-t border-white/10 pt-10">
          {/* As menzu heads it (the owner, 02/10/2026: "1 đó đi", "bỏ |"):
              an open book in a tinted square instead of the bar, the
              heading, and which shelf the cards come from under it. */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]"
            >
              <BookOpen size={17} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold leading-tight text-white">
                {tool ? "Cùng tài liệu tool" : "Cùng chuyên mục"}
              </h2>
              <p className="mt-0.5 text-[13px] text-neutral-400">
                {tool
                  ? `Các trang khác trong tài liệu ${tool.name ?? tool.code}`
                  : `Các bài viết khác thuộc danh mục ${shelf}`}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={docHref(item.slug)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/10 hover:bg-white/[0.04]"
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
                    {/* The head's calendar and eye, so the cards read the
                        facts the way the article above them does (the
                        owner, 02/10/2026: "cho nó đồng bộ"). */}
                    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-neutral-500 sm:text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} aria-hidden className="shrink-0" />
                        {dateFormat.format(item.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Eye size={12} aria-hidden className="shrink-0" />
                        {item.views.toLocaleString("vi-VN")}
                      </span>
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

/**
 * "Mục lục": the article's h2s down the right from lg, where the page stood
 * empty beside a body kept to a product description's width (18/10/2026,
 * "rà soát ... cho đồng bộ", "làm hết"). Plain anchors, held in view while
 * the article scrolls; the headings stop clear of the fixed header
 * (scroll-margin in globals.css).
 */
function DocOutline({ headings }: { headings: DocHeading[] }) {
  return (
    <nav aria-label="Mục lục" className="hidden lg:block">
      <div className="sticky top-32">
        <p className="text-[13px] font-semibold text-white">Mục lục</p>
        <ol className="mt-3 space-y-0.5 border-l border-line">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className="-ml-px block border-l border-transparent py-1.5 pl-3 text-[13px] leading-snug text-neutral-400 transition-colors hover:border-[var(--menzu-accent)] hover:text-white"
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
