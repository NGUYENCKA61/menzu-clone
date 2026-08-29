import { notFound, permanentRedirect } from "next/navigation";

import { resolveProduct } from "@/lib/queries";
import { productHref } from "@/lib/routes";

/**
 * The address tools used to live at, kept alive as a signpost.
 *
 * /software/HACKPUBG01 was the stock code in public, which said nothing to a
 * customer and nothing to a search engine. It now answers with a permanent
 * redirect to /hack-pubg/hack-pubg-ban-desync, so every link already written —
 * a bookmark, a message, an indexed result — keeps working and tells whoever
 * follows it that the address moved for good.
 *
 * A code nobody sells any more still 404s: a redirect to a page that is not
 * there would only move the dead end one hop further along.
 */
export const dynamic = "force-dynamic";

export default async function LegacySoftwareRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    // A malformed escape is looked up as typed rather than throwing.
  }

  const found = await resolveProduct({ code });
  if (!found) notFound();
  permanentRedirect(productHref(found.categorySlug, found.slug));
}
