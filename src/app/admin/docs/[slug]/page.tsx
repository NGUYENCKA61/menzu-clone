import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminDocEditor } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminDocEditor";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { isHtmlBody, plainToDocHtml } from "@/lib/docHtml";

export const metadata: Metadata = { title: "Soạn bài viết | Quản trị" };
export const dynamic = "force-dynamic";

/** Route params arrive percent-encoded; slugs are ASCII today, but the decode
 *  costs nothing and the /account/[code] bug is still fresh. */
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** The wiki desk for one article: identity card, editor, live preview. */
export default async function AdminDocEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const slug = decodeSlug((await params).slug);
  const doc = await db.docArticle.findUnique({ where: { slug } });
  if (!doc) notFound();

  // Legacy plain-text bodies are lifted to editor HTML here, on the server —
  // the client bundle never carries the converter or the sanitizer.
  const initialHtml = doc.body
    ? isHtmlBody(doc.body)
      ? doc.body
      : plainToDocHtml(doc.body)
    : "";

  return (
    <AdminShell
      title={doc.title}
      subtitle="Soạn nội dung bài viết Wiki"
      username={admin.username}
      aside={
        <Link
          href="/admin/docs"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Danh sách bài viết
        </Link>
      }
    >
      <AdminDocEditor
        initialHtml={initialHtml}
        doc={{
          slug: doc.slug,
          title: doc.title,
          category: doc.category,
          excerpt: doc.excerpt,
          body: doc.body,
          views: doc.views,
          publishedAt: doc.publishedAt.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        }}
      />
    </AdminShell>
  );
}
