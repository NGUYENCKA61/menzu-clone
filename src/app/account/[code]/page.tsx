import { notFound, permanentRedirect } from "next/navigation";

import { resolveProduct } from "@/lib/queries";
import { productHref } from "@/lib/routes";

/**
 * The address accounts used to live at, kept alive as a signpost.
 *
 * Same reasoning as the software one beside it: /account/ĐÂS was a stock code
 * in public — percent-escaped into nonsense the moment it carried Vietnamese
 * letters — and now answers with a permanent redirect to the account's place
 * in its category.
 */
export const dynamic = "force-dynamic";

export default async function LegacyAccountRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const raw = (await params).code;
  let code = raw;
  try {
    // "ĐÂS" arrives as "%C4%90%C3%82S"; a malformed escape is used as typed.
    code = decodeURIComponent(raw);
  } catch {
    /* keep the raw value */
  }

  const found = await resolveProduct({ code });
  if (!found) notFound();
  permanentRedirect(productHref(found.categorySlug, found.slug));
}
