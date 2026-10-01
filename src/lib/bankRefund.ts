/**
 * A buyer's bank account for a refund over a bank transfer — what the
 * warranty status page asks for once the shop turns a ticket into a bank
 * refund (the owner, 01/10/2026: "khách hàng sẽ nhập stk ngân hàng, xác nhận
 * lại stk"). Pure on purpose: the form checks with it as the buyer types, and
 * the route checks with it again before anything is stored.
 */

/**
 * The banks a buyer here is likely to hold an account at, under the name
 * their app shows. A short list the buyer picks from rather than a box they
 * type into: "vcb", "Vietcom" and "Ngân hàng Ngoại thương" are one bank, and
 * the desk transferring the money should not have to guess.
 */
export const REFUND_BANKS = [
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "HDBank",
  "VIB",
  "SHB",
  "SeABank",
  "OCB",
  "MSB",
  "Eximbank",
  "LPBank",
  "Nam A Bank",
  "Bac A Bank",
  "PVcomBank",
  "ABBANK",
  "BaoViet Bank",
  "Kienlongbank",
  "VietABank",
  "Saigonbank",
  "NCB",
  "PGBank",
  "Vietbank",
  "BVBank",
  "SCB",
  "CAKE by VPBank",
  "Timo",
  "Shinhan Bank",
  "Woori Bank",
  "HSBC",
  "Standard Chartered",
  "UOB",
] as const;

export type RefundBank = (typeof REFUND_BANKS)[number];

export const ACCOUNT_MIN = 6;
export const ACCOUNT_MAX = 20;

/** Digits only: the buyer may type the spaces and dots their bank app shows. */
export function normaliseAccount(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\s.-]/g, "") : "";
}

/**
 * The holder's name as a bank writes it — capitals, no tone marks, single
 * spaces: "Nguyễn Văn  An" is "NGUYEN VAN AN". Đ has no decomposition, so it
 * is mapped by hand.
 */
export function normaliseHolder(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export type BankDetails = { bankName: RefundBank; bankAccount: string; accountHolder: string };

/**
 * The account, ready to store, or the one sentence the buyer needs to fix it.
 *
 * The number is typed twice and must match: a refund sent to a mistyped
 * account is money the shop cannot get back, so the second box is the whole
 * point of the form.
 */
export function readBankDetails(input: {
  bankName?: unknown;
  bankAccount?: unknown;
  bankAccountConfirm?: unknown;
  accountHolder?: unknown;
}): ({ ok: true } & BankDetails) | { ok: false; error: string } {
  const bankName = typeof input.bankName === "string" ? input.bankName.trim() : "";
  if (!(REFUND_BANKS as readonly string[]).includes(bankName)) {
    return { ok: false, error: "Chọn ngân hàng của bạn." };
  }

  const bankAccount = normaliseAccount(input.bankAccount);
  if (!/^\d+$/.test(bankAccount) || bankAccount.length < ACCOUNT_MIN || bankAccount.length > ACCOUNT_MAX) {
    return { ok: false, error: `Số tài khoản chỉ gồm ${ACCOUNT_MIN}–${ACCOUNT_MAX} chữ số.` };
  }
  if (normaliseAccount(input.bankAccountConfirm) !== bankAccount) {
    return { ok: false, error: "Hai lần nhập số tài khoản không khớp — bạn kiểm tra lại giúp shop." };
  }

  const accountHolder = normaliseHolder(input.accountHolder);
  if (!/^[A-Z ]{2,60}$/.test(accountHolder)) {
    return { ok: false, error: "Nhập tên chủ tài khoản như trên thẻ ngân hàng." };
  }

  return { ok: true, bankName: bankName as RefundBank, bankAccount, accountHolder };
}

/** "••••6789": enough for the buyer to recognise the account, not to copy it. */
export function maskAccount(account: string): string {
  return `••••${account.slice(-4)}`;
}
