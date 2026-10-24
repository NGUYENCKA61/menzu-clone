/**
 * CrossFire's own inventory sub-tabs, in the game's order (the owner's
 * screenshots of 25/10/2026: "làm thêm một lựa chọn phụ đi", menzu's "All
 * Skin" chip row with the game's groups). An account page's tab offers
 * "Tất cả" and then whichever of these its items fall in.
 *
 * Client-safe: plain lists and text helpers, no data behind them.
 */
export const ALL_GROUPS = "Tất cả";

/** Vũ khí: worked out from each weapon's name (lib/cfWeaponGroup). */
export const WEAPON_GROUPS = ["Vũ khí chính", "Vũ khí phụ", "Cận chiến", "Lựu đạn"];

/** Nhân vật: one per item kind, AGENT, COSTUME and ACCESSORY. */
export const CHARACTER_GROUPS = ["Nhân vật", "Trang phục", "Phụ kiện"];

/** Trang bị: as the shop heads its list in the admin ("[Chức năng]"). */
export const GEAR_GROUPS = ["Vật phẩm tuần", "Chức năng", "Chỉ chế độ", "Trang trí", "Phần thưởng", "Skin"];

/** A "[Group]" line in an admin list: the names under it belong to that group. */
const HEADER = /^\[(.*)\]$/;

export function isGroupHeader(line: string): boolean {
  return HEADER.test(line.trim());
}

/**
 * An admin list's lines as names with their groups. A "[Group]" line heads
 * the names below it until the next one; "[]" ends a group; names above any
 * header have none.
 */
export function parseGroupedLines(lines: string[]): { name: string; group: string | null }[] {
  let group: string | null = null;
  const out: { name: string; group: string | null }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const header = HEADER.exec(line);
    if (header) {
      group = header[1]!.trim() || null;
      continue;
    }
    out.push({ name: line, group });
  }
  return out;
}

/** The reverse of parseGroupedLines: a header line wherever the group changes. */
export function groupedLines(rows: { name: string; group: string | null }[]): string[] {
  const lines: string[] = [];
  let group: string | null = null;
  for (const row of rows) {
    if (row.group !== group) {
      lines.push(`[${row.group ?? ""}]`);
      group = row.group;
    }
    lines.push(row.name);
  }
  return lines;
}
