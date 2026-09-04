/**
 * The shop, inside Telegram.
 *
 * A second bot, separate from the admin's status desk, that a customer talks
 * to: it shows the shelf, sells off it out of the same wallet the website
 * uses, hands over the keys in the chat, and takes top-ups with the same bank
 * code the website prints. Nothing here has its own stock or its own money;
 * every screen is a view of the one database, and every sale goes through
 * lib/checkout exactly as a web purchase does.
 *
 * A Telegram user is a shop user. The first message from a new Telegram
 * account creates a shop account on the spot (username tg<id>, no password);
 * a customer who already has a web account links the two from their profile
 * page, through a signed token the bot verifies in /start.
 *
 * Screens are text plus an inline keyboard, as in lib/telegramMenu. Callback
 * data is kept short (Telegram caps it at 64 bytes): a letter for the screen,
 * then ids.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { deliversAutomatically, readLogin, tagOf } from "@/lib/accountLogin";
import { poolStock, splitCredential } from "@/lib/accountPool";
import { checkoutFailure, placeOrder, type CheckoutResult } from "@/lib/checkout";
import { db } from "@/lib/db";
import { docHtmlToPlainText, isHtmlBody } from "@/lib/docHtml";
import { LISTED_PRODUCT } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";
import { bankReady, type ShopSettings } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { readSoftwareStatus, SOFTWARE_STATUS, isSalesLocked } from "@/lib/softwareStatus";
import type { InlineButton, MenuScreen } from "@/lib/telegramMenu";
import {
  escapeTelegramHtml,
  STATUS_EMOJI,
  TELEGRAM_API_BASE,
  telegramCall,
} from "@/lib/telegramNotify";
import { makeTopUpCode, topUpExpiresAt, transferNoteFor } from "@/lib/topup";

export interface TelegramFrom {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface ShopUser {
  id: string;
  username: string;
  balance: bigint;
}

const esc = escapeTelegramHtml;
const vnd = (n: bigint | number) => `${Number(n).toLocaleString("vi-VN")}đ`;

const HOME_BUTTON: InlineButton = { text: "🏠 Menu", callback_data: "h" };
const WEB_URL = () => absoluteUrl("/");

// --- who is talking ---------------------------------------------------------

/**
 * The shop account behind a Telegram user, made on first contact. The
 * username is the Telegram id, which nobody else can claim, so the create
 * never collides; the account has no password until its owner sets one on the
 * website, and it needs none to buy here.
 */
export async function shopUserForTelegram(from: TelegramFrom): Promise<ShopUser> {
  const telegramId = String(from.id);
  const found = await db.user.findUnique({
    where: { telegramId },
    select: { id: true, username: true, balance: true },
  });
  if (found) return found;
  return db.user.create({
    data: { username: `tg${telegramId}`, telegramId },
    select: { id: true, username: true, balance: true },
  });
}

/** What to call the person: their Telegram name, or the account's username. */
export function displayName(from: TelegramFrom, user: ShopUser): string {
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  return name || user.username;
}

// --- linking a web account --------------------------------------------------

const LINK_TTL_MS = 15 * 60 * 1000;

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 32);

/**
 * A token the profile page puts in a t.me link: the shop user's id and an
 * expiry, signed with the bot's secret so only this site can mint one. The
 * bot receives it as the /start payload.
 */
export function makeLinkToken(userId: string, secret: string): string {
  const payload = b64url(`${userId}:${Date.now() + LINK_TTL_MS}`);
  return `link_${payload}.${sign(payload, secret)}`;
}

export function readLinkToken(token: string, secret: string): string | null {
  const match = /^link_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  const [, payload, given] = match;
  const want = sign(payload, secret);
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) {
    return null;
  }
  const [userId, expires] = Buffer.from(payload, "base64url").toString().split(":");
  if (!userId || Number(expires) < Date.now()) return null;
  return userId;
}

/** The t.me link the profile page shows; null until the bot is set up. */
export function linkUrl(settings: ShopSettings, userId: string): string | null {
  const bot = settings.telegramShopUsername.trim();
  const secret = settings.telegramShopSecret.trim();
  if (!bot || !secret) return null;
  return `https://t.me/${bot}?start=${makeLinkToken(userId, secret)}`;
}

