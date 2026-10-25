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

/**
 * Trang bị: the sections the owner's scanner reads (25/10/2026: "web mình bổ
 * sung thêm mục cho khớp đi"), the game's Chức năng with its three dropdown
 * entries and Chỉ chế độ's two. Chức năng, Zombie and AI lead ("chức năng
 * zombie AI theo 3 thứ tự đó đi còn lại sau cũng đc"). Phần thưởng and
 * fragments are not listed at all.
 */
export const GEAR_GROUPS = ["Chức năng", "Zombie", "Chế độ AI", "Âm thanh", "Búp bê", "Hiệu ứng"];

/** Trang trí: its own tab on the site, as the scanner lists it, with the game's seven entries. */
export const DECOR_GROUPS = ["Emoji", "Killmark", "Kill Log", "Khung nhân vật", "Màu chat", "Bình xịt", "Bảng tên"];

/** The sub-tab's own name, as older lists head it ("[Trang trí]"): decor, under no one entry. */
export const DECOR_TAB = "Trang trí";

export function isDecorGroup(group: string | null): boolean {
  return group !== null && (group === DECOR_TAB || DECOR_GROUPS.includes(group));
}

/** Letters and digits only, no accents: "Búp Bê" and "Màu chát" meet "Búp bê" and "Màu chat". */
const looseGroup = (name: string) =>
  name.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

const CANONICAL = new Map<string, string>([
  ...[...WEAPON_GROUPS, ...CHARACTER_GROUPS, ...GEAR_GROUPS, ...DECOR_GROUPS, DECOR_TAB].map(
    (name) => [looseGroup(name), name] as [string, string],
  ),
  // The scanner's short names for the weapon sections.
  ["chinh", "Vũ khí chính"],
  ["phu", "Vũ khí phụ"],
]);

/**
 * A group as the site spells it, whatever the list wrote: case and accents
 * aside, and the scanner's "Chỉ chế độ → Zombie" is its last part. A name the
 * site does not know comes back as written.
 */
export function canonicalGroup(name: string): string {
  const last = name.split(/→|->|>|:|\s-\s/).pop()!.trim();
  return CANONICAL.get(looseGroup(last)) ?? last;
}

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
      group = header[1]!.trim() ? canonicalGroup(header[1]!) : null;
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
