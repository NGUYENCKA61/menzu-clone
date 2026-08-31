/**
 * Reading a status change out of a chat message.
 *
 * The shop already announces detection state in its Telegram channel; this is
 * what lets that message BE the update instead of something to copy into the
 * admin desk afterwards. Pure, so the parsing can be tested without a bot.
 *
 * The shape is deliberately forgiving, because it has to survive being typed
 * on a phone: the tool's code first, then a word for the state, then anything
 * else as the note. Case and Vietnamese accents are ignored.
 *
 *   VALTOOL01 detected Đang vá, chờ 24h
 *   #valtool01 die
 *   VALTOOL01 undetected
 */

export type ParsedStatus = "UNDETECTED" | "DETECTED" | "UPDATING";

export interface StatusCommand {
  productCode: string;
  status: ParsedStatus;
  /** Whatever followed the state word; empty string when nothing did. */
  note: string;
}

/** The words the shop actually types, mapped to the three states. */
const WORDS: Record<string, ParsedStatus> = {
  undetected: "UNDETECTED",
  undetect: "UNDETECTED",
  ok: "UNDETECTED",
  safe: "UNDETECTED",
  live: "UNDETECTED",
  ngon: "UNDETECTED",
  antoan: "UNDETECTED",

  detected: "DETECTED",
  detect: "DETECTED",
  die: "DETECTED",
  ban: "DETECTED",
  bannd: "DETECTED",
  dinh: "DETECTED",
  phathien: "DETECTED",

  updating: "UPDATING",
  update: "UPDATING",
  fix: "UPDATING",
  fixing: "UPDATING",
  baotri: "UPDATING",
  dangcapnhat: "UPDATING",
  capnhat: "UPDATING",
};

/** Lowercased, accents dropped, everything but letters and digits removed. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * The command a message carries, or null when it carries none.
 *
 * Null is the ordinary answer: the channel is a channel, and most of what is
 * posted there is conversation. Anything that is not clearly an instruction is
 * left alone rather than guessed at — a wrong guess here changes what every
 * customer sees on the shop front.
 */
export function parseStatusCommand(raw: string | null | undefined): StatusCommand | null {
  if (!raw) return null;
  const words = raw.trim().split(/\s+/);
  if (words.length < 2) return null;

  // The code may be written with a leading # so it reads as a tag in chat.
  const productCode = words[0]!.replace(/^#/, "").trim().toUpperCase();
  if (!/^[A-Z0-9._-]{2,32}$/.test(productCode)) return null;

  // The state can be more than one word — "an toàn", "bảo trì", "đang cập
  // nhật" — so the longest run that matches wins and the note is what is left
  // after it. Trying the short one first would read "an toàn" as an unknown
  // word and give up.
  for (let span = 3; span >= 1; span -= 1) {
    if (words.length < 1 + span) continue;
    const status = WORDS[fold(words.slice(1, 1 + span).join(""))];
    if (!status) continue;
    return { productCode, status, note: words.slice(1 + span).join(" ").trim() };
  }
  return null;
}
