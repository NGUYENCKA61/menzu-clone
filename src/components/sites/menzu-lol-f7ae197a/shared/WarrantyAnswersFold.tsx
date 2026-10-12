"use client";

import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * The report's line with the second round's answers folded behind a word at
 * its right end. One line where there were three (the fault, a rule, a fold
 * control under it): the buyer wrote these answers and reads them once, the
 * desk reads them on its own screen (the owner, 12/10/2026: "nhìn có rối quá
 * không" → the one-line form, "làm thử"). A client piece only for the
 * toggle; what it folds is drawn by the page and passed in.
 */
export function WarrantyAnswersFold({
  count,
  lead,
  children,
}: {
  /** How many answers wait behind the word. */
  count: number;
  /** The line's own content: the fault, an older report's chip, a recording. */
  lead: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {lead}
        </div>
        <button
          type="button"
          onClick={() => setOpen((now) => !now)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          Thông tin đã bổ sung
          <span className="text-neutral-500">({count} mục)</span>
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
