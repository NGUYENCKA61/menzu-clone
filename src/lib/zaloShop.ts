import "server-only";

import { checkoutFailure, placeOrder } from "@/lib/checkout";
import { db } from "@/lib/db";
import { dayTime } from "@/lib/dayGroups";
import { docHtmlToPlainText } from "@/lib/docHtml";
import { shopDateTime, vnd, zaloReceiptMessage } from "@/lib/emailTemplates";
import { readMemberTier, TIER_RULES } from "@/lib/memberTiers";
import { receiptFor } from "@/lib/orderReceipt";
import {
  LISTED_PRODUCT,
  runningPackageSales,
  tierPriceNow,
} from "@/lib/queries";
import { productHref } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { bankReady, banksShown, type ShopSettings } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import {
  isSalesLocked,
  readSoftwareStatus,
  SOFTWARE_STATUS,
} from "@/lib/softwareStatus";
import { makeTopUpCode, topUpExpiresAt, transferNoteFor } from "@/lib/topup";
import { openBankTopUp } from "@/lib/topupOpen";
import {
  confirmPhoneOtpFromZalo,
  type ZaloPhoneProof,
} from "@/lib/verification";
import { maskPhone } from "@/lib/verificationRules";
import type { ZaloInboundAnswer, ZaloShopReply } from "@/lib/zaloInbound";
import { LINK_WORD, ZALO_STYLE } from "@/lib/zaloShared";
import {
  clip,
  parseZaloCommand,
  readChatState,
  tidyAmount,
  ZaloText,
  type ZaloChatState,
} from "@/lib/zaloShopRules";

/**
 * The shop on Zalo (the owner, 13/10/2026: "làm bot mua bán trên zalo đc k",
 * then "làm bot zalo thử"): the same catalogue, wallet and sale as the website
 * and the Telegram bot, driven by typed words and numbers because a personal
 * Zalo account has no buttons.
 *
 * Anyone may look ("SHOP"); buying, topping up and reading a balance need the
 * Zalo linked to a web account first (LIENKET, which the bot handles itself),
 * so every sale lands on a real account with its email for the receipt and its
 * tier for the discount. Keys come back in the chat; an account's sign-in
 * never does (see orderReceipt).
 */

const BOLD = ZALO_STYLE.bold;
const RED = ZALO_STYLE.red;
const BIG = ZALO_STYLE.big;

/** What the Zalo shop sells: tools on sale. Accounts stay on the website. */
const SELLABLE = {
  ...LISTED_PRODUCT,
  productType: "SOFTWARE_GAME",
  status: "AVAILABLE",
} as const;

/** A price is a price above the free tools' 1đ placeholder. */
const PAID = (price: number) => price > 1;

interface Buyer {
  id: string;
  username: string;
  balance: number;
  tier: string;
}

/** Last time each chat was told "not understood", so a chatty one is not answered on every line. */
const lastPuzzled = new Map<string, number>();
const PUZZLED_GAP_MS = 60_000;

function reply(text: ZaloText): ZaloShopReply {
  return text.done();
}

function plain(words: string): ZaloShopReply {
  return { text: words };
}

function host(): string {
  try {
    return new URL(absoluteUrl("/")).host;
  } catch {
    return absoluteUrl("/");
  }
}

