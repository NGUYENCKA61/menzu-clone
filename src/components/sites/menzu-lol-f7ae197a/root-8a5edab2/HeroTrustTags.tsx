import { Lock, RotateCcw, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

/**
 * Four short promises under the hero's buttons: undetected, delivered at
 * once, paid safely, refunded without a fight. The shop chose the four; the
 * wording is theirs to change here.
 *
 * Two by two, so the block keeps the copy column's width instead of
 * wrapping three-and-one; small muted text with only the icons in colour,
 * so it supports the red button above it rather than competing with it.
 */
const TAGS: { icon: LucideIcon; text: string; color: string }[] = [
  { icon: ShieldCheck, text: "Không bị phát hiện", color: "text-emerald-400" },
  { icon: Zap, text: "Giao hàng tức thì", color: "text-cyan-400" },
  { icon: Lock, text: "Thanh toán an toàn", color: "text-sky-400" },
  { icon: RotateCcw, text: "Hoàn tiền dễ dàng", color: "text-blue-400" },
];

export function HeroTrustTags() {
  return (
    <ul className="grid w-fit grid-cols-2 gap-x-6 gap-y-2.5">
      {TAGS.map(({ icon: Icon, text, color }) => (
        <li
          key={text}
          className="flex items-center gap-2 whitespace-nowrap text-[12px] font-bold text-neutral-300"
        >
          <Icon size={14} aria-hidden className={`shrink-0 ${color}`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
