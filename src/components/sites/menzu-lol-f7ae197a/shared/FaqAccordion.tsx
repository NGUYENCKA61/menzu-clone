"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Single-open accordion for the "Câu Hỏi Thường Gặp" block.
 *
 * Built on buttons with aria-expanded rather than <details>, because the live
 * design animates the chevron and the panel together and only ever keeps one
 * panel open — behaviour <details> would need scripting to reproduce anyway.
 */
export function FaqAccordion({ entries }: { entries: FaqEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;

        return (
          <div
            key={entry.question}
            className="rounded-2xl border border-zinc-800/80 bg-[#121216] overflow-hidden transition-colors hover:border-zinc-700"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[13px] sm:text-sm font-bold text-white leading-snug">
                {entry.question}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-[var(--menzu-accent)] transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Grid-rows transition animates to the content's natural height,
                which a max-height guess cannot do without clipping long answers. */}
            <div
              id={panelId}
              className={`grid transition-all duration-300 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-xs text-neutral-400 leading-relaxed">
                  {entry.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