export async function handleZaloMessage(input: {
  zaloId: string;
  name: string | null;
  text: string;
  state: unknown;
}): Promise<ZaloInboundAnswer> {
  const now = Date.now();
  const settings = await getShopSettings();
  const row = await db.user.findUnique({
    where: { zaloId: input.zaloId },
    select: {
      id: true,
      username: true,
      balance: true,
      tier: true,
      blockedAt: true,
    },
  });
  if (row?.blockedAt) {
    return {
      replies: [
        plain(
          "Tài khoản liên kết với Zalo này đang bị khoá. Liên hệ shop qua web để được hỗ trợ.",
        ),
      ],
      state: null,
    };
  }
  const buyer: Buyer | null = row
    ? {
        id: row.id,
        username: row.username,
        balance: Number(row.balance),
        tier: row.tier,
      }
    : null;
  const command = parseZaloCommand(input.text);
  const state = readChatState(input.state, now);

  switch (command.kind) {
    case "menu":
      return { replies: [menu(settings, buyer, input.name)], state };
    case "shop":
      return categories(now);
    case "cancel":
      return {
        replies: [
          reply(
            new ZaloText()
              .add("Đã huỷ. Gõ ")
              .add("MENU", BOLD)
              .add(" để xem các lệnh."),
          ),
        ],
        state: null,
      };
    case "pick":
      return pick(command.n, state, buyer, now);
    case "ok":
      if (state?.step !== "confirm") {
        return {
          replies: [
            reply(
              new ZaloText()
                .add("Chưa có gì để xác nhận. Gõ ")
                .add("SHOP", BOLD)
                .add(" để chọn hàng."),
            ),
          ],
          state,
        };
      }
      if (!buyer) return { replies: [linkFirst()], state: null };
      return buy(state, buyer);
    case "topup":
      if (!buyer) return { replies: [linkFirst()], state };
      return { replies: await topUp(buyer, command.amount, settings), state };
    case "balance":
      if (!buyer) return { replies: [linkFirst()], state };
      return { replies: [balance(buyer)], state };
    case "orders":
      if (!buyer) return { replies: [linkFirst()], state };
      return orders(buyer, now);
    case "verify": {
      const proof = await confirmPhoneOtpFromZalo(input.zaloId, command.code);
      // Six digits alone, with no code waiting for them, are not a code at all.
      if (
        command.bare &&
        (proof.kind === "not_linked" || proof.kind === "no_code")
      ) {
        return puzzled(input.zaloId, now, state);
      }
      return { replies: [phoneProofReply(proof)], state };
    }
    case "unknown":
      return puzzled(input.zaloId, now, state);
  }
}

/** "Not understood", once a minute per chat, so a chatty one is not answered on every line. */
function puzzled(
  zaloId: string,
  now: number,
  state: ZaloChatState | null,
): ZaloInboundAnswer {
  const last = lastPuzzled.get(zaloId) ?? 0;
  if (now - last < PUZZLED_GAP_MS) return { replies: [], state };
  lastPuzzled.set(zaloId, now);
  if (lastPuzzled.size > 5_000) lastPuzzled.clear();
  return {
    replies: [
      reply(
        new ZaloText()
          .add("Shop chưa hiểu lệnh này. Gõ ")
          .add("MENU", BOLD)
          .add(" để xem các lệnh, hoặc ")
          .add("SHOP", BOLD)
          .add(" để xem hàng."),
      ),
    ],
    state,
  };
}

/**
 * The answer to a phone code for "xác thực cấp 2" (src/lib/verification.ts
 * confirmPhoneOtpFromZalo): the customer sent it here from their linked Zalo,
 * and this is the only message the bot writes about it.
 */