/**
 * Attach a Telegram account to a web account. The Telegram side may already
 * own an account the bot created on first contact; if that one is untouched
 * (nothing bought, nothing in the wallet) it is quietly let go, otherwise
 * the two would need merging by a person and the link is refused.
 */
export async function linkTelegram(
  webUserId: string,
  from: TelegramFrom,
): Promise<"linked" | "taken" | "busy"> {
  const telegramId = String(from.id);
  const web = await db.user.findUnique({
    where: { id: webUserId },
    select: { telegramId: true },
  });
  if (!web) return "taken";
  if (web.telegramId === telegramId) return "linked";
  if (web.telegramId) return "taken";

  const current = await db.user.findUnique({
    where: { telegramId },
    select: { id: true, balance: true, _count: { select: { orders: true } } },
  });
  if (current) {
    if (current.balance !== 0n || current._count.orders > 0) return "busy";
    await db.user.update({ where: { id: current.id }, data: { telegramId: null } });
  }
  await db.user.update({ where: { id: webUserId }, data: { telegramId } });
  return "linked";
}

// --- callback data ----------------------------------------------------------

export type ShopAction =
  | { kind: "home" }
  | { kind: "cats" }
  | { kind: "cat"; id: string }
  | { kind: "product"; id: string }
  /** A tool package, with how many keys. */
  | { kind: "confirmKeys"; packageId: string; quantity: number }
  | { kind: "buyKeys"; packageId: string; quantity: number }
  /** A random listing, with how many sign-ins. */
  | { kind: "confirmPool"; productId: string; quantity: number }
  | { kind: "buyPool"; productId: string; quantity: number }
  /** A plain account, one per sale. */
  | { kind: "confirmAccount"; productId: string }
  | { kind: "buyAccount"; productId: string }
  | { kind: "wallet" }
  | { kind: "topup"; shortfall?: number }
  | { kind: "topupAmount"; amount: number }
  | { kind: "orders" }
  | { kind: "status" };

const qty = (raw: string | undefined) => Math.min(999, Math.max(1, Number(raw) || 1));

export function parseShopCallback(data: string | undefined): ShopAction | null {
  if (!data) return null;
  const [head, a, b] = data.split(":");
  switch (head) {
    case "h":
      return { kind: "home" };
    case "c":
      return a ? { kind: "cat", id: a } : { kind: "cats" };
    case "t":
      return a ? { kind: "product", id: a } : null;
    case "q":
      return a ? { kind: "confirmKeys", packageId: a, quantity: qty(b) } : null;
    case "b":
      return a ? { kind: "buyKeys", packageId: a, quantity: qty(b) } : null;
    case "pq":
      return a ? { kind: "confirmPool", productId: a, quantity: qty(b) } : null;
    case "pb":
      return a ? { kind: "buyPool", productId: a, quantity: qty(b) } : null;
    case "ac":
      return a ? { kind: "confirmAccount", productId: a } : null;
    case "ab":
      return a ? { kind: "buyAccount", productId: a } : null;
    case "w":
      return { kind: "wallet" };
    case "n":
      return a ? { kind: "topupAmount", amount: Number(a) || 0 } : { kind: "topup" };
    case "ns":
      return { kind: "topup", shortfall: Number(a) || 0 };
    case "o":
      return { kind: "orders" };
    case "s":
      return { kind: "status" };
    default:
      return null;
  }
}

// --- screens ----------------------------------------------------------------

export function homeScreen(name: string, user: ShopUser, settings: ShopSettings): MenuScreen {
  const lines = [
    `👋 Chào <b>${esc(name)}</b>!`,
    `Đây là shop <b>${esc(settings.brandName)}</b> trên Telegram: xem hàng, mua và nhận key ngay trong chat.`,
    "",
    `💰 Số dư: <b>${vnd(user.balance)}</b>`,
  ];
  return {
    text: lines.join("\n"),
    keyboard: [
      [{ text: "🛒 Mua hack", callback_data: "c" }],
      [
        { text: "💳 Nạp tiền", callback_data: "n" },
        { text: "👤 Ví của tôi", callback_data: "w" },
      ],
      [
        { text: "📦 Đơn hàng", callback_data: "o" },
        { text: "📡 Trạng thái hack", callback_data: "s" },
      ],
    ],
  };
}

