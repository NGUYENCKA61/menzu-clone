/**
 * The white admin app's formatting kit (30/10/2026 rebuild). A sibling of
 * crm/format.ts, deliberately NOT imported from there: the CRM is planned to
 * move to its own VPS one day, and the shop admin must not lose its helpers
 * when that folder goes.
 */

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** "vừa xong", "5 phút", "3 giờ", "2 ngày" — triage time, not bookkeeping. */
export function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày`;
  return `${Math.floor(days / 30)} tháng`;
}

/** The shop's clock, never the browser's: Việt Nam, 24h. */
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Two letters for the avatar circle. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters =
    words.length >= 2 ? words[0]![0]! + words[words.length - 1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * A stable pastel per name, the same palette as the CRM's, so a customer
 * keeps one colour whichever desk the owner reads them on.
 */
const AVATAR_TONES = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-slate-200 text-slate-700",
];

export function avatarTone(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}