function phoneProofReply(proof: ZaloPhoneProof): ZaloShopReply {
  const t = new ZaloText();
  switch (proof.kind) {
    case "not_linked":
      t.add("Zalo này chưa liên kết với tài khoản web nào, nên chưa xác minh số điện thoại được.", BOLD);
      t.line(`Liên kết trước: đăng nhập ${host()}, vào Bảo mật › Liên kết › Zalo, bấm lấy mã rồi gửi vào đây theo mẫu `).add(`${LINK_WORD} mã-của-bạn`, BOLD);
      t.add(". Sau đó lấy mã xác minh số ở Bảo mật › Xác thực cấp 2 và gửi lại.");
      break;
    case "already_verified":
      t.add(`Tài khoản ${proof.username} đã ở cấp 2 rồi, không cần xác minh lại.`);
      break;
    case "no_code":
      t.add(`Chưa có mã nào đang chờ cho tài khoản ${proof.username}, hoặc mã đã hết hạn.`, BOLD);
      t.line(`Vào ${host()} › Bảo mật › Xác thực cấp 2, bấm Lấy mã rồi gửi mã mới vào đây.`);
      break;
    case "too_many":
      t.add("Gửi sai mã quá nhiều lần.", BOLD);
      t.line("Vào web bấm Lấy mã khác rồi gửi mã mới vào đây.");
      break;
    case "wrong":
      t.add(
        proof.left > 0
          ? `Mã không đúng, còn ${proof.left} lần thử. Gửi đúng mã đang hiện trên web.`
          : "Mã không đúng và đã hết lượt thử. Vào web bấm Lấy mã khác.",
      );
      break;
    case "checking":
      t.add(`Shop đang kiểm tra số ${maskPhone(proof.phone)}.`, BOLD);
      t.line("Bạn gửi lại mã này sau khoảng 10 giây nhé.");
      break;
    case "refused":
      t.add(`${proof.reason.replace(/[.!]+$/, "")}.`, BOLD);
      t.line(`Số bạn nhập: ${maskPhone(proof.phone)}. Vào web nhập đúng số điện thoại của Zalo đang nhắn rồi bấm Lấy mã khác.`);
      break;
    case "proved":
      t.add(`Đã xác minh số ${maskPhone(proof.phone)} cho tài khoản ${proof.username}.`, BOLD);
      t.line("Quay lại web để gửi hồ sơ xác thực cấp 2; shop duyệt trong giờ hỗ trợ.");
      break;
  }
  return reply(t);
}

// ---- the menu and the link ---------------------------------------------------------

function menu(
  settings: ShopSettings,
  buyer: Buyer | null,
  name: string | null,
): ZaloShopReply {
  const t = new ZaloText().add(`${settings.brandName} trên Zalo`, BOLD, BIG);
  if (buyer) {
    t.line(`Chào ${name?.trim() || buyer.username}. Số dư: `).add(
      vnd(buyer.balance),
      BOLD,
    );
    t.line();
    const rows: [string, string][] = [
      ["SHOP", "xem và mua hack"],
      ["NAP 100000", "nạp tiền vào ví"],
      ["SODU", "số dư và hạng thành viên"],
      ["DON", "đơn đã mua, xem lại key"],
      ["HUY", "huỷ thao tác đang làm"],
    ];
    for (const [word, what] of rows) t.line(word, BOLD).add(`  ${what}`);
    t.line();
    t.line("Mua xong, key gửi ngay tại đây và vào email của bạn.");
    return reply(t);
  }
  t.line("Gõ ").add("SHOP", BOLD).add(" để xem hack và bảng giá.");
  t.line();
  appendLinkSteps(t);
  return reply(t);
}

function appendLinkSteps(t: ZaloText): void {
  t.line("Muốn mua và nhận key ngay tại đây, liên kết tài khoản web một lần:");
  t.line(`1. Đăng nhập ${host()}, vào Bảo mật › Liên kết › Zalo, bấm lấy mã.`);
  t.line("2. Gửi vào đây: ").add(`${LINK_WORD} mã-của-bạn`, BOLD);
  t.line(`Chưa có tài khoản: ${absoluteUrl("/signup")}`);
}

function linkFirst(): ZaloShopReply {
  const t = new ZaloText().add("Bạn cần liên kết tài khoản web trước.", BOLD);
  t.line();
  appendLinkSteps(t);
  return reply(t);
}

// ---- the catalogue ---------------------------------------------------------------

