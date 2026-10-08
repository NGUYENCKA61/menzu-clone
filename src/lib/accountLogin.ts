/**
 * The sign-in a sold account comes with, and who gets to see it.
 *
 * Pure: the same questions are asked by the admin route that stores a sign-in,
 * the buyer's order page that prints one, and the admin order list that says
 * which orders got theirs. None of them should be able to disagree about what
 * "handed over" means.
 *
 * Every account hands its sign-in over the same way, whatever its tag: the
 * buyer takes it from their order through "Lấy thông tin", having confirmed
 * they are recording the screen. The tag used to decide (NFA by itself,
 * FULL THÔNG TIN and untagged accounts in person) until the owner dropped
 * the in-person handover (08/10/2026: "loại bỏ cái bàn giao trực tiếp đi").
 * An account sold before the shop typed its sign-in tells the buyer the shop
 * is preparing it, and shows it the moment the shop types it in.
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

/** What an order's buyer sees about the sign-in. */
export type LoginHandover =
  /**
   * Nothing to show: not an account, an order that was never paid or was
   * reversed, one whose account has since been sold on to somebody else, or
   * a random listing, whose sign-ins are its delivered keys.
   */
  | { state: "none" }
  /**
   * Sold before the shop typed the sign-in: the buyer is told the shop is
   * preparing it, and it shows the moment the shop types it in.
   */
  | { state: "pending" }
  /**
   * A sign-in waiting for the buyer to take it: shown only after the
   * receipt's "Lấy thông tin", once they confirm they are recording the
   * screen (the owner, 08/10/2026, after menzu's "Nhận thông tin đăng nhập").
   * The sign-in itself is not in this state at all, so it is not in the page.
   */
  | { state: "locked" }
  | { state: "ready"; login: AccountLogin };

/**
 * What the buyer is shown: a sign-in they have not yet asked for stays
 * locked. Every buyer-facing reader passes through this; the desk does not.
 */
export function gatedHandover(handover: LoginHandover, revealedAt: Date | null): LoginHandover {
  return handover.state === "ready" && revealedAt === null ? { state: "locked" } : handover;
}

/**
 * Whether a paid account order has a sign-in for "Lấy thông tin" to hand
 * over: a random listing's delivered accounts, or an account's own sign-in
 * that the shop delivers automatically. The receipt, the route that stamps
 * the take and the Telegram bot all ask this one question.
 */
export function hasLoginToTake(
  order: { status: string },
  product: { productType: string; accountPool: boolean },
  /** Sign-ins delivered to the order, for a random listing. */
  keysDelivered: number,
  /** The order's handover before gating, for a single account. */
  handover: LoginHandover,
): boolean {
  if (order.status !== "PAID" || product.productType !== "ACCOUNT_GAME") return false;
  return product.accountPool ? keysDelivered > 0 : handover.state === "ready";
}

/**
 * The steps before an account's sign-in is shown, menzu's "Bắt buộc quay màn
 * hình" without its Web Riot: the buyer signs in to the game itself ("bỏ
 * cái nút web riot đi yêu cầu người dùng đăng nhập vào game thôi"). Shared
 * by the receipt's popup and the Telegram bot, so both say the same.
 */
export const REVEAL_STEPS = [
  {
    title: "Bật quay toàn màn hình",
    body: "Bắt đầu quay màn hình từ bây giờ, trước khi mở thông tin.",
  },
  {
    title: "Mở khóa thông tin",
    body: "Bấm nút xác nhận bên dưới để hiện tài khoản và mật khẩu.",
  },
  { title: "Đăng nhập vào game", body: "Mở game và đăng nhập để kiểm tra tài khoản." },
] as const;

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
 * instead and never shows anything here, however its row happens to look,
 * and so does a random listing: its sign-ins are the keys delivered to the
 * order, not the columns on the row.
 */
export function loginHandover(
  order: { id: string; status: string },
  product: LoginColumns & {
    productType: string;
    accountPool: boolean;
    currentOrderId: string | null;
  },
): LoginHandover {
  if (product.productType !== "ACCOUNT_GAME" || product.accountPool) return { state: "none" };
  if (order.status !== "PAID") return { state: "none" };
  if (product.currentOrderId !== null && product.currentOrderId !== order.id) {
    return { state: "none" };
  }
  const login = readLogin(product);
  return login ? { state: "ready", login } : { state: "pending" };
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
      error: "Cần nhập cả tên đăng nhập và mật khẩu, hoặc để trống cả hai để xoá",
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
