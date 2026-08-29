"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ChevronRight, KeyRound, X } from "lucide-react";
import { useState } from "react";

import { AssistantChat } from "./AssistantChat";

export interface SupportChannel {
  id: string;
  label: string;
  url: string;
  iconUrl: string;
}

/**
 * Floating support panel pinned to the bottom-right, on every page.
 *
 * It used to be a list of links and nothing else — the shop's handles, plus
 * the 2FA tool. Now the panel answers: the assistant handles the two questions
 * the shop was answering by hand all day, which is what to buy and why it will
 * not run, and the human channels stay underneath it for everything it cannot
 * do. Order matters here — the assistant replies at once and the admin does
 * not, so the thing that replies goes first, and the handoff is one tap away
 * rather than the only option.
 *
 * Channels come from the same BioLink rows /bio renders — they are one phone
 * number and one set of handles, and keeping a second copy in source would
 * guarantee the two drift apart.
 */
export function SupportWidget({
  channels,
  assistant,
}: {
  channels: SupportChannel[];
  /** False when the shop has set no API key: the panel falls back to links. */
  assistant: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // /bio is a standalone link-in-bio card with no site chrome — the live page
  // carries no widget, and these same channels are already its whole content.
  if (pathname === "/bio") return null;

  // The admin area is staff-side: nobody in there needs customer care, and the
  // bubble floats exactly over the bottom-right corner every admin table puts
  // its paging controls in.
  if (pathname.startsWith("/admin")) return null;

  return (
    // pointer-events-none on the frame, restored on each real control below.
    // The frame is as tall as the collapsed panel plus the tab, and the panel
    // inside it passes clicks through rather than swallowing them, which means
    // they land on the frame instead. Anything the page puts in that corner
    // became unclickable: the paging buttons on the admin lists sit there.
    <div className="fixed bottom-0 right-4 z-[101] hidden sm:flex flex-col items-end pointer-events-none">
      <div
        className={`w-[340px] mb-0 origin-bottom transition-all duration-300 ${
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
        <div className="rounded-2xl border border-white/10 bg-[#101114] shadow-2xl overflow-hidden mb-2">
          <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5">
            <div>
              <p className="text-sm font-black text-white">
                {assistant ? "Trợ lý AI" : "Hỗ trợ khách hàng"}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {assistant
                  ? "Tư vấn sản phẩm & hướng dẫn cài đặt"
                  : "Phản hồi trong vòng 5 phút"}
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

          {assistant ? <AssistantChat /> : null}

          {/* The handoff. Labelled only when the assistant is above it, where
              the heading is what says these are people rather than more bot. */}
          <div className="p-2 space-y-1 border-t border-white/5">
            {assistant ? (
              <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Nhắn trực tiếp cho admin
              </p>
            ) : null}

            <Link
              href="/2fa"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span className="w-9 h-9 shrink-0 rounded-xl bg-[var(--menzu-accent)]/10 border border-[var(--menzu-accent)]/30 text-[var(--menzu-accent)] flex items-center justify-center">
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

      {/* The tab wore Messenger's blue, copied from the captured site — the one
          blue on a red-and-black page, and the brightest thing on it. It now
          wears the shop's accent like every other primary control. */}
      <div className="bg-[#1a1b20] px-[6px] pt-[6px] pb-0 rounded-t-[14px] pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] text-white px-6 py-2.5 rounded-t-[10px] flex items-center justify-center gap-2.5 transition-colors min-w-[220px]"
        >
          <Bot size={16} />
          <span className="font-bold text-[14px] whitespace-nowrap">
            {assistant ? "Trợ lý AI" : "Chăm sóc khách hàng"}
          </span>
        </button>
      </div>
    </div>
  );
}