async function categories(now: number): Promise<ZaloInboundAnswer> {
  const rows = await db.category.findMany({
    where: { products: { some: SELLABLE } },
    orderBy: { sortOrder: "asc" },
    take: 40,
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: SELLABLE } } },
    },
  });
  if (rows.length === 0) {
    return { replies: [plain("Shop chưa có tool nào đang bán.")], state: null };
  }
  const t = new ZaloText().add("Chọn game, gõ số:", BOLD);
  rows.forEach((c, i) =>
    t.line(`${i + 1}. ${clip(c.name, 56)} (${c._count.products})`),
  );
  return {
    replies: [reply(t)],
    state: {
      step: "categories",
      ids: rows.map((c) => c.id),
      at: now,
    } satisfies ZaloChatState,
  };
}

async function products(
  categoryId: string,
  now: number,
): Promise<ZaloInboundAnswer> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      name: true,
      products: {
        where: SELLABLE,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          name: true,
          code: true,
          softwareStatus: true,
          packages: { select: { id: true, price: true } },
        },
      },
    },
  });
  if (!category || category.products.length === 0) {
    return {
      replies: [
        reply(
          new ZaloText()
            .add("Game này đang tạm hết tool. Gõ ")
            .add("SHOP", BOLD)
            .add(" để chọn game khác."),
        ),
      ],
      state: null,
    };
  }
  const sale = await runningPackageSales(
    category.products.flatMap((p) => p.packages.map((k) => k.id)),
  );
  const t = new ZaloText().add(clip(category.name, 56), BOLD);
  t.line("Chọn tool, gõ số:");
  category.products.forEach((p, i) => {
    const prices = p.packages
      .map((k) => Number(tierPriceNow(k, sale)))
      .filter(PAID);
    const status = readSoftwareStatus(p.softwareStatus);
    const price =
      prices.length > 0
        ? `từ ${vnd(Math.min(...prices))}`
        : p.packages.length > 0
          ? "miễn phí trên web"
          : "chưa có gói";
    const note = status
      ? isSalesLocked(status)
        ? "tạm khoá"
        : SOFTWARE_STATUS[status].label
      : null;
    t.line(
      `${i + 1}. ${clip(p.name ?? p.code)} · ${price}${note ? ` · ${note}` : ""}`,
    );
  });
  t.line("Gõ ").add("SHOP", BOLD).add(" để chọn game khác.");
  return {
    replies: [reply(t)],
    state: {
      step: "products",
      ids: category.products.map((p) => p.id),
      categoryId,
      at: now,
    } satisfies ZaloChatState,
  };
}

async function packages(
  productId: string,
  back: ZaloChatState | null,
  now: number,
): Promise<ZaloInboundAnswer> {
  const p = await db.product.findFirst({
    where: { id: productId, ...SELLABLE },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      description: true,
      softwareStatus: true,
      category: { select: { slug: true } },
      packages: {
        orderBy: { price: "asc" },
        select: { id: true, label: true, price: true },
      },
    },
  });
  if (!p) {
    return {
      replies: [
        reply(
          new ZaloText()
            .add("Tool này không còn bán. Gõ ")
            .add("SHOP", BOLD)
            .add(" để xem lại."),
        ),
      ],
      state: null,
    };
  }
  const name = p.name ?? p.code;
  const link = absoluteUrl(productHref(p.category.slug, p.slug));
  const status = readSoftwareStatus(p.softwareStatus);
  const sale = await runningPackageSales(p.packages.map((k) => k.id));
  const paid = p.packages
    .map((k) => ({
      ...k,
      now: Number(tierPriceNow(k, sale)),
      list: Number(k.price),
    }))
    .filter((k) => PAID(k.now));

  const t = new ZaloText().add(name, BOLD);
  if (status) t.line(`Trạng thái: ${SOFTWARE_STATUS[status].label}`);
  const blurb = p.description ? docHtmlToPlainText(p.description, 160) : "";
  if (blurb) t.line(blurb);

  if (status && isSalesLocked(status)) {
    t.line();
    t.line(
      "Tool đang tạm khoá mua cho đến khi có bản an toàn. Theo dõi trạng thái trên web.",
    );
    return { replies: [reply(t)], state: back };
  }
  if (paid.length === 0) {
    t.line();
    t.line(
      p.packages.length > 0
        ? `Tool miễn phí, nhận key trên web: ${link}`
        : "Tool chưa có gói để bán.",
    );
    return { replies: [reply(t)], state: back };
  }
  t.line();
  t.line("Chọn gói, gõ số:", BOLD);
  paid.forEach((k, i) => {
    t.line(`${i + 1}. ${k.label} · `).add(vnd(k.now), BOLD);
    if (k.now < k.list)
      t.add(` (giảm ${Math.round(((k.list - k.now) * 100) / k.list)}%)`);
  });
  t.line(`Chi tiết: ${link}`);
  return {
    replies: [reply(t)],
    state: {
      step: "packages",
      ids: paid.map((k) => k.id),
      productId: p.id,
      at: now,
    } satisfies ZaloChatState,
  };
}