export async function categoriesScreen(): Promise<MenuScreen> {
  const categories = await db.category.findMany({
    where: { products: { some: LISTED_PRODUCT } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, _count: { select: { products: { where: LISTED_PRODUCT } } } },
  });
  if (categories.length === 0) {
    return { text: "Shop chưa có sản phẩm nào.", keyboard: [[HOME_BUTTON]] };
  }
  return {
    text: "🛒 <b>Chọn game</b>",
    keyboard: [
      ...categories.map((c) => [
        { text: `${c.name} (${c._count.products})`, callback_data: `c:${c.id}` },
      ]),
      [HOME_BUTTON],
    ],
  };
}

export async function categoryScreen(categoryId: string): Promise<MenuScreen | null> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      name: true,
      products: {
        where: LISTED_PRODUCT,
        orderBy: [{ productType: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          code: true,
          productType: true,
          softwareStatus: true,
          status: true,
          price: true,
          accountPool: true,
          packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
        },
      },
    },
  });
  if (!category) return null;
  const buttons = category.products
    .filter((p) => p.status === "AVAILABLE")
    .map((p) => {
      const name = p.name ?? p.code;
      if (p.productType === "SOFTWARE_GAME") {
        const status = readSoftwareStatus(p.softwareStatus);
        const from = p.packages[0]?.price;
        return {
          text: `${status ? STATUS_EMOJI[status] : "⚪"} ${name}${from !== undefined ? ` · từ ${vnd(from)}` : ""}`,
          callback_data: `t:${p.id}`,
        };
      }
      return { text: `🎮 ${name} · ${vnd(p.price)}`, callback_data: `t:${p.id}` };
    });
  return {
    text: `<b>${esc(category.name)}</b>\n${buttons.length ? "Chọn sản phẩm:" : "Đang tạm hết hàng."}`,
    keyboard: [...buttons.map((b) => [b]), [{ text: "↩ Game khác", callback_data: "c" }, HOME_BUTTON]],
  };
}

/** The description, without its HTML and cut to a few lines. */
function blurb(description: string | null): string {
  if (!description) return "";
  // Some imported descriptions arrived entity-escaped, with the line breaks
  // flattened to a literal "rn": undo both before reading them as HTML.
  const raw = description
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/(?:\\r\\n|\brn\b)+/g, " ");
  const plain = (isHtmlBody(raw) ? docHtmlToPlainText(raw) : raw.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 240 ? `${plain.slice(0, 237)}…` : plain;
}

