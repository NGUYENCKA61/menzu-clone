/**
 * The CrossFire wiki's VIP System badges for VIP 1 to 8, in
 * public/images/cf/vip. The game goes no higher, so a level outside that
 * range has no badge and keeps its number.
 */
export function vipBadge(level: number): string | null {
  return Number.isInteger(level) && level >= 1 && level <= 8 ? `/images/cf/vip/vip-${level}.webp` : null;
}