async function pick(
  n: number,
  state: ZaloChatState | null,
  buyer: Buyer | null,
  now: number,
): Promise<ZaloInboundAnswer> {
  if (!state || state.step === "confirm") {
    return {
      replies: [
        reply(
          new ZaloText()
            .add("Gõ ")
            .add("SHOP", BOLD)
            .add(" để xem danh sách trước, rồi gõ số."),
        ),
      ],
      state,
    };
  }
  const id = state.ids[n - 1];
  if (!id) {
    return { replies: [plain(`Chọn số từ 1 đến ${state.ids.length}.`)], state };
  }
  switch (state.step) {
    case "categories":
      return products(id, now);
    case "products":
      return packages(id, state, now);
    case "packages":
      if (!buyer) return { replies: [linkFirst()], state };
      return confirm(state.productId, id, buyer, now);
    case "orders":
      if (!buyer) return { replies: [linkFirst()], state: null };
      return { replies: await replay(id, buyer), state };
  }
}

// ---- buying ------------------------------------------------------------------------

async function confirm(
  productId: string,
  packageId: string,
  buyer: Buyer,
  now: number,
): Promise<ZaloInboundAnswer> {
  const pkg = await db.productPackage.findFirst({
    where: { id: packageId, product: { id: productId, ...SELLABLE } },
    select: {
      id: true,
      label: true,
      price: true,
      product: { select: { name: true, code: true } },
    },
  });
  if (!pkg) {
    return {
      replies: [
        reply(
          new ZaloText()
            .add("Gói này không còn bán. Gõ ")
            .add("SHOP", BOLD)
            .add(" để chọn lại."),
        ),
      ],
      state: null,
    };
  }
  const sale = await runningPackageSales([pkg.id]);
  const price = Number(tierPriceNow(pkg, sale));
  const tierPct = TIER_RULES[readMemberTier(buyer.tier)].discountPercent;
  const t = new ZaloText().add("Xác nhận mua", BOLD, BIG);
  t.line(pkg.product.name ?? pkg.product.code, BOLD);
  t.line(`Gói ${pkg.label}`);
  t.line("Giá: ").add(vnd(price), BOLD, RED);
  if (tierPct > 0) {
    t.line(
      `Hạng ${TIER_RULES[readMemberTier(buyer.tier)].label} được giảm thêm ${tierPct}% khi thanh toán.`,
    );
  }
  t.line(`Số dư: ${vnd(buyer.balance)}`);
  if (buyer.balance >= price) {
    t.line();
    t.line("Gõ ")
      .add("OK", BOLD)
      .add(" để thanh toán, ")
      .add("HUY", BOLD)
      .add(" để bỏ.");
  } else {
    const short = price - buyer.balance;
    t.line("Còn thiếu: ").add(vnd(short), BOLD);
    t.line();
    t.line("Gõ ")
      .add(`NAP ${tidyAmount(short)}`, BOLD)
      .add(" để nạp. Tiền vào ví rồi gõ ")
      .add("OK", BOLD)
      .add(".");
  }
  return {
    replies: [reply(t)],
    state: {
      step: "confirm",
      productId,
      packageId: pkg.id,
      at: now,
    } satisfies ZaloChatState,
  };
}