export async function productScreen(productId: string): Promise<MenuScreen | null> {
  const p = await db.product.findFirst({
    where: { id: productId, ...LISTED_PRODUCT },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      productType: true,
      softwareStatus: true,
      status: true,
      price: true,
      oldPrice: true,
      rank: true,
      accountPool: true,
      category: { select: { id: true, name: true } },
      packages: {
        orderBy: { price: "asc" },
        select: { id: true, label: true, price: true, durationHours: true },
      },
    },
  });
  if (!p) return null;
  const name = esc(p.name ?? p.code);
  const back = [{ text: "↩ Quay lại", callback_data: `c:${p.category.id}` }, HOME_BUTTON];

  if (p.productType === "SOFTWARE_GAME") {
    const status = readSoftwareStatus(p.softwareStatus);
    const lines = [
      `<b>${name}</b>`,
      status ? `${STATUS_EMOJI[status]} ${SOFTWARE_STATUS[status].label}` : "",
      blurb(p.description) ? `\n${esc(blurb(p.description))}` : "",
    ].filter(Boolean);
    if (status && isSalesLocked(status)) {
      lines.push("\n⛔ Tool đang tạm khóa mua key cho đến khi có bản an toàn.");
      return { text: lines.join("\n"), keyboard: [back] };
    }
    if (p.packages.length === 0) {
      lines.push("\nChưa có gói nào để bán.");
      return { text: lines.join("\n"), keyboard: [back] };
    }
    lines.push("\n<b>Chọn gói:</b>");
    return {
      text: lines.join("\n"),
      keyboard: [
        ...p.packages.map((pkg) => [
          { text: `${pkg.label} · ${vnd(pkg.price)}`, callback_data: `q:${pkg.id}:1` },
        ]),
        back,
      ],
    };
  }

  if (p.accountPool) {
    const stock = (await poolStock([p.id])).get(p.id) ?? 0;
    const lines = [
      `<b>${name}</b>`,
      `Giá: <b>${vnd(p.price)}</b> / tài khoản · còn ${stock}`,
      blurb(p.description) ? `\n${esc(blurb(p.description))}` : "",
      stock > 0 ? "\n<b>Mua bao nhiêu?</b>" : "\nĐang hết hàng, shop sẽ nhập thêm sớm.",
    ].filter(Boolean);
    const picks = [1, 2, 5, 10].filter((n) => n <= stock);
    return {
      text: lines.join("\n"),
      keyboard: [
        ...(picks.length
          ? [picks.map((n) => ({ text: `${n} acc`, callback_data: `pq:${p.id}:${n}` }))]
          : []),
        back,
      ],
    };
  }

  if (p.status !== "AVAILABLE") {
    return { text: `<b>${name}</b>\nTài khoản này đã được bán.`, keyboard: [back] };
  }
  const lines = [
    `<b>${name}</b>`,
    p.rank ? `Rank: ${esc(p.rank)}` : "",
    `Giá: <b>${vnd(p.price)}</b>${p.oldPrice > p.price ? ` (giá gốc ${vnd(p.oldPrice)})` : ""}`,
    blurb(p.description) ? `\n${esc(blurb(p.description))}` : "",
  ].filter(Boolean);
  return {
    text: lines.join("\n"),
    keyboard: [[{ text: `🛒 Mua · ${vnd(p.price)}`, callback_data: `ac:${p.id}` }], back],
  };
}

function confirmKeyboard(
  buy: string,
  minus: string | null,
  plus: string | null,
  back: string,
): InlineButton[][] {
  const stepper: InlineButton[] = [];
  if (minus) stepper.push({ text: "−1", callback_data: minus });
  if (plus) stepper.push({ text: "+1", callback_data: plus });
  return [
    [{ text: "✅ Mua ngay", callback_data: buy }],
    ...(stepper.length ? [stepper] : []),
    [{ text: "↩ Quay lại", callback_data: back }, HOME_BUTTON],
  ];
}

export async function confirmKeysScreen(
  user: ShopUser,
  packageId: string,
  quantity: number,
): Promise<MenuScreen | null> {
  const pkg = await db.productPackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      label: true,
      price: true,
      product: { select: { id: true, name: true, code: true, deletedAt: true } },
    },
  });
  if (!pkg || pkg.product.deletedAt) return null;
  const n = Math.min(99, quantity);
  const total = pkg.price * BigInt(n);
  const short = total - user.balance;
  const text = [
    `<b>${esc(pkg.product.name ?? pkg.product.code)}</b>`,
    `Gói: ${esc(pkg.label)} × ${n}`,
    `Thành tiền: <b>${vnd(total)}</b>`,
    `Số dư: ${vnd(user.balance)}${short > 0n ? ` — thiếu ${vnd(short)}` : ""}`,
  ].join("\n");
  const keyboard = confirmKeyboard(
    short > 0n ? `ns:${short}` : `b:${pkg.id}:${n}`,
    n > 1 ? `q:${pkg.id}:${n - 1}` : null,
    n < 99 ? `q:${pkg.id}:${n + 1}` : null,
    `t:${pkg.product.id}`,
  );
  if (short > 0n) keyboard[0] = [{ text: `💳 Nạp thêm ${vnd(short)}`, callback_data: `ns:${short}` }];
  return { text, keyboard };
}

