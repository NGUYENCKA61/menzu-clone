import { WARRANTY_ISSUE_KEYS, type WarrantyKind } from "@/lib/warrantyRequests";

/**
 * The second round of a warranty report.
 *
 * The first form asks what broke; this one asks the questions the desk would
 * otherwise have to ask by hand, one at a time, over a day (the owner,
 * 10/10/2026: "phải gửi 2 đợt, đợt 1 sơ bộ, đợt sau người dùng cần phải chọn
 * tiếp và gửi kèm ảnh từng câu hỏi kỹ hơn"). It is required: until it is
 * answered the ticket reads "Chờ bổ sung" and the desk leaves it alone.
 *
 * An answer is one of four tiles, each written out the way the first round
 * writes its faults (the owner, 11/10/2026: "làm mô tả nó dài ra như đợt 1,
 * đủ 4 ô cho 1 câu trả lời"), or a line the buyer types. The screenshot only
 * appears once they say they did the thing, because that is the answer worth
 * a picture ("khi chọn vào tôi đã làm rồi thì sẽ mở ra chỗ upload hình").
 */
export interface DetailOption {
  value: string;
  /** The line under it, as a fault tile has one. */
  hint: string;
}

export interface DetailQuestion {
  key: string;
  label: string;
  /** What to look at, in the buyer's words. */
  hint: string;
  /** The answers offered; an empty list means they type one. */
  options: readonly DetailOption[];
  /** The example under a typed answer; each question has its own. */
  placeholder?: string;
  /** A screenshot can come with the answer. */
  photo?: boolean;
  /** …and is only asked for when this answer is the one chosen. */
  photoWhen?: string;
}

/**
 * One of the "have you switched it off yet" questions.
 *
 * The answers are sentences, not the word "Rồi" (the owner, 11/10/2026:
 * "mấy câu rồi hay chưa ngắn quá, phải ghi dài ra, tôi đã cài rồi… hay gì
 * đó chi tiết hơn chứ vậy cọc cằn"), and the first of them is the one that
 * opens the uploader.
 */
function offQuestion(
  key: string,
  label: string,
  hint: string,
  thing: string,
): DetailQuestion {
  const options: readonly DetailOption[] = [
    { value: `Tôi đã tắt ${thing} rồi`, hint: "Tắt xong rồi, gửi kèm ảnh cho shop xem." },
    { value: `Tôi chưa tắt ${thing}`, hint: "Chưa làm bước này bao giờ." },
    {
      value: "Tôi đã thử nhưng không tắt được",
      hint: "Làm theo hướng dẫn mà máy vẫn bật lại.",
    },
    { value: "Tôi không rõ cái này", hint: "Không tìm thấy chỗ chỉnh, cần shop chỉ giúp." },
  ];
  return { key, label, hint, options, photo: true, photoWhen: options[0].value };
}

