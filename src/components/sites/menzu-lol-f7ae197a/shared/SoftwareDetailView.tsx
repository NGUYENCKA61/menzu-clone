import { MobileBottomNav } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/MobileBottomNav";
import { SiteFooter } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteFooter";
import { SiteHeader } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/SiteHeader";
import { ConnectRailSection } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ConnectRailSection";
import { ScrollCta } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ScrollCta";
import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { categoryHref, productHref } from "@/lib/routes";

import { Breadcrumb } from "./Breadcrumb";
import { CardBoundary } from "./CardBoundary";
import { SoftwareCard, type SoftwareCardView } from "./SoftwareCard";
import { SoftwareBuyPanel, type SoftwareDetail } from "./SoftwareBuyPanel";
import {
  DESCRIPTION_SECTION_ID,
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
  const richDescription = isHtmlBody(software.description) ? software.description : null;
  const plainDescription = richDescription
    ? docHtmlToPlainText(richDescription, 220)
    : software.description;

  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-clip selection:bg-[var(--menzu-accent)]/30">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trang chủ", path: "/" },
          { name: software.categoryName, path: categoryHref(software.categorySlug) },
          { name: software.name },
        ])}
      />
      <div className="w-full shrink-0 h-[104px]" />
      <SiteHeader />

      <main className="flex-1 relative z-20 w-full flex flex-col">
        <div className="w-full">
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

            {/* The same cue the home page's hero carries, in normal flow here
                rather than pinned to a corner. */}
            <div className="mt-12 flex justify-center">
              <ScrollCta targetId={DESCRIPTION_SECTION_ID} label="Xem chi tiết" placement="" />
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
        </div>
        {/* The same tiles the category shelf uses, so a reader who got here
            from search and found the wrong build has the right one a scroll
            away instead of a click back and a hunt. */}
        {similar.length > 0 ? (
          <section
            aria-labelledby="similar-software-heading"
            className="max-w-[1320px] mx-auto w-full px-4 lg:px-6 pb-16"
          >
            <h2
              id="similar-software-heading"
              className="mb-5 text-lg sm:text-xl font-black uppercase tracking-wider text-white"
            >
              Sản phẩm tương tự
            </h2>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
              {similar.map((s) => (
                <CardBoundary key={s.code}>
                  <SoftwareCard
                    software={
                      isHtmlBody(s.description)
                        ? { ...s, description: docHtmlToPlainText(s.description, 180) }
                        : s
                    }
                  />
                </CardBoundary>
              ))}
            </div>
          </section>
        ) : null}
        <SiteFooter />
      </main>

      <ConnectRailSection />
      <MobileBottomNav />
    </div>
  );
}