async function buy(
  state: Extract<ZaloChatState, { step: "confirm" }>,
  buyer: Buyer,
): Promise<ZaloInboundAnswer> {
  const product = await db.product.findUnique({
    where: { id: state.productId },
    select: { code: true },
  });
  if (!product) {
    return {
      replies: [plain("Tool này không còn bán. Gõ SHOP để chọn lại.")],
      state: null,
    };
  }
  try {
    const result = await placeOrder({
      userId: buyer.id,
      code: product.code,
      packageId: state.packageId,
      quantity: 1,
      quietZalo: true,
    });
    const receipt = await receiptFor([result.orderId]);
    const replies: ZaloShopReply[] = [
      receipt
        ? zaloReceiptMessage(receipt.data)
        : plain(
            `Mua thành công, đơn ${result.orderCode}. Key nằm trong Lịch sử mua trên web.`,
          ),
      reply(
        new ZaloText()
          .add("Số dư còn: ")
          .add(vnd(Number(result.balanceAfter)), BOLD)
          .add(". Gõ ")
          .add("SHOP", BOLD)
          .add(" để mua tiếp."),
      ),
    ];
    return { replies, state: null };
  } catch (error) {
    const failure = checkoutFailure(error);
    const t = new ZaloText().add(failure.error);
    if (failure.shortfall !== undefined) {
      t.line("Gõ ")
        .add(`NAP ${tidyAmount(failure.shortfall)}`, BOLD)
        .add(" để nạp. Tiền vào ví rồi gõ ")
        .add("OK", BOLD)
        .add(".");
      return { replies: [reply(t)], state };
    }
    return { replies: [reply(t)], state: null };
  }
}

// ---- the wallet ----------------------------------------------------------------------

function balance(buyer: Buyer): ZaloShopReply {
  const t = new ZaloText().add("Số dư: ").add(vnd(buyer.balance), BOLD, BIG);
  t.line(
    `Tài khoản web: ${buyer.username}, hạng ${TIER_RULES[readMemberTier(buyer.tier)].label}`,
  );
  t.line("Gõ ")
    .add("NAP 100000", BOLD)
    .add(" để nạp thêm, ")
    .add("SHOP", BOLD)
    .add(" để mua.");
  return reply(t);
}

