import { Lock, RotateCcw, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

/**
 * Four short promises under the hero's scroll cue: undetected, delivered at
 * once, paid safely, refunded without a fight. The shop chose the four; the
 * wording is theirs to change here.
 *
 * Deliberately quiet — small muted text, no box, only the icons in colour —
 * so the row sits under the cue without taking the video's spotlight, which
 * an earlier boxed version did.
 */
const TAGS: { icon: LucideIcon; text: string; color: string }[] = [
  { icon: ShieldCheck, text: "Không bị phát hiện", color: "text-emerald-400" },
  { icon: Zap, text: "Giao hàng tức thì", color: "text-cyan-400" },
  { icon: Lock, text: "Thanh toán an toàn", color: "text-sky-400" },
  { icon: RotateCcw, text: "Hoàn tiền dễ dàng", color: "text-blue-400" },
];

export function HeroTrustTags() {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:flex sm:items-center sm:gap-6">
      {TAGS.map(({ icon: Icon, text, color }) => (
        <li
          key={text}
          className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-neutral-400"
        >
          <Icon size={13} aria-hidden className={`shrink-0 ${color}`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
