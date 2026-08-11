"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Mail,
  Search,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

interface ToolItem {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const TOOL_ITEMS: ToolItem[] = [
  { title: "Check Skin Valo", subtitle: "Kiểm tra kho đồ", icon: Search },
  { title: "Valorant Build", subtitle: "Tạo cấu hình súng", icon: Wrench },
  { title: "Tìm Bạn Chơi Game", subtitle: "Mọi mức rank", icon: Users },
  { title: "Thư Welcome", subtitle: "Check mail đăng ký", icon: Mail },
];

export function ToolsRail() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={
        collapsed
          ? "fixed left-0 top-1/2 -translate-y-1/2 z-50 hidden sm:flex flex-col gap-3 select-none font-sans transition-all duration-300 transform-gpu bg-[#0c0d12]/95 border-r border-t border-b border-white/[0.08] p-3 rounded-r-2xl backdrop-blur-md w-[200px] -translate-x-full"
          : "fixed left-0 top-1/2 -translate-y-1/2 z-50 hidden sm:flex flex-col gap-3 select-none font-sans transition-all duration-300 transform-gpu bg-[#0c0d12]/95 border-r border-t border-b border-white/[0.08] p-3 rounded-r-2xl backdrop-blur-md w-[200px] translate-x-0"
      }
    >
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity">
          <Compass size={13} className="text-violet-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">
            CÔNG CỤ
          </span>
        </div>
        <button
          type="button"
          className="p-1 hover:bg-white/5 hover:text-white rounded text-neutral-400 transition-colors"
          aria-label="Thu gọn"
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 h-[246px]">
        {TOOL_ITEMS.map(({ title, subtitle, icon: Icon }) => (
          <a
            key={title}
            href="#"
            className="group relative flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-violet-500/[0.04] hover:border-violet-500/30 hover:z-10 transition-colors"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.04] group-hover:border-violet-500/20 group-hover:bg-violet-500/5 text-amber-400 group-hover:text-violet-300 transition-colors shrink-0">
              <Icon size={16} />
            </div>
            <div className="flex flex-col items-start justify-center text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200 group-hover:text-white transition-colors whitespace-nowrap">
                {title}
              </span>
              <span className="text-[9px] text-neutral-500 group-hover:text-neutral-400 transition-colors whitespace-nowrap">
                {subtitle}
              </span>
            </div>
          </a>
        ))}
      </div>

      <button
        type="button"
        className="absolute left-full top-1/2 -translate-y-1/2 w-5 h-16 bg-[#0c0d12]/95 border-r border-t border-b border-white/[0.08] hover:bg-[#161620] rounded-r-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        aria-label="Mở rộng"
        onClick={() => setCollapsed(false)}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
