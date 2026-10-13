import type { NextRequest } from "next/server";

import { resolveProduct } from "@/lib/queries";
import { productHref } from "@/lib/routes";
import { productBehindOldSlug } from "@/lib/slugHistory";

/**
 * The old PHP shop's buy page, /huong-dan/<product-slug>, kept alive as a
 * signpost to the product's page here.
 *
 * Despite the name ("guide"), this was where the PHP site sold a tool, so it
 * goes to the product, not to /tai-lieu. The product slugs carried over 1:1,
 * trailing dashes included; only the category is missing from the old
 * address, and that is in the database, which is why this is a handler and
 * not a line in next.config.ts beside the other old shapes.
 *
 * A route handler rather than a page on purpose (the owner's SEO review,
 * 13/10/2026): a handler does not stream, so it answers with a real 308 or a
 * real 404. Under [categorySlug] the same URL used to answer 200 with a meta
 * refresh, because the loading skeleton had already gone out before the
 * redirect was known. The static "huong-dan" segment wins over
 * [categorySlug], and "huong-dan" is a reserved slug so no category can take
 * it back.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const raw = (await params).slug;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // A malformed escape is looked up as typed rather than throwing.
  }

  // The same two lookups the product page makes: the live slug first, then
  // the slug history, so a product renamed since the PHP days still lands.
  const found = (await resolveProduct({ slug })) ?? (await productBehindOldSlug(slug));
  // An empty segment would turn the address into //slug, which a browser
  // reads as another host; neither can be empty in the database, but a
  // redirect is the wrong place to find out.
  if (!found || !found.categorySlug || !found.slug) return notFoundResponse();

  // Encoded per segment so the Location header stays ASCII whatever the slug
  // holds; the query string (a ?ref= share code) is carried across as is.
  const target =
    productHref(encodeURIComponent(found.categorySlug), encodeURIComponent(found.slug)) +
    request.nextUrl.search;
  // A relative Location, like the config redirects: behind the reverse proxy
  // the host this process sees is not the one the visitor typed.
  return new Response(null, { status: 308, headers: { Location: target } });
}

/**
 * A real 404 with a page a person can use. A handler cannot draw the site's
 * not-found screen, and a blank page is a dead end for a visitor who
 * followed an old link, so it says what happened and offers the way back.
 */
function notFoundResponse(): Response {
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Không tìm thấy sản phẩm | THICHTHIHACK</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1015;color:#e5e5e5;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px;box-sizing:border-box}
main{max-width:420px;text-align:center}
h1{margin:0 0 8px;font-size:20px;color:#fff}
p{margin:0 0 20px;font-size:14px;line-height:1.6;color:#a3a3a3}
a{display:inline-block;margin:4px;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none}
.go{background:#E13D3F;color:#fff}
.alt{border:1px solid rgba(255,255,255,.15);color:#e5e5e5}
</style>
</head>
<body>
<main>
<h1>Không tìm thấy sản phẩm</h1>
<p>Sản phẩm ở link cũ này không còn bán hoặc đã đổi địa chỉ.</p>
<a class="go" href="/">Về trang chủ</a>
<a class="alt" href="/categories">Xem danh mục</a>
</main>
</body>
</html>
`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
