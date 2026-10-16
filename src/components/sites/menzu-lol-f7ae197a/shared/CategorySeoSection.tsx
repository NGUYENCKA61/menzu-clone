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
 */
export function CategorySeoSection({
  copy,
  categoryName,
}: {
  copy: CategorySeoCopy | null;
  categoryName: string;
}) {
  if (!copy) return null;
  const faq = faqJsonLd(copy.faq);

  return (
    <section id="gioi-thieu" className="mt-12 border-t border-white/10 pt-10">
      <SectionHeading>Về {categoryName}</SectionHeading>
      <div className="doc-prose mt-5" dangerouslySetInnerHTML={{ __html: copy.intro }} />

      <SectionHeading className="mt-10">Câu hỏi thường gặp</SectionHeading>
      <div className="mt-5">
        <FaqAccordion entries={faqEntries(copy)} />
      </div>
      {faq ? <JsonLd data={faq} /> : null}
    </section>
  );
}
