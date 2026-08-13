"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Headset, KeyRound, X } from "lucide-react";
import { useState } from "react";

export interface SupportChannel {
  id: string;
  label: string;
  url: string;
  iconUrl: string;
}

/**
 * Floating support panel pinned to the bottom-right, on every page.
 *
 * Channels come from the same BioLink rows /bio renders — they are one phone
 * number and one set of handles, and keeping a second copy in source would
 * guarantee the two drift apart.
 */
export function SupportWidget({ channels }: { channels: SupportChannel[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // /bio is a standalone link-in-bio card with no site chrome — the live page
  // carries no widget, and these same channels are already its whole content.
  if (pathname === "/bio") return null;

  return (
    // pointer-events-none on the frame, restored on each real control below.
    // The frame is as tall as the collapsed panel plus the tab — roughly
    // 300×400 at the bottom right of every page — and the panel inside it
    // passes clicks through rather than swallowing them, which means they land
    // on the frame instead. Anything the page puts in that corner became
    // unclickable: the paging buttons on the admin lists sit exactly there.
    <div className="fixed bottom-0 right-4 z-[101] hidden sm:flex flex-col items-end pointer-events-none">
      <div
        className={`w-[300px] mb-0 origin-bottom transition-all duration-300 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        // Hidden from the tree when collapsed so Tab does not land inside it.
        aria-hidden={!open}
        // A boolean, not "": React 19 reads an empty string as false, so the
        // panel was never actually inert while collapsed.
        inert={!open}
      >
        <div className="rounded-2xl border border-white/10 bg-[#12141c] shadow-2xl overflow-hidden mb-2">
          <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5">
            <div>
              <p className="text-sm font-black text-white">Hỗ trợ khách hàng</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Phản hồi trong vòng 5 phút
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="shrink-0 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-2 space-y-1">
            <Link
              href="/2fa"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <KeyRound size={16} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-neutral-200 group-hover:text-white transition-colors">
                  Tạo Mã 2FA
                </span>
                <span className="text-[11px] text-neutral-500">Trình tạo mã OTP</span>
              </span>
              <ChevronRight size={14} className="ml-auto text-neutral-600 shrink-0" />
            </Link>

            {channels.map((channel) => (
              <a
                key={channel.id}
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                <span className="w-9 h-9 shrink-0 rounded-xl bg-white/5 flex items-center justify-center">
                  <Image
                    src={channel.iconUrl}
                    alt=""
                    width={18}
                    height={18}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </span>
                <span className="text-[13px] font-semibold text-neutral-200 group-hover:text-white transition-colors truncate">
                  {channel.label}
                </span>
                <ChevronRight size={14} className="ml-auto text-neutral-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#24282f] px-[6px] pt-[6px] pb-0 rounded-t-[14px] pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="bg-[#12a6f9] hover:bg-[#0e96e6] text-[#111111] px-6 py-2.5 rounded-t-[10px] flex items-center justify-center gap-2.5 transition-colors min-w-[220px]"
        >
          <Headset size={16} />
          <span className="font-bold text-[14px] whitespace-nowrap">
            Chăm sóc khách hàng
          </span>
        </button>
      </div>
    </div>
  );
}
