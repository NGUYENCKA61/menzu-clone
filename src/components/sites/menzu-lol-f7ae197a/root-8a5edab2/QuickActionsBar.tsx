import type { LucideIcon } from "lucide-react";
import { Compass, Crosshair, Flame, MessageSquareHeart, PackageSearch } from "lucide-react";

interface QuickAction {
  label: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Check Skin", icon: Crosshair },
  { label: "Feedback", icon: MessageSquareHeart },
  { label: "Build Kho Đồ", icon: PackageSearch },
  { label: "Thu Acc", icon: Flame },
  { label: "Valo Hub", icon: Compass },
];

export function QuickActionsBar() {
  return (
    <div className="w-full mt-4 mb-6 sm:mt-10 sm:mb-14">
      <div className="w-full relative z-10">
        <div className="w-full max-w-3xl mx-auto px-0">
          <div className="relative rounded-[1.25rem] sm:rounded-[2rem] bg-gradient-to-b from-white/[0.06] to-transparent p-[1px] shadow-2xl">
            <div className="w-full bg-[#0d0d12]/95 border border-white/[0.06] rounded-[1.25rem] sm:rounded-[2rem] px-1.5 py-3 sm:px-8 sm:py-4 flex items-center justify-around relative overflow-hidden transform-gpu backdrop-blur-md">
              {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  className="group relative flex flex-col items-center gap-1 sm:gap-1.5 outline-none"
                >
                  <div className="relative flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.07] text-neutral-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all duration-300 group-hover:-translate-y-0.5">
                    <span className="[&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5">
                      <Icon />
                    </span>
                  </div>
                  <span className="text-[7.5px] sm:text-[10px] font-bold tracking-normal sm:tracking-wider uppercase text-neutral-500 whitespace-nowrap group-hover:text-indigo-400 transition-colors duration-300">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
