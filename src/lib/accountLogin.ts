/**
 * The sign-in a sold account comes with, and who gets to see it.
 *
 * Pure: the same questions are asked by the admin route that stores a sign-in,
 * the buyer's order page that prints one, and the admin order list that says
 * which orders got theirs. None of them should be able to disagree about what
 * "handed over" means.
 *
 * The tag on the card decides how the account is delivered. An NFA account
 * is nothing but its username and password, so those go out by themselves
 * the moment the sale goes through. Anything else — FULL THÔNG TIN, or no
 * tag at all — comes with a mailbox and a history to change hands, and the
 * shop hands that over in person: the buyer is told to get in touch. There
 * is no queue and no to-do for the shop either way; the shop decided that a
 * buyer who needs more asks for it.
 */

export const LOGIN_USERNAME_MAX = 120;
export const LOGIN_PASSWORD_MAX = 200;
export const LOGIN_NOTE_MAX = 1000;

export interface AccountLogin {
  username: string;
  password: string;
  /** Recovery mail, 2FA, "đổi mật khẩu ngay" — null when the shop wrote none. */
  note: string | null;
}

/** The three columns as a product row carries them. */
export interface LoginColumns {
  loginUsername: string | null;
  loginPassword: string | null;
  loginNote: string | null;
}

/**
 * The sign-in on a row, or null while it has none.
 *
 * Both halves or nothing: a username without a password is not something a
 * buyer can use, and printing it would tell them the shop had started and
 * stopped. The admin route refuses to store half a sign-in, so this is a
 * guard against rows written some other way, not a state the UI reaches.
 */
export function readLogin(row: LoginColumns): AccountLogin | null {
  const username = row.loginUsername?.trim() ?? "";
  const password = row.loginPassword?.trim() ?? "";
  if (!username || !password) return null;
  return { username, password, note: row.loginNote?.trim() || null };
}

/** The card tag that sells on automatic delivery. Compared case-blind. */
export const AUTO_DELIVERY_TAG = "NFA";

/**
 * Whether an account with this tag hands its sign-in over by itself.
 *
 * NFA is the only such tag: the account is its username and password and
 * nothing more. FULL THÔNG TIN carries a mailbox to change hands, and an
 * untagged account is not known to be either — so both are handed over by
 * the shop in person.
 */
export function deliversAutomatically(tag: string | null | undefined): boolean {
  return (tag ?? "").trim().toUpperCase() === AUTO_DELIVERY_TAG;
}

/** What an order's buyer sees about the sign-in. */
export type LoginHandover =
  /**
   * Nothing to show: not an account, an order that was never paid or was
   * reversed, or one whose account has since been sold on to somebody else.
   */
  | { state: "none" }
  /**
   * The shop hands this one over in person and the buyer is told to get in
   * touch: every account that is not NFA, and an NFA account listed without
   * its sign-in.
   */
  | { state: "manual" }
  | { state: "ready"; login: AccountLogin };

/**
 * Decides the handover for one order against the product it bought.
 *
 * Only a PAID order sees anything, and only the product's latest PAID order
 * at that: the shop can put a sold account back on the shelf and sell it
 * again, and nothing moves the first order off PAID when it does. The row
 * then holds the second buyer's sign-in, and the first buyer must not keep
 * reading it — so `currentOrderId`, the latest paid order the caller looked
 * up, is what says whose the row is now. A caller that did not look it up
 * passes null and the order is taken to be current. Software has keys
 * instead and never shows anything here, however its row happens to look.
 *
 * Whether the sign-in is then printed is the tag's call, not the row's: a
 * FULL THÔNG TIN account with a sign-in typed on it still reads "manual",
 * because the shop wants to hand that kind over itself.
 */
export function loginHandover(
  order: { id: string; status: string },
  product: LoginColumns & {
    productType: string;
    currentOrderId: string | null;
    /** The card's corner pill; null when the account wears none. */
    tag: string | null;
  },
): LoginHandover {
  if (product.productType !== "ACCOUNT_GAME") return { state: "none" };
  if (order.status !== "PAID") return { state: "none" };
  if (product.currentOrderId !== null && product.currentOrderId !== order.id) {
    return { state: "none" };
  }
  if (!deliversAutomatically(product.tag)) return { state: "manual" };
  const login = readLogin(product);
  return login ? { state: "ready", login } : { state: "manual" };
}

/** The `tag` a product row carries, off the one-row `tags` include. */
export function tagOf(product: { tags: { label: string }[] }): string | null {
  return product.tags[0]?.label ?? null;
}

/**
 * The `currentOrderId` a product row carries, off the one-row `orders`
 * include every reader asks for: `where: { status: "PAID" }, orderBy:
 * { createdAt: "desc" }, take: 1`.
 */
export function currentOrderIdOf(product: { orders: { id: string }[] }): string | null {
  return product.orders[0]?.id ?? null;
}

/** What the admin typed, as the PATCH body carries it. */
export interface LoginInput {
  loginUsername?: unknown;
  loginPassword?: unknown;
  loginNote?: unknown;
}

export type LoginUpdate =
  /** Nothing about the sign-in was in the request. */
  | { kind: "untouched" }
  | { kind: "invalid"; error: string }
  /** Every column to write. Nulls clear — the shop emptied both fields. */
  | { kind: "set"; value: LoginColumns };

/**
 * Turns the admin's fields into the three columns, or says why it cannot.
 *
 * Trimmed on the way in: a sign-in is pasted far more often than typed, and a
 * trailing space off a spreadsheet cell would have the buyer's first login
 * fail on a password that looks right. Empty in both fields clears the row —
 * that is how a shop takes a sign-in back off an account it is re-listing.
 */
export function parseLoginInput(body: LoginInput | null | undefined): LoginUpdate {
  if (
    !body ||
    (body.loginUsername === undefined &&
      body.loginPassword === undefined &&
      body.loginNote === undefined)
  ) {
    return { kind: "untouched" };
  }

  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const username = text(body.loginUsername);
  const password = text(body.loginPassword);
  const note = text(body.loginNote);

  if ((username === "") !== (password === "")) {
    return {
      kind: "invalid",
      error: "Cần nhập cả tên đăng nhập và mật khẩu — hoặc để trống cả hai để xoá",
    };
  }
  if (username.length > LOGIN_USERNAME_MAX) {
    return { kind: "invalid", error: `Tên đăng nhập tối đa ${LOGIN_USERNAME_MAX} ký tự` };
  }
  if (password.length > LOGIN_PASSWORD_MAX) {
    return { kind: "invalid", error: `Mật khẩu tối đa ${LOGIN_PASSWORD_MAX} ký tự` };
  }
  if (note.length > LOGIN_NOTE_MAX) {
    return { kind: "invalid", error: `Ghi chú bàn giao tối đa ${LOGIN_NOTE_MAX} ký tự` };
  }

  return {
    kind: "set",
    value: {
      loginUsername: username || null,
      loginPassword: password || null,
      loginNote: note || null,
    },
  };
}