export async function confirmPoolScreen(
  user: ShopUser,
  productId: string,
  quantity: number,
): Promise<MenuScreen | null> {
  const p = await db.product.findFirst({
    where: { id: productId, ...LISTED_PRODUCT, accountPool: true },
    select: { id: true, name: true, code: true, price: true },
  });
  if (!p) return null;
  const stock = (await poolStock([p.id])).get(p.id) ?? 0;
  const n = Math.max(1, Math.min(quantity, stock || 1));
  const total = p.price * BigInt(n);
  const short = total - user.balance;
  const text = [
    `<b>${esc(p.name ?? p.code)}</b>`,
    `Số lượng: ${n} tài khoản (còn ${stock})`,
    `Thành tiền: <b>${vnd(total)}</b>`,
    `Số dư: ${vnd(user.balance)}${short > 0n ? ` — thiếu ${vnd(short)}` : ""}`,
  ].join("\n");
  const keyboard = confirmKeyboard(
    `pb:${p.id}:${n}`,
    n > 1 ? `pq:${p.id}:${n - 1}` : null,
    n < stock ? `pq:${p.id}:${n + 1}` : null,
    `t:${p.id}`,
  );
  if (short > 0n) keyboard[0] = [{ text: `💳 Nạp thêm ${vnd(short)}`, callback_data: `ns:${short}` }];
  return { text, keyboard };
}

export async function confirmAccountScreen(
  user: ShopUser,
  productId: string,
): Promise<MenuScreen | null> {
  const p = await db.product.findFirst({
    where: { id: productId, ...LISTED_PRODUCT, productType: "ACCOUNT_GAME", accountPool: false },
    select: { id: true, name: true, code: true, price: true, status: true },
  });
  if (!p) return null;
  if (p.status !== "AVAILABLE") {
    return { text: "Tài khoản này vừa được bán.", keyboard: [[HOME_BUTTON]] };
  }
  const short = p.price - user.balance;
  const text = [
    `<b>${esc(p.name ?? p.code)}</b>`,
    `Thành tiền: <b>${vnd(p.price)}</b>`,
    `Số dư: ${vnd(user.balance)}${short > 0n ? ` — thiếu ${vnd(short)}` : ""}`,
  ].join("\n");
  const keyboard = confirmKeyboard(`ab:${p.id}`, null, null, `t:${p.id}`);
  if (short > 0n) keyboard[0] = [{ text: `💳 Nạp thêm ${vnd(short)}`, callback_data: `ns:${short}` }];
  return { text, keyboard };
}

// --- the sale ---------------------------------------------------------------

/** What was handed over, as lines for the chat. */
async function handoverLines(result: CheckoutResult): Promise<string[]> {
  if (result.isSoftware || result.isPool) {
    const keys = await db.licenseKey.findMany({
      where: { orderId: result.orderId },
      orderBy: { deliveredAt: "asc" },
      select: { value: true, expiresAt: true },
    });
    if (result.isPool) {
      return keys.map((k) => {
        const { username, password } = splitCredential(k.value);
        return `👤 <code>${esc(username)}</code>  🔑 <code>${esc(password)}</code>`;
      });
    }
    return keys.map(
      (k) =>
        `🔑 <code>${esc(k.value)}</code>${
          k.expiresAt && !Number.isNaN(k.expiresAt.getTime())
            ? ` · hết hạn ${k.expiresAt.toLocaleDateString("vi-VN")}`
            : ""
        }`,
    );
  }
  const order = await db.order.findUnique({
    where: { id: result.orderId },
    select: {
      product: {
        select: {
          loginUsername: true,
          loginPassword: true,
          loginNote: true,
          tags: { select: { label: true }, take: 1 },
        },
      },
    },
  });
  const product = order?.product;
  const login = product && deliversAutomatically(tagOf(product)) ? readLogin(product) : null;
  if (!login) {
    return ["Shop sẽ gửi thông tin đăng nhập cho bạn tại đây trong ít phút."];
  }
  return [
    `👤 Tài khoản: <code>${esc(login.username)}</code>`,
    `🔑 Mật khẩu: <code>${esc(login.password)}</code>`,
    ...(login.note ? [`📝 ${esc(login.note)}`] : []),
  ];
}

/**
 * Sell, and say what happened. On success the message carries the goods; on
 * a refusal it carries the reason, and for an empty wallet a button that
 * opens the top-up screen for exactly the missing amount.
 */
