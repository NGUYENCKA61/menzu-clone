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

const DONE = "Rồi";

/** The four ways a buyer can answer "have you switched it off yet". */
function switched(thing: string): readonly DetailOption[] {
  return [
    { value: DONE, hint: `Đã ${thing} xong, gửi kèm ảnh cho shop xem.` },
    { value: "Chưa", hint: "Chưa làm bước này bao giờ." },
    { value: "Đã thử nhưng không được", hint: "Làm theo hướng dẫn mà vẫn không tắt được." },
    { value: "Không rõ", hint: "Không tìm thấy chỗ chỉnh, cần shop chỉ." },
  ];
}

/** A tool's report: the machine, what is switched off, and the game. */
const SOFTWARE_QUESTIONS: readonly DetailQuestion[] = [
  {
    key: "WINVER",
    label: "Phiên bản Windows",
    hint: "Bấm Windows + R, gõ winver, chụp lại cửa sổ hiện ra.",
    options: [],
    placeholder: "Ví dụ: Windows 11 24H2",
    photo: true,
  },
  {
    key: "REQUIREMENTS",
    label: "Đã cài đủ bộ yêu cầu chưa",
    hint: "Visual C++, .NET Framework và DirectX theo trang hướng dẫn.",
    options: [
      { value: DONE, hint: "Cài đủ cả ba, gửi kèm ảnh Apps & features." },
      { value: "Chưa", hint: "Chưa cài, hoặc không biết cài cái nào." },
      { value: "Cài thiếu một phần", hint: "Có cái cài được, có cái báo lỗi." },
      { value: "Không rõ", hint: "Không chắc máy đã có sẵn hay chưa." },
    ],
    photo: true,
    photoWhen: DONE,
  },
  {
    key: "ANTIVIRUS",
    label: "Đã tắt diệt virus chưa",
    hint: "Cả Windows Defender lẫn phần mềm diệt virus ngoài.",
    options: switched("tắt"),
    photo: true,
    photoWhen: DONE,
  },
  {
    key: "SECURE_BOOT",
    label: "Đã tắt Secure Boot chưa",
    hint: "Bấm Windows + R, gõ msinfo32, xem dòng Secure Boot State.",
    options: switched("tắt"),
    photo: true,
    photoWhen: DONE,
  },
  {
    key: "VIRTUALIZATION",
    label: "Đã tắt ảo hoá chưa",
    hint: "Hyper-V, Virtual Machine Platform, Windows Sandbox.",
    options: switched("tắt"),
    photo: true,
    photoWhen: DONE,
  },
  {
    key: "CORE_ISOLATION",
    label: "Đã tắt Core Isolation chưa",
    hint: "Windows Security, Device security, Core isolation, Memory integrity.",
    options: switched("tắt"),
    photo: true,
    photoWhen: DONE,
  },
  {
    key: "DISPLAY_MODE",
    label: "Game đang để chế độ hiển thị nào",
    hint: "Hầu hết tool cần cửa sổ không viền để vẽ được lên game.",
    options: [
      { value: "Không viền", hint: "Borderless, cửa sổ tràn màn hình, không khung." },
      { value: "Toàn màn hình", hint: "Fullscreen, game chiếm riêng màn hình." },
      { value: "Cửa sổ", hint: "Windowed, có khung và thanh tiêu đề." },
      { value: "Không rõ", hint: "Không nhớ đang để chế độ nào." },
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
      { value: "Máy tính", hint: "Windows hoặc macOS." },
      { value: "Điện thoại", hint: "Android hoặc iPhone." },
      { value: "Giả lập", hint: "LDPlayer, BlueStacks, NoxPlayer…" },
      { value: "Khác", hint: "Máy chơi game, web, thiết bị khác." },
    ],
  },
  {
    key: "CHANGED_PASSWORD",
    label: "Đã đổi mật khẩu sau khi nhận chưa",
    hint: "Đổi mật khẩu trước khi báo lỗi làm shop không kiểm tra được.",
    options: [
      { value: DONE, hint: "Đã đổi, gửi kèm ảnh màn hình đổi mật khẩu." },
      { value: "Chưa", hint: "Giữ nguyên mật khẩu shop giao." },
      { value: "Đã thử nhưng không được", hint: "Bấm đổi nhưng hệ thống không cho." },
      { value: "Không rõ", hint: "Không nhớ có đổi hay không." },
    ],
    photo: true,
    photoWhen: DONE,
  },
];

export const DETAIL_QUESTIONS: Record<WarrantyKind, readonly DetailQuestion[]> = {
  software: SOFTWARE_QUESTIONS,
  account: ACCOUNT_QUESTIONS,
};

/** One answer as it is stored: what was picked or typed, and its picture. */
export interface DetailAnswer {
  key: string;
  value: string;
  imageUrl: string | null;
}

export const ANSWER_MAX = 200;

/** Whether this answer is the one that asks for a screenshot. */
export function wantsPhoto(q: DetailQuestion, value: string): boolean {
  if (!q.photo) return false;
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
    out.push({
      key,
      value: value.slice(0, ANSWER_MAX),
      imageUrl: typeof row.imageUrl === "string" && row.imageUrl ? row.imageUrl : null,
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
    if (wantsPhoto(q, answer.value) && !answer.imageUrl) return true;
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
