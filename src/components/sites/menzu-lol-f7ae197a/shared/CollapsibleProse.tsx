"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";

/**
 * A long write-up shown as its opening lines with "Xem thêm" (the owner,
 * 26/10/2026, on a category's "Về …": "ẩn bớt"). The whole text stays in the
 * page, so search engines and screen readers still get all of it; only its
 * height is held back until the reader opens it. The button is the home
 * rows' "Xem thêm" / "Thu gọn".
 */
export function CollapsibleProse({ html, className }: { html: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col items-start gap-3">
      <div id={id} className={open ? undefined : "relative max-h-[7.5rem] overflow-hidden"}>
        <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
        {open ? null : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background to-transparent"
          />
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex h-10 items-center gap-2 rounded-[10px] bg-raise px-4 text-[14px] font-semibold text-frost ring-1 ring-inset ring-line transition-colors hover:ring-line-strong"
      >
        {open ? "Thu gọn" : "Xem thêm"}
        {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
    </div>
  );
}