/** A tool's report: the machine, what is switched off, and the game. */
const SOFTWARE_QUESTIONS: readonly DetailQuestion[] = [
  {
    key: "WINVER",
    label: "Phiên bản Windows",
    hint: "Bấm Windows + R, gõ winver, chụp lại cửa sổ hiện ra.",
    // Four tiles here too (the owner, 11/10/2026: "phiên bản win chưa có
    // kìa, tạo câu trả lời đi"). The picture stays due whichever is picked:
    // it carries the build number, which is what the desk reads.
    options: [
      { value: "Tôi dùng Windows 11", hint: "Bản 11, bất kể 22H2, 23H2 hay 24H2." },
      { value: "Tôi dùng Windows 10", hint: "Bản 10 từ 2004 trở lên, ví dụ 20H2, 21H2, 22H2." },
      {
        value: "Tôi dùng bản cũ hơn",
        // A 1909 machine is a Windows 10 machine, so it would land on the
        // tile above and the desk would never know (the owner, 11/10/2026:
        // "bổ sung trường hợp là win 10 bản cũ như 1909 trở xuống").
        hint: "Windows 10 bản 1909 trở xuống, hoặc Windows 8.1, 8, 7.",
      },
      { value: "Tôi không rõ bản nào", hint: "Chưa xem winver, gửi ảnh để shop đọc giúp." },
    ],
    photo: true,
  },
  {
    key: "REQUIREMENTS",
    label: "Đã cài đủ bộ yêu cầu chưa",
    hint: "Visual C++, .NET Framework và DirectX theo trang hướng dẫn.",
    options: [
      { value: "Tôi đã cài đủ cả ba", hint: "Cài xong hết, gửi kèm ảnh Apps & features." },
      { value: "Tôi chưa cài cái nào", hint: "Chưa cài, hoặc không biết cài cái nào." },
      { value: "Tôi cài thiếu một phần", hint: "Có cái cài được, có cái báo lỗi." },
      { value: "Tôi không rõ cái này", hint: "Không chắc máy đã có sẵn hay chưa." },
    ],
    photo: true,
    photoWhen: "Tôi đã cài đủ cả ba",
  },
  offQuestion(
    "ANTIVIRUS",
    "Đã tắt diệt virus chưa",
    "Cả Windows Defender lẫn phần mềm diệt virus ngoài.",
    "diệt virus",
  ),
  offQuestion(
    "SECURE_BOOT",
    "Đã tắt Secure Boot chưa",
    "Bấm Windows + R, gõ msinfo32, xem dòng Secure Boot State.",
    "Secure Boot",
  ),
  offQuestion(
    "VIRTUALIZATION",
    "Đã tắt ảo hoá chưa",
    "Hyper-V, Virtual Machine Platform, Windows Sandbox.",
    "ảo hoá",
  ),
  offQuestion(
    "CORE_ISOLATION",
    "Đã tắt Core Isolation chưa",
    "Windows Security, Device security, Core isolation, Memory integrity.",
    "Core Isolation",
  ),
  {
    key: "DISPLAY_MODE",
    label: "Game đang để chế độ hiển thị nào",
    hint: "Hầu hết tool cần cửa sổ không viền để vẽ được lên game.",
    options: [
      { value: "Đang để không viền", hint: "Borderless, cửa sổ tràn màn hình, không khung." },
      { value: "Đang để toàn màn hình", hint: "Fullscreen, game chiếm riêng màn hình." },
      { value: "Đang để cửa sổ", hint: "Windowed, có khung và thanh tiêu đề." },
      { value: "Tôi không nhớ", hint: "Chưa vào phần cài đặt hiển thị của game." },
    ],
  },
];

/** An account's report: where the sign-in was tried, and what it said. */
const ACCOUNT_QUESTIONS: readonly DetailQuestion[] = [
  {
    key: "LOGIN_ERROR",
    label: "Màn hình báo lỗi khi đăng nhập",
    hint: "Chụp đúng lúc game hoặc launcher báo lỗi.",
    options: [],
    placeholder: "Ví dụ: sai mật khẩu, tài khoản bị khóa",
    photo: true,
  },
  {
    key: "DEVICE",
    label: "Đăng nhập trên thiết bị nào",
    hint: "Máy tính, điện thoại hay giả lập.",
    options: [
      { value: "Trên máy tính", hint: "Windows hoặc macOS." },
      { value: "Trên điện thoại", hint: "Android hoặc iPhone." },
      { value: "Trên giả lập", hint: "LDPlayer, BlueStacks, NoxPlayer…" },
      { value: "Trên thiết bị khác", hint: "Máy chơi game, trình duyệt web…" },
    ],
  },
  {
    key: "CHANGED_PASSWORD",
    label: "Đã đổi mật khẩu sau khi nhận chưa",
    hint: "Đổi mật khẩu trước khi báo lỗi làm shop không kiểm tra được.",
    options: [
      { value: "Tôi đã đổi mật khẩu", hint: "Đổi rồi, gửi kèm ảnh màn hình đổi mật khẩu." },
      { value: "Tôi chưa đổi", hint: "Giữ nguyên mật khẩu shop giao." },
      { value: "Tôi đã thử nhưng không đổi được", hint: "Bấm đổi nhưng hệ thống không cho." },
      { value: "Tôi không nhớ", hint: "Không nhớ có đổi hay không." },
    ],
    photo: true,
    photoWhen: "Tôi đã đổi mật khẩu",
  },
];