async function topUp(
  buyer: Buyer,
  amount: number | null,
  settings: ShopSettings,
): Promise<ZaloShopReply[]> {
  if (!settings.bankTopUpEnabled || !bankReady(settings)) {
    return [
      plain(
        "Shop đang tạm ngưng nạp qua ngân hàng. Liên hệ hỗ trợ trên web để được nạp tay.",
      ),
    ];
  }
  if (amount === null) {
    return [
      reply(
        new ZaloText()
          .add("Gõ NAP và số tiền, ví dụ ")
          .add("NAP 100000", BOLD)
          .add(" hoặc ")
          .add("NAP 100k", BOLD)
          .add(`. Nạp từ ${vnd(settings.topUpMin)}.`),
      ),
    ];
  }
  if (amount < settings.topUpMin)
    return [plain(`Nạp từ ${vnd(settings.topUpMin)} trở lên.`)];
  if (amount > 100_000_000)
    return [plain("Số tiền nạp tối đa 100.000.000đ một lần.")];

  // One open invoice at a time, as on the website: an unpaid one is shown
  // again rather than a second opened beside it.
  const unpaid = await openBankTopUp(buyer.id);
  const invoice = unpaid
    ? {
        code: unpaid.code,
        amount: Number(unpaid.amount),
        createdAt: unpaid.createdAt,
      }
    : await db.topUp
        .create({
          data: {
            code: makeTopUpCode(),
            userId: buyer.id,
            method: "BANK",
            amount: BigInt(Math.floor(amount)),
            status: "PENDING",
          },
          select: { code: true, amount: true, createdAt: true },
        })
        .then((row) => ({
          code: row.code,
          amount: Number(row.amount),
          createdAt: row.createdAt,
        }));

  const note = transferNoteFor(invoice.code);
  const t = new ZaloText();
  if (unpaid)
    t.add("Bạn còn một lệnh nạp chưa thanh toán, dùng lại lệnh này:").line();
  t.add(`Nạp ${vnd(invoice.amount)} vào ví`, BOLD, BIG);
  const shown = banksShown(settings, invoice.createdAt);
  for (const bank of shown) {
    t.line();
    t.line(`Ngân hàng: ${bank.name}`);
    t.line("Số tài khoản: ").add(bank.account, BOLD);
    t.line(`Chủ tài khoản: ${bank.holder}`);
  }
  t.line();
  t.line("Số tiền: ").add(vnd(invoice.amount), BOLD);
  t.line("Nội dung chuyển khoản (bắt buộc): ").add(note, BOLD, RED);
  t.line(
    `Lệnh giữ đến ${dayTime(topUpExpiresAt(invoice.createdAt))}. Tiền vào ví là bot báo tại đây.`,
  );
  t.line(
    `Hoá đơn: ${absoluteUrl(`/wallet/${encodeURIComponent(invoice.code)}`)}`,
  );

  const replies: ZaloShopReply[] = [reply(t), plain(note)];
  const bank = shown[0];
  if (bank?.code) {
    replies.push({
      text: "Quét mã QR để chuyển khoản",
      imageUrl: `https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(
        bank.account,
      )}-compact2.png?amount=${Math.floor(invoice.amount)}&addInfo=${encodeURIComponent(
        note,
      )}&accountName=${encodeURIComponent(bank.holder)}`,
    });
  }
  return replies;
}

// ---- orders ------------------------------------------------------------------------

async function orders(buyer: Buyer, now: number): Promise<ZaloInboundAnswer> {
  const rows = await db.order.findMany({
    where: { userId: buyer.id, status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      code: true,
      createdAt: true,
      product: { select: { name: true, code: true } },
      package: { select: { label: true } },
    },
  });
  if (rows.length === 0) {
    return {
      replies: [
        reply(
          new ZaloText()
            .add("Bạn chưa có đơn nào. Gõ ")
            .add("SHOP", BOLD)
            .add(" để mua."),
        ),
      ],
      state: null,
    };
  }
  const t = new ZaloText().add("Đơn gần đây, gõ số để xem lại key:", BOLD);
  rows.forEach((o, i) =>
    t.line(
      `${i + 1}. ${o.code} · ${clip(o.product.name ?? o.product.code, 40)}${
        o.package ? ` · ${o.package.label}` : ""
      } · ${shopDateTime(o.createdAt)}`,
    ),
  );
  t.line(`Tất cả đơn: ${absoluteUrl("/orders")}`);
  return {
    replies: [reply(t)],
    state: {
      step: "orders",
      ids: rows.map((o) => o.id),
      at: now,
    } satisfies ZaloChatState,
  };
}

/** One of the buyer's own orders, printed again as its receipt. */
async function replay(orderId: string, buyer: Buyer): Promise<ZaloShopReply[]> {
  const own = await db.order.findFirst({
    where: { id: orderId, userId: buyer.id, status: "PAID" },
    select: { id: true },
  });
  if (!own)
    return [plain("Không tìm thấy đơn này. Gõ DON để xem lại danh sách.")];
  const receipt = await receiptFor([own.id]);
  return receipt
    ? [zaloReceiptMessage(receipt.data)]
    : [plain("Không đọc được đơn này, thử lại sau.")];
}