export async function buy(
  user: ShopUser,
  input: { code: string; packageId?: string | null; quantity?: number },
): Promise<MenuScreen> {
  try {
    const result = await placeOrder({ userId: user.id, ...input });
    const goods = await handoverLines(result);
    const pending = result.quantity - result.delivered;
    const text = [
      `✅ <b>Mua thành công</b> · đơn <code>${result.orderCode}</code>`,
      `${esc(result.productName)}${result.packageLabel ? ` — ${esc(result.packageLabel)}` : ""}${
        result.quantity > 1 ? ` × ${result.quantity}` : ""
      }`,
      `Đã trừ ${vnd(result.total)} · số dư còn ${vnd(result.balanceAfter)}`,
      "",
      ...goods,
      ...(pending > 0
        ? ["", `⏳ Còn ${pending} chưa giao, shop sẽ gửi tại đây khi có hàng.`]
        : []),
      "",
      `Đơn này cũng nằm trong lịch sử mua trên web: ${WEB_URL()}orders`,
    ].join("\n");
    return {
      text,
      keyboard: [
        [{ text: "📦 Đơn hàng của tôi", callback_data: "o" }],
        [{ text: "🛒 Mua tiếp", callback_data: "c" }, HOME_BUTTON],
      ],
    };
  } catch (error) {
    const failure = checkoutFailure(error);
    if (failure.shortfall !== undefined) {
      return {
        text: `❌ Số dư không đủ, thiếu <b>${vnd(failure.shortfall)}</b>.`,
        keyboard: [
          [{ text: `💳 Nạp ${vnd(failure.shortfall)}`, callback_data: `ns:${failure.shortfall}` }],
          [{ text: "💳 Nạp số khác", callback_data: "n" }, HOME_BUTTON],
        ],
      };
    }
    return { text: `❌ ${esc(failure.error)}`, keyboard: [[{ text: "🛒 Chọn lại", callback_data: "c" }, HOME_BUTTON]] };
  }
}

// --- wallet and top-ups -----------------------------------------------------

export async function walletScreen(user: ShopUser): Promise<MenuScreen> {
  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true, balance: true, passwordHash: true, email: true },
  });
  const lines = [
    "👤 <b>Ví của tôi</b>",
    `Số dư: <b>${vnd(fresh?.balance ?? user.balance)}</b>`,
    `Tài khoản shop: <code>${esc(fresh?.username ?? user.username)}</code>`,
    "",
    fresh?.passwordHash
      ? `Đăng nhập web bằng tài khoản này tại ${WEB_URL()}`
      : `Tài khoản này được tạo từ Telegram. Nếu bạn đã có tài khoản trên web, vào <b>Hồ sơ → Liên kết Telegram</b> trên web để dùng chung ví.`,
  ];
  return {
    text: lines.join("\n"),
    keyboard: [
      [{ text: "💳 Nạp tiền", callback_data: "n" }, { text: "📦 Đơn hàng", callback_data: "o" }],
      [HOME_BUTTON],
    ],
  };
}

/** Round up to a tidy amount a person would actually type. */
function tidy(amount: number): number {
  const step = amount >= 1_000_000 ? 100_000 : amount >= 100_000 ? 10_000 : 5_000;
  return Math.ceil(amount / step) * step;
}

export function topupScreen(settings: ShopSettings, shortfall = 0): MenuScreen {
  if (!settings.bankTopUpEnabled || !bankReady(settings)) {
    return {
      text: "Shop đang tạm ngưng nhận nạp qua ngân hàng. Liên hệ hỗ trợ để được nạp tay.",
      keyboard: [[HOME_BUTTON]],
    };
  }
  const min = Math.max(settings.topUpMin, shortfall > 0 ? tidy(shortfall) : 0);
  const presets = [20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000].filter((n) => n >= min);
  const rows: InlineButton[][] = [];
  if (shortfall > 0) {
    rows.push([{ text: `Nạp đúng số thiếu · ${vnd(tidy(shortfall))}`, callback_data: `n:${tidy(shortfall)}` }]);
  }
  for (let i = 0; i < presets.length; i += 3) {
    rows.push(presets.slice(i, i + 3).map((n) => ({ text: vnd(n), callback_data: `n:${n}` })));
  }
  rows.push([HOME_BUTTON]);
  return {
    text: [
      "💳 <b>Nạp tiền vào ví</b>",
      `Chọn số tiền, hoặc gõ số tiền muốn nạp (từ ${vnd(settings.topUpMin)}).`,
      "Tiền vào ví tự động trong khoảng 1 phút sau khi chuyển khoản.",
    ].join("\n"),
    keyboard: rows,
  };
}

