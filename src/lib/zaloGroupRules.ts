/**
 * The shop's Zalo group, minded by the notice bot (the owner, 12/10/2026:
 * "bot quản lý nhóm zalo, duyệt thêm thành viên, xóa thành viên cảnh báo
 * nếu thành viên spam, thông báo đăng vào nhóm"). The rules live here, with
 * no Zalo and no database in them, so the bot and the tests read the same
 * ones: who gets in, what counts as spam, and what a strike earns.
 */

/** Who the bot lets into the group when somebody asks to join. */
export const ZALO_JOIN_MODES = ["off", "all", "linked", "buyers"] as const;
export type ZaloJoinMode = (typeof ZALO_JOIN_MODES)[number];

export const ZALO_JOIN_MODE_LABEL: Record<ZaloJoinMode, string> = {
  off: "Không tự duyệt (admin duyệt tay)",
  all: "Duyệt tất cả",
  linked: "Chỉ người đã liên kết Zalo với tài khoản web",
  buyers: "Chỉ khách đã mua hàng (có đơn đã thanh toán)",
};

export function readZaloJoinMode(value: unknown): ZaloJoinMode {
  return typeof value === "string" &&
    (ZALO_JOIN_MODES as readonly string[]).includes(value)
    ? (value as ZaloJoinMode)
    : "off";
}

/** "approve" / "refuse" the request, or "leave" it for a human admin. */
export function joinDecision(
  mode: ZaloJoinMode,
  who: { linked: boolean; buyer: boolean },
): "approve" | "refuse" | "leave" {
  if (mode === "off") return "leave";
  if (mode === "all") return "approve";
  if (mode === "linked") return who.linked ? "approve" : "refuse";
  return who.buyer ? "approve" : "refuse";
}

/** "spam, nữa, quảng cáo" → ["spam", "nữa", "quảng cáo"], lower-cased. */
export function parseBadWords(raw: string): string[] {
  return raw
    .split(/[,\n;]/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2);
}

/** The bad word found in the text, or null. Whole text, case-insensitive. */
export function badWordIn(text: string, words: string[]): string | null {
  const hay = text.toLowerCase();
  return words.find((w) => hay.includes(w)) ?? null;
}

const LINK_RE = /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+\.(?:com|net|org|vn|me|io|xyz|top|shop|site|online|club|info|gg|tv|link|co)(?:\/[^\s<>"']*)?/gi;

/** The first link in the text that does not point at the shop, or null. */
export function outsideLinkIn(text: string, allowedHosts: string[]): string | null {
  const allowed = allowedHosts.map((h) => h.toLowerCase().replace(/^www\./, ""));
  for (const match of text.matchAll(LINK_RE)) {
    const raw = match[0];
    const host = raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
    if (!host.includes(".")) continue;
    const ours = allowed.some((a) => host === a || host.endsWith(`.${a}`));
    if (!ours) return raw;
  }
  return null;
}

/** The same words again, give or take spacing and case. */
export function normaliseForRepeat(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export const REPEAT_WINDOW_MS = 60 * 1000;
export const REPEAT_COUNT = 3;
export const FLOOD_WINDOW_MS = 20 * 1000;
export const FLOOD_COUNT = 6;
/** Strikes older than this are forgotten. */
export const STRIKE_MEMORY_MS = 7 * 24 * 60 * 60 * 1000;

export type SpamReason = "link" | "badword" | "repeat" | "flood";

export const SPAM_REASON_LABEL: Record<SpamReason, string> = {
  link: "gửi link ngoài",
  badword: "dùng từ bị cấm",
  repeat: "gửi lặp một nội dung",
  flood: "gửi quá nhiều tin liên tiếp",
};

/**
 * One member's recent messages, as the bot remembers them: enough to tell a
 * repeat and a flood, and nothing older than the windows need.
 */
export class RecentMessages {
  private readonly byUser = new Map<string, { at: number; text: string }[]>();

  /** Records the message and says what, if anything, it is guilty of. */
  note(
    uid: string,
    text: string,
    now: number,
  ): Extract<SpamReason, "repeat" | "flood"> | null {
    const keep = Math.max(REPEAT_WINDOW_MS, FLOOD_WINDOW_MS);
    const list = (this.byUser.get(uid) ?? []).filter((m) => now - m.at <= keep);
    list.push({ at: now, text: normaliseForRepeat(text) });
    this.byUser.set(uid, list);
    const flood = list.filter((m) => now - m.at <= FLOOD_WINDOW_MS).length;
    if (flood >= FLOOD_COUNT) return "flood";
    const same = list.filter(
      (m) => now - m.at <= REPEAT_WINDOW_MS && m.text === normaliseForRepeat(text),
    ).length;
    if (same >= REPEAT_COUNT && normaliseForRepeat(text).length >= 3) return "repeat";
    return null;
  }

  forget(uid: string): void {
    this.byUser.delete(uid);
  }
}

/**
 * What a message earns, in order of certainty: a link out, a banned word,
 * then what the member's recent history says. Null is a clean message.
 */
export function spamReason(
  text: string,
  recent: RecentMessages,
  uid: string,
  now: number,
  rules: { blockLinks: boolean; allowedHosts: string[]; badWords: string[] },
): SpamReason | null {
  if (rules.blockLinks && outsideLinkIn(text, rules.allowedHosts)) return "link";
  if (badWordIn(text, rules.badWords)) return "badword";
  return recent.note(uid, text, now);
}

/** The first strike is a warning; the second within the memory is the door. */
export function strikeAction(priorStrikes: number): "warn" | "remove" {
  return priorStrikes >= 1 ? "remove" : "warn";
}

/** The warning, with the member's name where the mention goes (position 0). */
export function warnText(name: string, reason: SpamReason): string {
  return `@${name} nhóm không cho ${SPAM_REASON_LABEL[reason]}. Lần sau bot sẽ mời ra khỏi nhóm.`;
}

export function removeText(name: string, reason: SpamReason): string {
  return `@${name} đã bị mời ra khỏi nhóm vì ${SPAM_REASON_LABEL[reason]} sau khi đã nhắc.`;
}

/** The welcome, with {name} and {shop} filled in; blank template, no welcome. */
export function welcomeText(
  template: string,
  name: string,
  shop: string,
): string | null {
  const text = template.trim();
  if (!text) return null;
  return text.replace(/\{name\}/g, name).replace(/\{shop\}/g, shop);
}
