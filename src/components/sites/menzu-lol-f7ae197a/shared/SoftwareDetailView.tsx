import { docHtmlIsEmpty, docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import type { FreeToolPanel } from "@/lib/freeKeyRules";
import type { RelatedGuides } from "@/lib/relatedGuides";
import { categoryHref, productHref, toolDocsHref } from "@/lib/routes";

import { Breadcrumb } from "./Breadcrumb";
import { FreeKeyPanel } from "./FreeKeyPanel";
import { SimilarSoftwareStrip } from "./SimilarSoftwareStrip";
import { type SoftwareCardView } from "./SoftwareCard";
import {
  type BuyerLevel,
  SoftwareBuyPanel,
  type SoftwareDetail,
} from "./SoftwareBuyPanel";
import {
  SoftwareDescription,
  type SetupGuideAccess,
} from "./SoftwareDescription";
import { SoftwareGallery } from "./SoftwareGallery";

/**
 * One tool's page, whole.
 *
 * Lifted out of the route so that the address — /{category}/{product} — and
 * what is drawn at it are separate concerns: the route resolves a slug to a
 * product and decides between the two shapes a product can take, and this
 * draws the one it picked.
 */
export function SoftwareDetailView({
  software,
  initialPackageId,
  initialQuantity,
  setupGuideAccess,
  statusSubscribed,
  similar,
  guides = null,
  free = null,
  viewer,
  old = false,
}: {
  software: SoftwareDetail;
  initialPackageId?: string;
  /** From `?sl=` — the quantity a guest had set before the login gate. */
  initialQuantity?: number;
  /** Decided by the route, which knows who is looking. */
  setupGuideAccess: SetupGuideAccess;
  /** Following this tool's status; null for a guest. */
  statusSubscribed: boolean | null;
  /** Other tools for the row at the foot of the page; empty draws no row. */
  similar: SoftwareCardView[];
  /** "Hướng dẫn liên quan" for the description section; null draws none. */
  guides?: RelatedGuides | null;
  /**
   * Set for a free tool: the panel then hands out a key instead of selling
   * tiers (the owner, 12/10/2026). Decided by the route, which knows the
   * reader and the shop's shortlink setup.
   */
  free?: FreeToolPanel | null;
  /** Who is looking, for a tool sold to level 2 only. */
  viewer: BuyerLevel;
  /** LAB: ?ban=cu, the page's pill, "Hướng dẫn liên quan" and the similar
   *  strip as they were before 19/10/2026. */
  old?: boolean;
}) {
  // The long write-up belongs to the description section alone: the rich HTML
  // (if the admin wrote one) in full, or the plain sentence behind the name.
  // The line under the title is the shop's own "Mô tả ngắn" (`summary`), and
  // is no longer lifted from the opening of this.
  // An empty editor body ("<p></p>", which 24 tools carry) is no write-up:
  // it used to print as a blank rich section, and the opening line read the
  // name alone. Now it falls through to the summary (the SEO review, round
  // 2, T5).
  const richDescription =
    isHtmlBody(software.description) && !docHtmlIsEmpty(software.description)
      ? software.description
      : null;
  const plainDescription = richDescription
    ? docHtmlToPlainText(richDescription, 220)
    : isHtmlBody(software.description)
      ? ""
      : software.description;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          {
            name: software.categoryName,
            path: categoryHref(software.categorySlug),
          },
          { name: software.name },
        ])}
      />
          {/* The breadcrumb otherwise starts on the exact pixel the fixed
              header ends, with nothing between them. The gap goes on the
              container rather than on Breadcrumb itself, which is shared with
              every other page and should not gain a margin because this one
              wanted air. product-top is a hook for the light trial "moi"
              (theme-light.css, part 6); it carries no style of its own. */}
          <div className="product-top max-w-[1320px] mx-auto px-4 lg:px-6 pt-8">
            {/* TRIAL: 32px under the trail on a product page from sm, level
                with the 31px above it; other pages keep 24px (the owner,
                27/10/2026: "xem lại khoảng cách này có quá hẹp", then the
                category page shown: only here). */}
            <Breadcrumb
              margin="mb-6 sm:mb-8"
              items={[
                { label: "Trang chủ", href: "/" },
                {
                  label: software.categoryName,
                  href: categoryHref(software.categorySlug),
                },
                { label: software.name },
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
              <SoftwareGallery
                name={software.name}
                images={software.images}
                videoUrl={software.videoUrl}
              />
              {free ? (
                <FreeKeyPanel
                  software={software}
                  signedIn={free.signedIn}
                  loginHref={free.loginHref}
                  gated={free.gated}
                  downloadUrl={free.downloadUrl}
                  today={free.today}
                  old={old}
                />
              ) : (
                <SoftwareBuyPanel
                  software={software}
                  initialPackageId={initialPackageId}
                  initialQuantity={initialQuantity}
                  statusSubscribed={statusSubscribed}
                  viewer={viewer}
                  old={old}
                />
              )}
            </div>

            <SoftwareDescription
              name={software.name}
              description={plainDescription || software.summary}
              richHtml={richDescription}
              guides={guides}
              features={software.features}
              requirements={software.requirements}
              featuresNote={software.featuresNote}
              guideHtml={software.guideHtml}
              setupGuideHtml={software.setupGuideHtml}
              setupGuideAccess={setupGuideAccess}
              docsHref={toolDocsHref(software.slug)}
              refundRate={software.refundRate}
              loginHref={`/login?next=${encodeURIComponent(productHref(software.categorySlug, software.slug))}`}
              old={old}
            />
          </div>
        {/* A tool's own reviews stood here until the owner took them off the
            page: it ran long and busy, and buyers read reviews on /feedback
            and on the home page, where they still are. */}
        {/* A rich-editor description is HTML; the card prints a sentence, so
            it gets the prose without the tags — stripped here, on the server,
            because the strip itself runs in the browser. */}
        <SimilarSoftwareStrip
          items={similar.map((s) =>
            isHtmlBody(s.description)
              ? { ...s, description: docHtmlToPlainText(s.description, 180) }
              : s,
          )}
          old={old}
        />
    </>
  );
}
