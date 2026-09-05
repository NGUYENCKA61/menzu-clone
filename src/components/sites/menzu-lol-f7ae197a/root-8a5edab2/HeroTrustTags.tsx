import { Lock, RotateCcw, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

/**
 * Four short promises under the hero's buttons: undetected, delivered at
 * once, paid safely, refunded without a fight. The shop chose the four; the
 * wording is theirs to change here.
 *
 * Each one is a small bordered card — the same dark glass the reseller badge
 * above the heading wears, with softer corners — so the row reads as part of
 * the hero's chrome and not as a fourth line of copy. They pack as chips
 * and wrap two-and-two inside the copy column.
 */
const TAGS: { icon: LucideIcon; text: string; color: string }[] = [
  { icon: ShieldCheck, text: "Không bị phát hiện", color: "text-emerald-400" },
  { icon: Zap, text: "Giao hàng tức thì", color: "text-cyan-400" },
  { icon: Lock, text: "Thanh toán an toàn", color: "text-sky-400" },
  { icon: RotateCcw, text: "Hoàn tiền dễ dàng", color: "text-blue-400" },
];

export function HeroTrustTags() {
  return (
    <ul className="flex flex-wrap gap-2">
      {TAGS.map(({ icon: Icon, text, color }) => (
        <li
          key={text}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-bold text-neutral-200"
        >
          <Icon size={14} aria-hidden className={`shrink-0 ${color}`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
