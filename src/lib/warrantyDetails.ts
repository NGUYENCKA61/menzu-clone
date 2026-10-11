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
 * A question is either a choice from a short list or a line the buyer types,
 * and some of them want a screenshot with the answer, because an answer the
 * buyer is sure of is often wrong (Secure Boot above all).
 */
export interface DetailQuestion {
  key: string;
  label: string;
  /** What to look at, in the buyer's words. */
  hint: string;
  /** The answers offered; an empty list means they type one. */
  options: readonly string[];
  /** A screenshot is due with the answer. */
  photo?: boolean;
}

const YES_NO = ["Rồi", "Chưa", "Không rõ"] as const;

/** A tool's report: the machine, what is switched off, and the game. */
const SOFTWARE_QUESTIONS: readonly DetailQuestion[] = [
  {
    key: "WINVER",
    label: "Phiên bản Windows",
    hint: "Bấm Windows + R, gõ winver, chụp lại cửa sổ hiện ra.",
    options: [],
    photo: true,
  },
  {
    key: "REQUIREMENTS",
    label: "Đã cài đủ bộ yêu cầu chưa",
    hint: "Visual C++, .NET Framework và DirectX theo trang hướng dẫn.",
    options: YES_NO,
  },
  {
    key: "ANTIVIRUS",
    label: "Đã tắt diệt virus chưa",
    hint: "Cả Windows Defender lẫn phần mềm diệt virus ngoài.",
    options: YES_NO,
  },
  {
    key: "SECURE_BOOT",
    label: "Đã tắt Secure Boot chưa",
    hint: "Bấm Windows + R, gõ msinfo32, chụp dòng Secure Boot State.",
    options: YES_NO,
    photo: true,
  },
  {
    key: "VIRTUALIZATION",
    label: "Đã tắt ảo hoá chưa",
    hint: "Hyper-V, Virtual Machine Platform, Windows Sandbox.",
    options: YES_NO,
  },
  {
    key: "CORE_ISOLATION",
    label: "Đã tắt Core Isolation chưa",
    hint: "Windows Security, Device security, Core isolation, Memory integrity.",
    options: YES_NO,
    photo: true,
  },
  {
    key: "DISPLAY_MODE",
    label: "Game đang để chế độ hiển thị nào",
    hint: "Hầu hết tool cần cửa sổ không viền để vẽ được lên game.",
    options: ["Không viền", "Toàn màn hình", "Cửa sổ", "Không rõ"],
  },
];

/** An account's report: where the sign-in was tried, and what it said. */
const ACCOUNT_QUESTIONS: readonly DetailQuestion[] = [
  {
    key: "LOGIN_ERROR",
    label: "Màn hình báo lỗi khi đăng nhập",
    hint: "Chụp đúng lúc game hoặc launcher báo lỗi.",
    options: [],
    photo: true,
  },
  {
    key: "DEVICE",
    label: "Đăng nhập trên thiết bị nào",
    hint: "Máy tính, điện thoại hay giả lập.",
    options: ["Máy tính", "Điện thoại", "Giả lập", "Khác"],
  },
  {
    key: "CHANGED_PASSWORD",
    label: "Đã đổi mật khẩu sau khi nhận chưa",
    hint: "Đổi mật khẩu trước khi báo lỗi làm shop không kiểm tra được.",
    options: YES_NO,
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
 * What is still missing: every question wants an answer, and the ones that
 * ask for a screenshot want that too. The count is what the receipt and the
 * desk both print ("đã bổ sung 4/7").
 */
export function missingDetails(
  kind: WarrantyKind,
  answers: DetailAnswer[],
): DetailQuestion[] {
  const by = new Map(answers.map((a) => [a.key, a]));
  return DETAIL_QUESTIONS[kind].filter((q) => {
    const answer = by.get(q.key);
    if (!answer) return true;
    if (q.options.length > 0 && !q.options.includes(answer.value)) return true;
    if (q.photo && !answer.imageUrl) return true;
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