export const DETAIL_QUESTIONS: Record<WarrantyKind, readonly DetailQuestion[]> = {
  software: SOFTWARE_QUESTIONS,
  account: ACCOUNT_QUESTIONS,
};

/** One answer as it is stored: what was picked or typed, and its pictures. */
export interface DetailAnswer {
  key: string;
  value: string;
  /**
   * Every screenshot sent with this answer, in the order they were picked.
   * One fault often takes more than one window to show (the owner,
   * 11/10/2026: "ảnh đính kèm có thể gửi nhiều ảnh 1 lần").
   */
  imageUrls: string[];
}

export const ANSWER_MAX = 200;
/** A handful per question, not an album. */
export const IMAGES_PER_ANSWER = 5;

/**
 * Whether this answer is the one that asks for a screenshot.
 *
 * Nothing is asked for before an answer is picked: the uploader opens on the
 * press, not on the question (the owner, 11/10/2026: "ấn vô nút chọn câu trả
 * lời mới hiện chỗ đính kèm ảnh").
 */
export function wantsPhoto(q: DetailQuestion, value: string): boolean {
  if (!q.photo) return false;
  if (!value.trim()) return false;
  if (!q.photoWhen) return true;
  return value === q.photoWhen;
}

/**
 * The answers as the ticket keeps them: a list, in the order the questions
 * were asked, so the desk reads them as a form rather than a JSON blob.
 * Anything unreadable reads as "nothing answered yet", which is what an old
 * ticket from before this existed is.
 */
export function readDetails(raw: string | null): DetailAnswer[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: DetailAnswer[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key : null;
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (!key || !value) continue;
    // A round answered before pictures came in bunches kept a single
    // imageUrl; it reads as a list of one.
    const list = Array.isArray(row.imageUrls) ? row.imageUrls : [row.imageUrl];
    out.push({
      key,
      value: value.slice(0, ANSWER_MAX),
      imageUrls: list
        .filter((url): url is string => typeof url === "string" && url.length > 0)
        .slice(0, IMAGES_PER_ANSWER),
    });
  }
  return out;
}

/** The label a key was asked under, for reading an answer back. */
export function questionFor(kind: WarrantyKind, key: string): DetailQuestion | null {
  return DETAIL_QUESTIONS[kind].find((q) => q.key === key) ?? null;
}

/**
 * What is still missing: every question wants an answer, and the ones whose
 * answer asks for a screenshot want that too. The count is what the round's
 * heading prints ("4/7").
 */
export function missingDetails(
  kind: WarrantyKind,
  answers: DetailAnswer[],
): DetailQuestion[] {
  const by = new Map(answers.map((a) => [a.key, a]));
  return DETAIL_QUESTIONS[kind].filter((q) => {
    const answer = by.get(q.key);
    if (!answer) return true;
    if (q.options.length > 0 && !q.options.some((o) => o.value === answer.value)) return true;
    if (wantsPhoto(q, answer.value) && answer.imageUrls.length === 0) return true;
    return false;
  });
}

export function detailsComplete(kind: WarrantyKind, answers: DetailAnswer[]): boolean {
  return missingDetails(kind, answers).length === 0;
}

/** Guard: every question key is one of a kind's own, and unique. */
export function knownDetailKeys(kind: WarrantyKind): Set<string> {
  return new Set(DETAIL_QUESTIONS[kind].map((q) => q.key));
}

/** Nothing here may collide with an issue key; they travel in the same form. */
export const DETAIL_KEYS_ARE_DISTINCT = Object.values(DETAIL_QUESTIONS)
  .flat()
  .every((q) => !WARRANTY_ISSUE_KEYS.includes(q.key as never));
