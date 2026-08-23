import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { docHtmlIsEmpty, isHtmlBody, sanitizeDocHtml } from "@/lib/docHtml";

const DOC_CATEGORIES = ["FAQ", "WARRANTY", "GUIDE"] as const;
type DocCategoryValue = (typeof DOC_CATEGORIES)[number];

/** New articles borrow their shelf's stock picture — the editor has no
 *  thumbnail uploader, and the column is required. */
const DEFAULT_THUMB: Record<DocCategoryValue, string> = {
  FAQ: "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/docs/fa.webp",
  WARRANTY: "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/docs/CSBHMENZU.webp",
  GUIDE: "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/docs/checkwc.webp",
};

/** "Chính Sách Đổi Trả" → "chinh-sach-doi-tra". */
function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Creates a wiki article. The slug is minted here from the title and never
 * changes afterwards — it becomes a published URL the moment the body lands.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const payload = (await request.json().catch(() => null)) as {
    title?: string;
    category?: string;
    excerpt?: string;
    body?: string;
  } | null;

  const title = payload?.title?.trim();
  if (!title) return NextResponse.json({ error: "Nhập tiêu đề bài viết" }, { status: 400 });
  if (title.length > 150) {
    return NextResponse.json({ error: "Tiêu đề tối đa 150 ký tự" }, { status: 400 });
  }

  const category = payload?.category;
  if (!DOC_CATEGORIES.includes(category as DocCategoryValue)) {
    return NextResponse.json({ error: "Chọn nhóm bài viết" }, { status: 400 });
  }
  const kind = category as DocCategoryValue;

  // Mint a unique slug: the title's slug, then -2, -3… if the shelf already
  // holds that name.
  const base = slugify(title) || "bai-viet";
  let slug = base;
  for (let n = 2; await db.docArticle.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }

  const created = await db.docArticle.create({
    data: {
      slug,
      title,
      category: kind,
      excerpt: payload?.excerpt?.trim() || null,
      body: payload?.body?.trim() || null,
      thumbnailUrl: DEFAULT_THUMB[kind],
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ slug: created.slug });
}

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
  // publish a blank page as if it were finished. HTML from the editor is
  // sanitized before it lands — the render side sanitizes again, but the
  // database should never hold what the allowlist rejects.
  const rawProse = body?.body?.trim();
  const prose =
    rawProse && isHtmlBody(rawProse)
      ? (() => {
          const clean = sanitizeDocHtml(rawProse);
          return docHtmlIsEmpty(clean) ? "" : clean;
        })()
      : rawProse;
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
