"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

export interface DrawerItem {
  label: string;
  icon: LucideIcon;
}

export interface DrawerGroup {
  label: string;
  items: DrawerItem[];
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: DrawerGroup[];
}

/**
 * Off-canvas navigation drawer, shown below the `lg` breakpoint.
 * Live site keeps both the backdrop and the panel mounted at all times and
 * toggles them purely with classes:
 *   backdrop  closed: `opacity-0 pointer-events-none`     open: `opacity-100`
 *   panel     closed: `-translate-x-full`                 open: `translate-x-0`
 */
export function MobileDrawer({ open, onClose, groups }: MobileDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

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
        className={
          open
            ? "fixed inset-y-0 left-0 z-[9999] w-72 bg-[#111111] shadow-2xl flex flex-col transition-transform duration-300 transform-gpu lg:hidden translate-x-0"
            : "fixed inset-y-0 left-0 z-[9999] w-72 bg-[#111111] shadow-none flex flex-col transition-transform duration-300 transform-gpu lg:hidden -translate-x-full"
        }
      >
        <div className="p-5 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <span className="navbar-spin-ring absolute inset-[-2px] rounded-full border border-transparent border-t-red-500 animate-spin-slow" />
              <Image
                src="/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/logos/menzu-logo.webp"
                alt="Menzu"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black italic tracking-tighter text-white">
                MENZU
              </span>
              <span className="text-[8px] font-bold tracking-[0.2em] text-red-500 uppercase">
                Valorant
              </span>
            </div>
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-0.5 menzu-scroll-x select-none">
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

                {isOpen && (
                  <div className="flex flex-col pb-1">
                    {group.items.map(({ label, icon: Icon }) => (
                      <a
                        key={label}
                        href="#"
                        className="flex items-center gap-3 py-2.5 pl-10 pr-6 text-neutral-400 hover:text-white hover:bg-white/[0.02] transition-colors"
                      >
                        <Icon size={13} className="text-neutral-500 shrink-0" />
                        <span className="text-[11px] font-semibold tracking-wide">
                          {label}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* The main bar's plain rung, mirrored for the drawer. Renamed with
              it, and pointed at the same page: a rung that says HỖ TRỢ on a
              phone and opens nothing is worse than no rung.

              onClose because the drawer is not unmounted by a client-side
              navigation — without it the panel stays open over the page it
              just opened. */}
          <div className="flex flex-col">
            <Link
              href="/feedback"
              onClick={onClose}
              className="w-full flex items-center gap-2 py-3 px-6 text-neutral-200 hover:text-white hover:bg-white/[0.02] active:bg-white/[0.05] transition-all text-left text-xs font-bold uppercase tracking-wider"
            >
              HỖ TRỢ
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