export interface TopUpInstructions {
  text: string;
  /** A VietQR image for the first bank, or null when the bank has no code. */
  qrUrl: string | null;
}

/**
 * A pending top-up with the same code the website would print, and the words
 * to go with it. The buyer transfers with the note; the bank webhook credits
 * the wallet; `notifyTopUpOnTelegram` tells them here.
 */
export async function createTopUp(
  user: ShopUser,
  amount: number,
  settings: ShopSettings,
): Promise<TopUpInstructions | { error: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Số tiền không hợp lệ." };
  if (amount < settings.topUpMin) {
    return { error: `Nạp từ ${vnd(settings.topUpMin)} trở lên.` };
  }
  if (amount > 100_000_000) return { error: "Số tiền nạp tối đa 100.000.000đ một lần." };
  if (!settings.bankTopUpEnabled || !bankReady(settings)) {
    return { error: "Shop đang tạm ngưng nhận nạp qua ngân hàng." };
  }
  const topUp = await db.topUp.create({
    data: {
      code: makeTopUpCode(),
      userId: user.id,
      method: "BANK",
      amount: BigInt(Math.floor(amount)),
      status: "PENDING",
    },
  });
  const note = transferNoteFor(topUp.code);
  const bank = settings.bankAccounts[0];
  const expires = topUpExpiresAt(topUp.createdAt);
  const text = [
    `💳 <b>Chuyển khoản ${vnd(amount)}</b>`,
    "",
    ...settings.bankAccounts.map(
      (b) =>
        `🏦 ${esc(b.name)}\nSố TK: <code>${esc(b.account)}</code>\nChủ TK: ${esc(b.holder)}`,
    ),
    "",
    `📝 Nội dung chuyển khoản (bắt buộc, chép đúng):\n<code>${esc(note)}</code>`,
    "",
    `Lệnh nạp hết hạn lúc ${expires.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Tiền vào ví là bot báo ngay tại đây.`,
  ].join("\n");
  const qrUrl = bank?.code
    ? `https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(
        bank.account,
      )}-compact2.png?amount=${Math.floor(amount)}&addInfo=${encodeURIComponent(
        note,
      )}&accountName=${encodeURIComponent(bank.holder)}`
    : null;
  return { text, qrUrl };
}

/** Told once the money is in: the amount, the new balance, a way back in. */
export async function notifyTopUpOnTelegram(
  userId: string,
  amount: bigint,
  balance: bigint,
): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
    if (!user?.telegramId) return;
    const settings = await getShopSettings();
    const token = settings.telegramShopToken.trim();
    if (!token) return;
    await telegramCall(token, "sendMessage", {
      chat_id: user.telegramId,
      text: `✅ Đã nhận <b>${vnd(amount)}</b>. Số dư hiện tại: <b>${vnd(balance)}</b>.`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🛒 Mua hack", callback_data: "c" }, HOME_BUTTON]],
      },
    });
  } catch (error) {
    console.error("[telegram-shop] top-up notice failed", error);
  }
}

// --- orders and status ------------------------------------------------------

