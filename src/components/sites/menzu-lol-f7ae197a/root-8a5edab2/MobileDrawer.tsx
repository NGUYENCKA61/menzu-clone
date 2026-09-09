"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { lockScroll, trapTab, unlockScroll } from "@/components/sites/menzu-lol-f7ae197a/shared/modalChrome";

export interface DrawerItem {
  label: string;
  icon: LucideIcon;
  /** Where it goes; "#" for a destination the clone does not have yet. */
  href: string;
}

export interface DrawerGroup {
  label: string;
  items: DrawerItem[];
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: DrawerGroup[];
  brandName: string;
  brandLogo: string;
}

/**
 * Off-canvas navigation drawer, shown below the `lg` breakpoint.
 * Live site keeps both the backdrop and the panel mounted at all times and
 * toggles them purely with classes:
 *   backdrop  closed: `opacity-0 pointer-events-none`     open: `opacity-100`
 *   panel     closed: `-translate-x-full`                 open: `translate-x-0`
 */
export function MobileDrawer({ open, onClose, groups, brandName, brandLogo }: MobileDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const brandWord = brandName.trim().split(" ")[0] || brandName;
  const panel = useRef<HTMLDivElement>(null);

  // While the drawer is out it owns the page, like every other overlay: the
  // page behind it stops scrolling, Escape closes it, and Tab stays inside.
  // It had none of the three — a swipe on the menu scrolled the shop behind
  // it, and Tab walked straight out into the page it covered.
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panel.current) trapTab(panel.current, event);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={
          open
            ? "fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300 lg:hidden opacity-100"
            : "fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300 lg:hidden opacity-0 pointer-events-none"
        }
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // The panel stays mounted off-screen when closed (that is how it
        // slides), so it is made inert too, or Tab could reach its links.
        aria-hidden={!open}
        inert={!open}
        className={
          open
            ? "fixed inset-y-0 left-0 z-[9999] w-72 bg-[#111111] shadow-2xl flex flex-col transition-transform duration-300 transform-gpu lg:hidden translate-x-0"
            : "fixed inset-y-0 left-0 z-[9999] w-72 bg-[#111111] shadow-none flex flex-col transition-transform duration-300 transform-gpu lg:hidden -translate-x-full"
        }
      >
        <div className="p-5 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <span className="navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 animate-spin-slow" />
              <Image
                src={brandLogo}
                alt={brandWord}
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black italic tracking-tighter text-white">
                {brandWord}
              </span>
              <span className="text-[8px] font-bold tracking-[0.2em] text-red-500 uppercase">
                hack là thích
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain py-3 space-y-0.5 menzu-scroll-x select-none">
          {groups.map((group) => {
            const isOpen = expanded === group.label;
            return (
              <div key={group.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : group.label)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between py-3 px-6 text-neutral-200 hover:text-white hover:bg-white/[0.02] active:bg-white/[0.05] transition-all text-left text-xs font-bold uppercase tracking-wider"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {/* grid-template-rows 0fr→1fr is the one way to open to a
                    real, unmeasured height; the rows stay mounted and are
                    made inert while closed so Tab cannot reach them. */}
                <div
                  aria-hidden={!isOpen}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-col pb-1">
                      {group.items.map(({ label, icon: Icon, href }) => (
                        // Closed on the press: the header lives in the layout
                        // and survives the navigation, so the drawer would
                        // otherwise still be open over the new page.
                        <Link
                          key={label}
                          href={href}
                          onClick={onClose}
                          className="flex items-center gap-3 py-2.5 pl-10 pr-6 text-neutral-400 hover:text-white hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors"
                        >
                          <Icon size={13} className="text-neutral-500 shrink-0" />
                          <span className="text-[11px] font-semibold tracking-wide">
                            {label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </>
  );
}
