"use client";

import { useState } from "react";
import {
  CreditCard,
  Headphones,
  HelpCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { FaqEntry } from "@/lib/settings";

/**
 * One icon per seat, in the order the shop's five stock questions come —
 * safety, speed, payment, support, updates — then a question mark for any
 * the admin adds past them. Icons follow position, not wording, so an
 * edited question keeps a sensible mark.
 */
const ICONS: LucideIcon[] = [ShieldCheck, Zap, CreditCard, Headphones, RefreshCw];

/**
 * The questions as lmarket.net stacks them: one card per question, the
 * icon in a small tile on the left, a plus on the right that turns into a
 * cross as the answer unfolds. The first is open on arrival so the block
 * never reads as a list of closed doors; opening one closes the rest.
 *
 * The answer's height animates with the grid-rows trick — 0fr to 1fr — so
 * it slides open without measuring anything. The answers are in the page
 * whether open or not, which is what keeps the FAQPage markup honest.
 */
export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((entry, index) => {
        const Icon = ICONS[index] ?? HelpCircle;
        const isOpen = open === index;
        return (
          <div
            key={`${entry.q}-${index}`}
            className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
              isOpen
                ? "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/[0.04]"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : index)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  isOpen
                    ? "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]"
                    : "border-white/10 bg-white/[0.03] text-neutral-400"
                }`}
              >
                <Icon size={16} aria-hidden />
              </span>
              <span
                className={`flex-1 text-sm font-semibold transition-colors sm:text-[15px] ${
                  isOpen ? "text-[var(--menzu-accent)]" : "text-white"
                }`}
              >
                {entry.q}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-[transform,color,border-color,background-color] duration-300 ${
                  isOpen
                    ? "rotate-45 border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]"
                    : "border-white/15 text-neutral-400"
                }`}
              >
                <Plus size={14} aria-hidden />
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="whitespace-pre-line pb-5 pl-[4.5rem] pr-5 text-sm leading-relaxed text-neutral-400">
                  {entry.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
