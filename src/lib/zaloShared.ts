/**
 * The Zalo channel's shared vocabulary: what the web and the bot (bot/zalo)
 * both need, with no server-only imports so the bot can load it under tsx.
 *
 * The owner (12/10/2026): warranty standing and notices sent to each customer
 * on Zalo, from a spare personal account the bot signs in as ("Tôi dùng Zalo
 * phụ"), since the shop has no Official Account. A customer links their Zalo
 * by sending the bot a short code read off the Bảo mật page.
 */

/** No 0/O/1/I: a code is read off one screen and typed into another. */
export const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LINK_CODE_LENGTH = 6;
/** Long enough to open Zalo and type, short enough that a leaked code is nothing. */
export const LINK_CODE_TTL_MS = 15 * 60 * 1000;
/** The word a customer types before the code; "lienket" and "liên kết" both pass. */
export const LINK_WORD = "LIENKET";

/** A fresh code; `pick(max)` draws an index below max (crypto on the server). */
export function makeLinkCodeValue(pick: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += LINK_CODE_ALPHABET[pick(LINK_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * The code in a message the bot received, upper-cased, or null when the
 * message is not a link attempt. "LIENKET ABC234", "liên kết abc234" and
 * "lienket: ABC234" all read; a code with a letter outside the alphabet does
 * not, so a typo is answered with the help text rather than a lookup.
 */
export function readLinkMessage(text: string): string | null {
  const match =
    /^\s*(?:lien\s*ket|liên\s*kết)\s*[:\-]?\s*([A-Za-z0-9]{6})\s*$/iu.exec(
      text,
    );
  if (!match) return null;
  const code = match[1].toUpperCase();
  return [...code].every((c) => LINK_CODE_ALPHABET.includes(c)) ? code : null;
}

/** What the customer sends: the word and the code, as the link card shows it. */
export function linkMessage(code: string): string {
  return `${LINK_WORD} ${code}`;
}

/** A notice as one Zalo message: the title, the body, the page to open. */
export function noticeText(
  title: string,
  body: string,
  url: string | null,
): string {
  return [title, body, url]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join("\n");
}

/** The settings row the bot reports its standing in, read by Admin → Cấu hình. */
export const ZALO_STATE_KEY = "integrations.zalo.state";

export type ZaloBotState = {
  /** Waiting for a scan, signed in and listening, or lost. */
  state: "qr" | "online" | "offline";
  /** While waiting for a scan: where the QR picture is served. */
  qrUrl: string | null;
  /** The account the bot is signed in as, once known. */
  name: string | null;
  /** ISO time of this report. */
  at: string;
  note: string | null;
  /** The groups the account is in, for Cấu hình to name the one to mind. */
  groups?: { id: string; name: string; members: number; admin: boolean }[];
};

export function readZaloBotState(
  raw: string | null | undefined,
): ZaloBotState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ZaloBotState> | null;
    if (
      value &&
      (value.state === "qr" ||
        value.state === "online" ||
        value.state === "offline") &&
      typeof value.at === "string"
    ) {
      return {
        state: value.state,
        qrUrl: typeof value.qrUrl === "string" ? value.qrUrl : null,
        name: typeof value.name === "string" ? value.name : null,
        at: value.at,
        note: typeof value.note === "string" ? value.note : null,
        groups: Array.isArray(value.groups)
          ? value.groups
              .filter(
                (g): g is NonNullable<ZaloBotState["groups"]>[number] =>
                  !!g && typeof g.id === "string" && typeof g.name === "string",
              )
              .map((g) => ({
                id: g.id,
                name: g.name,
                members: Number(g.members) || 0,
                admin: g.admin === true,
              }))
          : undefined,
      };
    }
  } catch {
    // A row somebody edited by hand: no standing, rather than a crash.
  }
  return null;
}

/**
 * A "waiting for a scan" report older than this is a bot that stopped
 * without saying so: a QR expires and is reported anew within two minutes.
 */
export const QR_REPORT_FRESH_MS = 10 * 60 * 1000;

/** The bot's standing as Cấu hình should read it: a stale scan wait is a loss. */
export function settleZaloBotState(
  state: ZaloBotState | null,
  now = Date.now(),
): ZaloBotState | null {
  if (!state || state.state !== "qr") return state;
  if (now - new Date(state.at).getTime() <= QR_REPORT_FRESH_MS) return state;
  return {
    ...state,
    state: "offline",
    qrUrl: null,
    note: "bot không chạy, không báo về nữa",
  };
}

/**
 * The text styles a Zalo message can carry, as zca-js names them (its
 * TextStyle enum), for messages written on the web and sent by the bot: the
 * receipt's title in bold and big, a key in bold red.
 */
export const ZALO_STYLE = {
  bold: "b",
  italic: "i",
  underline: "u",
  red: "c_db342e",
  green: "c_15a85f",
  orange: "c_f27806",
  small: "f_13",
  big: "f_18",
} as const;

/** One styled range of a message, in UTF-16 units of its text. */
export type ZaloStyleRange = { start: number; len: number; st: string };

const KNOWN_STYLES = new Set<string>(Object.values(ZALO_STYLE));

/**
 * The style ranges stored with an outbox row, checked before the bot hands
 * them to Zalo: known styles only, inside the text, at most 200 of them. Null
 * when there are none worth sending, and the message goes out plain.
 */
export function readZaloStyles(
  raw: unknown,
  textLength: number,
): ZaloStyleRange[] | null {
  if (!Array.isArray(raw)) return null;
  const ranges: ZaloStyleRange[] = [];
  for (const item of raw.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const { start, len, st } = item as Record<string, unknown>;
    if (
      typeof start !== "number" ||
      typeof len !== "number" ||
      typeof st !== "string" ||
      !Number.isInteger(start) ||
      !Number.isInteger(len) ||
      start < 0 ||
      len <= 0 ||
      start + len > textLength ||
      !KNOWN_STYLES.has(st)
    ) {
      continue;
    }
    ranges.push({ start, len, st });
  }
  return ranges.length > 0 ? ranges : null;
}
