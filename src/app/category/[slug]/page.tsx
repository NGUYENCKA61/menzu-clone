import { permanentRedirect } from "next/navigation";

import { categoryHref } from "@/lib/routes";

/**
 * /category/hack-pubg → /hack-pubg.
 *
 * The extra segment said nothing: there is one kind of thing at that address
 * and its own name already identifies it. Redirecting rather than deleting
 * keeps the links that were published under the old shape working, and the
 * redirect is permanent because the move is.
 *
 * No lookup: an unknown slug is passed straight through to the new address,
 * where the category page answers 404 for it. Checking here would only make
 * the same 404 arrive one request earlier.
 */
export default async function LegacyCategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const raw = (await params).slug;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    /* keep the raw value */
  }
  permanentRedirect(categoryHref(slug));
}
