/**
 * "Xác thực cấp 2" (the owner, 12/10/2026): the rules both ends share — what
 * a phone, a Facebook address and a name must look like, how long a code
 * lives, and the words each state carries. No server imports, so the form
 * on Bảo mật and the tests read it as the routes do.
 */

/** A Vietnamese mobile number as the shop writes it: ten digits, leading 0. */
export const PHONE_RE = /^0\d{9}$/;

/** "+84 912 345 678", "84912345678", "0912.345.678" → "0912345678". */
export function normalisePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("84") && digits.length === 11)
    digits = `0${digits.slice(2)}`;
  return digits.replace(/\D/g, "");
}

/** The number to store, or null when what was typed is not one. */
export function readPhone(value: unknown): string | null {
  const phone = normalisePhone(value);
  return PHONE_RE.test(phone) ? phone : null;
}

/** "0912•••678": enough to recognise one's own number on screen. */
export function maskPhone(phone: string): string {
  return phone.length >= 7
    ? `${phone.slice(0, 4)}•••${phone.slice(-3)}`
    : phone;
}

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.me",
]);

export const FACEBOOK_URL_MAX = 300;

/**
 * The profile address, tidied — scheme added, fragment dropped — or null when
 * it is not a Facebook address at all, or only the site's front door.
 */
export function readFacebookUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let text = value.trim();
  if (!text || text.length > FACEBOOK_URL_MAX) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!FACEBOOK_HOSTS.has(url.hostname.toLowerCase())) return null;
    if ((url.pathname === "/" || url.pathname === "") && !url.search)
      return null;
    url.hash = "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export const NAME_MAX = 80;

/** A name as typed, single-spaced and capped; "" when nothing usable came. */
export function readName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

export const NOTE_MAX = 300;

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

/** How long a code sent to the phone's Zalo works. */
export const PHONE_OTP_TTL_MINUTES = 10;

/** Between two codes to one account, so a finger on the button is not a flood. */
export const PHONE_OTP_COOLDOWN_SECONDS = 60;

/** Codes per account per hour. */
export const PHONE_OTPS_PER_HOUR = 5;

/** Wrong codes one code survives. */
export const PHONE_OTP_MAX_ATTEMPTS = 5;

/** A proved number stays good for the form this long; then it is proved again. */
export const PHONE_PROOF_VALID_MS = 2 * 60 * 60 * 1000;

/** Where Bảo mật opens on the verification tab. */
export const VERIFY_TAB_HREF = "/security?tab=verify";

/** The buyer-facing sentence on a tool sold to level 2 only. */
export const VERIFIED_ONLY_SENTENCE =
  "Bản này chỉ bán cho tài khoản xác thực cấp 2.";

/** One bid, as the customer's own page shows it. */
export type VerificationRequestView = {
  id: string;
  status: VerificationStatus;
  facebookUrl: string;
  facebookName: string;
  phone: string;
  zaloName: string | null;
  bankName: string;
  /** "••••6789": the customer knows their own account. */
  bankAccountMasked: string;
  accountHolder: string;
  /** The shop's reason when refused. */
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/** What Bảo mật › Xác thực cấp 2 is told about the reader. */
export type VerificationView = {
  level: 1 | 2;
  verifiedAt: string | null;
  /** The latest bid, whatever its state; null before the first. */
  request: VerificationRequestView | null;
  zaloLinked: boolean;
  zaloName: string | null;
  /** Whether a code can go out right now: the shop's Zalo bot is online. */
  botOnline: boolean;
};
