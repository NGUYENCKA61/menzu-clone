import { FaqAccordion as HomeFaqAccordion } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqAccordion";
import { shelfTitle } from "@/lib/displayCase";
import { faqJsonLd, JsonLd } from "@/lib/seo";
import { faqEntries, type CategorySeoCopy } from "@/lib/seoCopy";

import { FaqAccordion } from "./FaqAccordion";
import { SectionHeading } from "./SectionHeading";

/**
 * The written half of a category page: an intro about the shelf and its
 * FAQ, from content/seo/categories.json (lib/seoCopy.ts), under the grids
 * and only on page one. Draws nothing for a shelf the file does not cover,
 * so an uncovered page is exactly the page it was.
 *
 * The intro is HTML and goes in with dangerouslySetInnerHTML: the loader's
 * INTRO_ALLOWED pattern is the sanitizer, and it admits nothing but <p>,
 * strong, em and root-relative links. The FAQ keeps every answer in the
 * DOM (FaqAccordion folds them with CSS), which is what lets the FAQPage
 * markup beside it describe what the reader can see. One FAQPage per page:
 * the home page's stays on "/".
 *
 * The heading names the shelf in sentence case, as the title over the grid
 * does ("Về HACK DELTA FORCE MỚI" sat under "Hack delta force mới"), and the
 * questions are the home page's and the wiki's accordion, the wiki's quieter
 * one without the icon tiles, which also keeps every answer in the DOM
 * (19/10/2026, "đồng bộ với trang chủ"). `old` is the lab's ?ban=cu.
 */
export function CategorySeoSection({
  copy,
  categoryName,
  old = false,
}: {
  copy: CategorySeoCopy | null;
  categoryName: string;
  /** LAB: ?ban=cu, the section as it was before 19/10/2026. */
  old?: boolean;
}) {
  if (!copy) return null;
  const faq = faqJsonLd(copy.faq);

  return (
    <section id="gioi-thieu" className="mt-12 border-t border-white/10 pt-10">
      <SectionHeading>Về {old ? categoryName : shelfTitle(categoryName)}</SectionHeading>
      <div className="doc-prose doc-prose-even mt-5" dangerouslySetInnerHTML={{ __html: copy.intro }} />

      <SectionHeading className="mt-10">Câu hỏi thường gặp</SectionHeading>
      <div className="mt-5">
        {old ? <FaqAccordion entries={faqEntries(copy)} /> : <HomeFaqAccordion items={copy.faq} plain />}
      </div>
      {faq ? <JsonLd data={faq} /> : null}
    </section>
  );
}