export async function ordersScreen(user: ShopUser): Promise<MenuScreen> {
  const orders = await db.order.findMany({
    where: { userId: user.id, status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      code: true,
      total: true,
      quantity: true,
      createdAt: true,
      product: { select: { name: true, code: true, productType: true, accountPool: true } },
      package: { select: { label: true } },
      licenseKeys: { orderBy: { deliveredAt: "asc" }, select: { value: true } },
    },
  });
  if (orders.length === 0) {
    return {
      text: "📦 Bạn chưa có đơn hàng nào.",
      keyboard: [[{ text: "🛒 Mua hack", callback_data: "c" }, HOME_BUTTON]],
    };
  }
  const blocks = orders.map((o) => {
    const head = `<b>${o.code}</b> · ${o.createdAt.toLocaleDateString("vi-VN")} · ${vnd(o.total)}\n${esc(
      o.product.name ?? o.product.code,
    )}${o.package && !o.product.accountPool ? ` — ${esc(o.package.label)}` : ""}${
      o.quantity > 1 ? ` × ${o.quantity}` : ""
    }`;
    const keys = o.licenseKeys.slice(0, 10).map((k) => {
      if (o.product.accountPool) {
        const { username, password } = splitCredential(k.value);
        return `  👤 <code>${esc(username)}</code>  🔑 <code>${esc(password)}</code>`;
      }
      return `  🔑 <code>${esc(k.value)}</code>`;
    });
    const more = o.licenseKeys.length > 10 ? [`  … và ${o.licenseKeys.length - 10} key nữa (xem trên web)`] : [];
    return [head, ...keys, ...more].join("\n");
  });
  return {
    text: ["📦 <b>5 đơn gần nhất</b>", "", ...blocks, "", `Đầy đủ tại ${WEB_URL()}orders`].join("\n\n").replace(/\n\n\n/g, "\n\n"),
    keyboard: [[{ text: "🛒 Mua tiếp", callback_data: "c" }, HOME_BUTTON]],
  };
}

export async function statusScreen(): Promise<MenuScreen> {
  const tools = await db.product.findMany({
    where: { ...LISTED_PRODUCT, productType: "SOFTWARE_GAME" },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    select: { name: true, code: true, softwareStatus: true, category: { select: { name: true } } },
  });
  const byCategory = new Map<string, string[]>();
  for (const t of tools) {
    const status = readSoftwareStatus(t.softwareStatus);
    const line = `${status ? STATUS_EMOJI[status] : "⚪"} ${esc(t.name ?? t.code)}${
      status ? ` — ${SOFTWARE_STATUS[status].label}` : ""
    }`;
    byCategory.set(t.category.name, [...(byCategory.get(t.category.name) ?? []), line]);
  }
  const blocks = [...byCategory].map(([name, lines]) => [`<b>${esc(name)}</b>`, ...lines].join("\n"));
  return {
    text: ["📡 <b>Trạng thái hack</b>", "", ...blocks].join("\n\n"),
    keyboard: [[{ text: "🛒 Mua hack", callback_data: "c" }, HOME_BUTTON]],
  };
}

export function helpText(settings: ShopSettings): string {
  return [
    `🤖 <b>Bot bán hàng ${esc(settings.brandName)}</b>`,
    "",
    "/menu — màn hình chính",
    "/vi — số dư và tài khoản",
    "/nap 50000 — tạo lệnh nạp 50.000đ",
    "/donhang — 5 đơn gần nhất và key",
    "/trangthai — trạng thái từng hack",
    "",
    `Web: ${WEB_URL()}`,
  ].join("\n");
}

// --- setting the bot up -----------------------------------------------------

/**
 * Point the bot at this site and give it a "/" menu. Run when the token is
 * saved in Cấu hình. Returns the bot's @handle, which the profile page needs
 * for its link, or null when Telegram would not say.
 */
export async function setUpShopBot(token: string, secret: string): Promise<string | null> {
  await telegramCall(token, "setWebhook", {
    url: absoluteUrl("/api/integrations/telegram-shop"),
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  await telegramCall(token, "setMyCommands", {
    commands: [
      { command: "menu", description: "Màn hình chính" },
      { command: "vi", description: "Số dư và tài khoản" },
      { command: "nap", description: "Nạp tiền vào ví" },
      { command: "donhang", description: "Đơn hàng và key đã mua" },
      { command: "trangthai", description: "Trạng thái từng hack" },
      { command: "help", description: "Hướng dẫn" },
    ],
  });
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getMe`);
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { username?: string } };
    return data.result?.username ?? null;
  } catch {
    return null;
  }
}
