import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Edits a wiki article's prose.
 *
 * Only title, excerpt and body are writable. Slug, dates and view counts stay
 * put: the slug is a published URL, and letting an editor rewrite a view count
 * would turn a measurement into a decoration.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    title?: string;
    excerpt?: string;
    body?: string;
  } | null;

  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: "Thiếu slug bài viết" }, { status: 400 });

  const existing = await db.docArticle.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });

  const title = body?.title?.trim();
  if (title !== undefined && title.length === 0) {
    return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });
  }

  // Empty body means "not written yet", which the article page renders as an
  // explicit empty state and marks noindex. Storing "" instead of null would
  // publish a blank page as if it were finished.
  const prose = body?.body?.trim();
  const excerpt = body?.excerpt?.trim();

  const updated = await db.docArticle.update({
    where: { slug },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body?.excerpt !== undefined ? { excerpt: excerpt || null } : {}),
      ...(body?.body !== undefined ? { body: prose || null } : {}),
    },
  });

  return NextResponse.json({
    slug: updated.slug,
    hasBody: updated.body !== null,
  });
}
