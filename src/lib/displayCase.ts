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
  // Tool and build names in the shop's product titles (14/10/2026, the light
  // trial "moi" prints product names through this): "BẢN MS RAGE",
  // "CS2 HVH SPIN BOT", "BẢN OBV PRIVATE", "BẢN VAC AIM", "CFVN PRV",
  // "BẢN PV TK", "BẢN AC PRIVATE", "BẢN VS FULL", "CN MEMORY", and the
  // shop's own name.
  "MS",
  "HVH",
  "OBV",
  "VAC",
  "PRV",
  "PV",
  "TK",
  "AC",
  "VS",
  "CN",
  "THICHTHIHACK",
  // LAB: hardware and service acronyms that appear in titles and guides.
  "BIOS", "UEFI", "TPM", "CPU", "GPU", "RAM", "SSD", "HDD", "USB", "AMD", "SVM", "VT",
  "OTP", "VPN", "IP", "QR", "DMCA", "FAQ", "CTV", "SMS", "API", "URL", "ID", "UID", "VNĐ",
  "HUD", "FOV", "PVP", "PVE", "MMR", "NPC", "EAC",
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

/** Proper names that keep their capital inside a sentence. */
const PROPER = new Set([
  "Telegram", "Facebook", "Zalo", "Discord", "Android", "Windows", "Defender", "Secure",
  "Boot", "Core", "Isolation", "Welcome", "VietQR", "Steam", "TikTok", "YouTube", "Valorant",
]);

/**
 * LAB: a label typed in Title Case ("Nạp Qua Ngân Hàng") shown in sentence case
 * ("Nạp qua ngân hàng"), proper names and acronyms kept. For display only:
 * the typed label may be a key elsewhere.
 */
export function softTitle(raw: string): string {
  const s = sentenceCase(raw);
  const words = s.split(" ");
  if (words.length < 2) return s;
  const titled = words.every((w) => /^\p{Lu}/u.test(w) || !/\p{L}/u.test(w));
  if (!titled) return s;
  return words
    .map((w, i) =>
      i === 0 || PROPER.has(w) || KEEP_UPPER.has(w) || w === w.toLocaleUpperCase("vi-VN")
        ? w
        : w.charAt(0).toLocaleLowerCase("vi-VN") + w.slice(1),
    )
    .join(" ");
}

/** English joining words that stay small inside a game's name ("Call of Duty"). */
const SMALL_WORDS = new Set(["of", "and", "the"]);

/**
 * LAB: a name typed in capitals shown with every word's first letter capital
 * (the owner, 17/10/2026: "mấy cái tiêu đề hack game cho viết hoa chữ cái đầu
 * đi"): "HACK ĐỘT KÍCH CFVN - CF4VN" reads "Hack Đột Kích CFVN - CF4VN".
 * Built on sentenceCase, so acronyms, words with a digit and words typed in
 * mixed case come out as they do there; "iOS" keeps its small i, and "of"
 * stays small after the first word.
 */
/**
 * LAB: a game's name without the word "Mới" (the owner, 17/10/2026: "cái nào
 * có ghi chữ Mới bỏ chữ Mới đi"): "HACK BLOOD STRIKE - MỚI" reads "HACK BLOOD
 * STRIKE", "HACK VALORANT MỚI" reads "HACK VALORANT". A dash left hanging
 * goes with it. The stored name keeps the word; the tiles print it without.
 */
export function withoutNewWord(raw: string): string {
  const out = raw
    .normalize("NFC")
    .replace(/(?<![\p{L}\p{N}])mới(?![\p{L}\p{N}])/giu, " ")
    .replace(/\s+/g, " ")
    .replace(/\s[-–|:](?=\s[-–|:]\s)/gu, "")
    .replace(/(\s[-–|:])+\s*$/u, "")
    .replace(/^\s*[-–|:]\s/u, "")
    .trim();
  return out || raw.trim();
}

export function titleCase(raw: string): string {
  const special = new Set(Object.values(SPECIAL));
  return sentenceCase(raw)
    .split(" ")
    .map((w, i) =>
      (i > 0 && SMALL_WORDS.has(w)) || special.has(w)
        ? w
        : w.replace(/\p{L}/u, (c) => c.toLocaleUpperCase("vi-VN")),
    )
    .join(" ");
}

/**
 * A category's name as its tile on the home page prints it (ProductRow:
 * titleCase over withoutNewWord), for every place the category page names its
 * shelf (the owner, 23/10/2026: "vậy giống card danh mục đi").
 * "HACK ĐỘT KÍCH CFVN - CF4VN" reads "Hack Đột Kích CFVN - CF4VN", "HACK
 * DELTA FORCE MỚI" reads "Hack Delta Force".
 */
export function shelfTitle(raw: string): string {
  return titleCase(withoutNewWord(raw));
}

/**
 * A title with no-break spaces where a line must not break (the owner,
 * 25/10/2026: "xử lý ngắt dòng 3300 đi", the tool page left "Bản OBV Ver"
 * on one line and "2:" on the next): a word and the short number after it
 * ("Ver 2", "Windows 10", "VIP 5"), a number and the word after it
 * ("7 ngày"), a dash and the word before it, so no line starts with "-",
 * punctuation typed after a space (" !!!"), and the last two words, so the
 * last line never holds one word alone ("An / Toàn").
 */
export function keepTogether(text: string): string {
  return text
    .replace(/(\p{L})\s+(\d{1,3})(?=\D|$)/gu, "$1\u00a0$2")
    .replace(/(\d)\s+(\p{L})/gu, "$1\u00a0$2")
    .replace(/\s+([-–—])(?=\s)/gu, "\u00a0$1")
    .replace(/\s+([!?.,:;…]+)/gu, "\u00a0$1")
    .replace(/ ([^ ]+)$/u, "\u00a0$1");
}
