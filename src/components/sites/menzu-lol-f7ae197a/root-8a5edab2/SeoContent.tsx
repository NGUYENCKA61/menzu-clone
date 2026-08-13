import { ChevronDown } from "lucide-react";

import { JsonLd, faqJsonLd } from "@/lib/seo";
import type { FaqEntry } from "@/lib/settings";

interface SeoContentProps {
  heading: string;
  body: string;
  faq: FaqEntry[];
}

/**
 * The block of prose at the foot of the home page, and the questions under it.
 *
 * Written in Cấu hình → Cấu hình trang chủ and rendered as text, never as
 * markup: it is typed by a person into a textarea, and a shop that pastes in
 * something with a tag in it should see the tag, not run it. Blank lines start
 * new paragraphs, which is the one piece of formatting a textarea can express.
 *
 * The questions use <details>, so they open and close with no JavaScript and
 * their answers are in the page whether or not anyone clicks — which is what
 * makes the FAQPage markup below honest.
 */
export function SeoContent({ heading, body, faq }: SeoContentProps) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  // Nothing configured, nothing rendered — not an empty heading over a rule.
  if (!heading && paragraphs.length === 0 && faq.length === 0) return null;

  const schema = faqJsonLd(faq);

  return (
    <section className="w-full border-t border-white/[0.07] pt-10">
      {schema ? <JsonLd data={schema} /> : null}

      {heading ? (
        <h2 className="text-lg font-black uppercase tracking-wider text-white sm:text-xl">
          {heading}
        </h2>
      ) : null}

      {paragraphs.length > 0 ? (
        <div className="mt-4 flex max-w-[820px] flex-col gap-3">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[13.5px] leading-relaxed text-neutral-400">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {faq.length > 0 ? (
        <div className="mt-8 flex max-w-[820px] flex-col gap-2">
          {faq.map((entry) => (
            <details
              key={entry.q}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white marker:hidden">
                {entry.q}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-neutral-400">
                {entry.a}
              </p>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
