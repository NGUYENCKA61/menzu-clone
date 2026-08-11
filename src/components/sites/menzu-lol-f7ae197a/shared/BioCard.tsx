"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export interface BioLinkView {
  id: string;
  label: string;
  sublabel: string | null;
  url: string;
  iconUrl: string;
  page: number;
}

export interface BioCardProps {
  name: string;
  tagline: string | null;
  avatarUrl: string;
  links: BioLinkView[];
}

/**
 * Link-in-bio card with the two-panel slider the live page uses.
 *
 * Both panels are always mounted and the track is translated, rather than
 * swapping the visible set — that is what lets the slide animate at all, and
 * it keeps the card's height stable between panels.
 */
export function BioCard({ name, tagline, avatarUrl, links }: BioCardProps) {
  const [panel, setPanel] = useState(0);

  const pages = [1, 2].map((page) => links.filter((link) => link.page === page));
  const hasSecondPanel = pages[1]!.length > 0;

  return (
    <main className="w-full max-w-md mx-auto flex flex-col justify-center items-center relative z-10 py-4">
      <div className="w-full px-6 pt-5 pb-7 rounded-3xl bg-[#0b0c10]/95 backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col items-center min-h-[550px] justify-between">
        <div className="text-center flex flex-col items-center select-none w-full mb-5">
          <div className="relative inline-block shrink-0 rounded-full p-[2px] border-[2.5px] border-[#0866FF] mb-3 bg-[#0b0c10]/80">
            <div className="w-16 h-16 rounded-full overflow-hidden relative">
              <Image src={avatarUrl} alt={name} fill sizes="64px" className="object-cover" />
            </div>
          </div>

          <h1 className="text-sm font-extrabold text-white tracking-widest uppercase leading-none mb-1">
            {name}
          </h1>
          {tagline ? (
            <p className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase mb-4">
              {tagline}
            </p>
          ) : (
            <div className="mb-4" />
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>

        <div className="w-full overflow-hidden relative flex-1">
          <div
            className="flex w-[200%] h-full transition-transform duration-500 ease-out transform-gpu"
            style={{ transform: `translateX(${panel === 0 ? "0" : "-50%"})` }}
          >
            {pages.map((pageLinks, index) => (
              <div
                key={index}
                className={`w-1/2 shrink-0 flex flex-col space-y-3 ${index === 0 ? "pr-1.5" : "pl-1.5"}`}
                // Panels off-screen must not be reachable by Tab.
                aria-hidden={panel !== index}
                {...(panel !== index ? { inert: "" as unknown as boolean } : {})}
              >
                {pageLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/btn relative overflow-hidden transform-gpu flex items-center justify-between w-full p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)] active:scale-[0.98]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                    <span className="flex items-center space-x-3.5 relative z-10">
                      <span className="p-2.5 rounded-xl bg-white/5 flex items-center justify-center w-10 h-10 shrink-0 relative">
                        <Image
                          src={link.iconUrl}
                          alt=""
                          width={20}
                          height={20}
                          className="h-5 w-5 object-contain"
                        />
                      </span>
                      <span className="text-left">
                        <span className="block text-xs font-bold text-white uppercase tracking-wider">
                          {link.label}
                        </span>
                        {link.sublabel ? (
                          <span className="block text-[10px] text-neutral-400 font-medium mt-0.5">
                            {link.sublabel}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <ChevronRight
                      size={16}
                      className="text-neutral-600 group-hover/btn:text-neutral-300 group-hover/btn:translate-x-0.5 transition-all relative z-10"
                    />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {hasSecondPanel ? (
          <div className="flex items-center gap-2 mt-5">
            {[0, 1].map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPanel(index)}
                aria-label={`Trang ${index + 1}`}
                aria-current={panel === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  panel === index ? "w-6 bg-white" : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
