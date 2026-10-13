import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  children: ReactNode;
  /** Goes on the heading itself, so `aria-labelledby` can point at it. */
  id?: string;
  /** Goes on the row, for the margin the caller's layout wants around it. */
  className?: string;
  as?: "h2" | "h3";
}

/**
 * An in-page section heading: the thin red bar and the uppercase title the
 * home rows open with (ProductRow), at the same sizes, so a section reads as
 * one on every storefront page (the owner, 13/10/2026, UI consistency
 * review). Page titles are a different thing and keep SimplePage's header
 * with its accent icon.
 */
export function SectionHeading({
  children,
  id,
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        aria-hidden
        className="w-[3px] h-5 bg-[var(--menzu-accent)] rounded-full shrink-0"
      />
      <Tag
        id={id}
        className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
      >
        {children}
      </Tag>
    </div>
  );
}
