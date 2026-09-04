import Link from "next/link";
import { Lock, Radio, RotateCcw, Zap, type LucideIcon } from "lucide-react";

import { STATUS_TAB_HREF } from "@/lib/softwareStatus";

/**
 * Four reasons to relax, at the foot of the hero where the scroll cue used
 * to sit: the visitor reads the banner, reads these, and scrolls on their own.
 *
 * Each one is something the shop actually does, phrased so it stays true on
 * a bad day: the status board is updated around the clock (it does not say
 * every tool is clean), keys are delivered the moment the wallet is charged,
 * payment is by bank transfer with a code and never by card details typed
 * here, and a refund can be asked for from the order. The two that lead
 * somewhere are links.
 */
const TAGS: { icon: LucideIcon; text: string; color: string; href?: string }[] = [
  {
    icon: Radio,
    text: "Trạng thái cập nhật 24/7",
    color: "text-emerald-400",
    href: STATUS_TAB_HREF,
  },
  { icon: Zap, text: "Giao key tức thì", color: "text-cyan-400" },
  { icon: Lock, text: "Thanh toán an toàn", color: "text-sky-400" },
  { icon: RotateCcw, text: "Hỗ trợ hoàn tiền", color: "text-blue-400", href: "/docs" },
];

export function HeroTrustTags() {
  return (
    <div className="absolute bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 sm:bottom-5 sm:w-auto">
      <ul className="grid grid-cols-2 gap-x-5 gap-y-2 rounded-2xl border border-white/10 bg-[#0d0d12]/85 px-4 py-2.5 backdrop-blur-md sm:flex sm:items-center sm:gap-6 sm:rounded-full sm:px-6">
        {TAGS.map(({ icon: Icon, text, color, href }) => (
          <li
            key={text}
            className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold text-neutral-200"
          >
            <Icon size={14} aria-hidden className={`shrink-0 ${color}`} />
            {href ? (
              <Link href={href} className="transition-colors hover:text-white">
                {text}
              </Link>
            ) : (
              <span>{text}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
