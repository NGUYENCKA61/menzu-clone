import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { categoryHref, productHref } from "@/lib/routes";

import { Breadcrumb } from "./Breadcrumb";
import { SimilarSoftwareStrip } from "./SimilarSoftwareStrip";
import { type SoftwareCardView } from "./SoftwareCard";
import { SoftwareBuyPanel, type SoftwareDetail } from "./SoftwareBuyPanel";
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
  setupGuideAccess,
  statusSubscribed,
  similar,
}: {
  software: SoftwareDetail;
  initialPackageId?: string;
  /** Decided by the route, which knows who is looking. */
  setupGuideAccess: SetupGuideAccess;
  /** Following this tool's status; null for a guest. */
  statusSubscribed: boolean | null;
  /** Other tools for the row at the foot of the page; empty draws no row. */
  similar: SoftwareCardView[];
}) {
  // One stored field, two voices: the rich HTML (if the admin wrote one) goes
  // to the description section in full; every place that prints a sentence —
  // the buy panel's blurb — gets the prose stripped back out of it.
  const richDescription = isHtmlBody(software.description)
    ? software.description
    : null;
  const plainDescription = richDescription
    ? docHtmlToPlainText(richDescription, 220)
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
              wanted air. */}
          <div className="max-w-[1320px] mx-auto px-4 lg:px-6 pt-8">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                {
                  label: software.categoryName,
                  href: categoryHref(software.categorySlug),
                },
                { label: software.name },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
              <SoftwareGallery
                name={software.name}
                images={software.images}
                videoUrl={software.videoUrl}
              />
              <SoftwareBuyPanel
                software={{ ...software, description: plainDescription }}
                initialPackageId={initialPackageId}
                statusSubscribed={statusSubscribed}
              />
            </div>

            <SoftwareDescription
              name={software.name}
              description={plainDescription}
              richHtml={richDescription}
              features={software.features}
              requirements={software.requirements}
              featuresNote={software.featuresNote}
              guideHtml={software.guideHtml}
              setupGuideHtml={software.setupGuideHtml}
              setupGuideAccess={setupGuideAccess}
              refundRate={software.refundRate}
              loginHref={`/login?next=${encodeURIComponent(productHref(software.categorySlug, software.slug))}`}
            />
          </div>
        {/* A rich-editor description is HTML; the card prints a sentence, so
            it gets the prose without the tags — stripped here, on the server,
            because the strip itself runs in the browser. */}
        <SimilarSoftwareStrip
          items={similar.map((s) =>
            isHtmlBody(s.description)
              ? { ...s, description: docHtmlToPlainText(s.description, 180) }
              : s,
          )}
        />
    </>
  );
}
