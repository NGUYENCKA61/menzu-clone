import {
  Crosshair,
  Flame,
  Home,
  MessageSquareHeart,
  User,
  type LucideIcon,
} from "lucide-react";

interface NavEntry {
  label: string;
  icon: LucideIcon;
}

const NAV_ENTRIES: NavEntry[] = [
  { label: "Trang Chủ", icon: Home },
  { label: "Check Skin", icon: Crosshair },
  { label: "Thu Acc", icon: Flame },
  { label: "Feedback", icon: MessageSquareHeart },
  { label: "Profile", icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0a0a0d]">
      <div className="grid grid-cols-5 h-16">
        {NAV_ENTRIES.map(({ label, icon: Icon }, index) => (
          <a
            key={label}
            href="#"
            className={
              index === 0
                ? "flex flex-col items-center justify-center gap-1 text-indigo-400 hover:text-indigo-400 transition-colors"
                : "flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-indigo-400 transition-colors"
            }
          >
            <Icon size={18} />
            <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
              {label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
