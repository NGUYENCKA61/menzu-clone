/**
 * A name typed in capitals, shown with only its first letter capital (the
 * owner, 13/10/2026: "mấy cái card trang chủ bỏ in hoa thử… chỉ in hoa chữ
 * đầu"): "HACK ĐỘT KÍCH CFVN - CF4VN" reads "Hack đột kích CFVN - CF4VN".
 *
 * Only words typed wholly in capitals are lowered, so a word the admin typed
 * in mixed case ("Counter Strike") keeps it. A word with a digit (CS2, MW3,
 * BO6) and the shop's usual acronyms stay in capitals: lowered, they read as
 * typos. The stored name is never changed; this is how a card prints it.
 */

const KEEP_UPPER = new Set([
  "CFVN",
  "PUBG",
  "GTA",
  "COD",
  "CODM",
  "LOL",
  "VN",
  "PC",
  "ESP",
  "HWID",
  "NFA",
  "DMA",
  "TFT",
  "FPS",
  "NBA",
  "AI",
  "VIP",
  "OBS",
  "RCS",
]);

const SPECIAL: Record<string, string> = { IOS: "iOS" };

export function sentenceCase(raw: string): string {
  let first = true;
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(/([\p{L}\p{N}.]+)/u)
    .map((token) => {
      if (!/[\p{L}\p{N}]/u.test(token)) return token;
      const typedInCaps = token === token.toLocaleUpperCase("vi-VN");
      let out: string;
      if (!typedInCaps || /\d/.test(token)) out = token;
      else if (SPECIAL[token]) out = SPECIAL[token];
      else if (KEEP_UPPER.has(token)) out = token;
      else out = token.toLocaleLowerCase("vi-VN");
      if (first) {
        first = false;
        out = out.charAt(0).toLocaleUpperCase("vi-VN") + out.slice(1);
      }
      return out;
    })
    .join("");
}
