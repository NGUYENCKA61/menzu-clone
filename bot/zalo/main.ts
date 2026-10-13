/**
 * The Zalo notice bot: a spare personal Zalo account, signed in through the
 * unofficial web client (zca-js), that sends each linked customer their
 * notices and ties a customer's Zalo to their web account when they send a
 * link code (the owner, 12/10/2026: "Tạo bot cho Zalo vì tôi k có tài khoản
 * oa", "Tôi dùng Zalo phụ").
 *
 * What it does, and nothing more:
 *   - drains zalo_outbox: one message every SEND_GAP_MS, three tries each;
 *   - answers "LIENKET <code>" by linking the sender to the code's account;
 *   - answers anything else with one short help text per chat per 6 hours;
 *   - reports its standing (waiting for a QR scan / online / offline) into
 *     the settings row Admin → Cấu hình reads.
 *
 * Run from the repo root:  node --env-file=.env --import tsx bot/zalo/main.ts
 * Env: DATABASE_URL; ZALO_DATA_DIR (session file; default ./.zalo);
 * ZALO_QR_DIR (where the QR picture is written so the admin page can show it;
 * default ./public/uploads/zalo, served at /uploads/zalo).
 *
 * An unofficial client can get the account locked; that is why it is a spare
 * account, and why this file never sends anything a customer did not ask the
 * web for.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  LoginQRCallbackEventType,
  ThreadType,
  Zalo,
  type API,
  type Credentials,
} from "zca-js";

import {
  linkMessage,
  readLinkMessage,
  readZaloStyles,
  ZALO_STATE_KEY,
  type ZaloBotState,
} from "../../src/lib/zaloShared";
import { createGroupManager, type GroupMessage } from "./group";

/** zca-js's style range, which its index does not export by name. */
type Style = NonNullable<
  Exclude<Parameters<API["sendMessage"]>[0], string>["styles"]
>[number];

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
const DATA_DIR = process.env.ZALO_DATA_DIR ?? path.join(process.cwd(), ".zalo");
const QR_DIR =
  process.env.ZALO_QR_DIR ??
  path.join(process.cwd(), "public", "uploads", "zalo");
const QR_URL_BASE = "/uploads/zalo";
const SESSION_FILE = path.join(DATA_DIR, "session.json");

/** A breath between two sends: a person's pace, not a flood's. */
const SEND_GAP_MS = 1500;
const POLL_MS = 3000;
const MAX_ATTEMPTS = 3;
/** Once per chat per six hours: a stranger's "hello" earns one answer, not an echo. */
const HELP_GAP_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const QR_RETRIES = 30;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...parts: unknown[]) =>
  console.log(new Date().toISOString(), "[zalo]", ...parts);

let api: API | null = null;
let ownName: string | null = null;
/** The group minder, alive while the session is. */
let group: ReturnType<typeof createGroupManager> | null = null;
/** The shop's own hostname, so its links in the group are never spam. */
const SITE_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();
let stopping = false;
const lastHelpAt = new Map<string, number>();

// ---- standing, for Admin → Cấu hình -----------------------------------------

async function report(
  state: ZaloBotState["state"],
  extra: Partial<ZaloBotState> = {},
): Promise<void> {
  const value: ZaloBotState = {
    state,
    qrUrl: extra.qrUrl ?? null,
    name: extra.name ?? ownName,
    at: new Date().toISOString(),
    note: extra.note ?? null,
    groups: extra.groups ?? group?.snapshot(),
  };
  try {
    await db.setting.upsert({
      where: { key: ZALO_STATE_KEY },
      update: { value: JSON.stringify(value) },
      create: { key: ZALO_STATE_KEY, value: JSON.stringify(value) },
    });
  } catch (error) {
    log("could not report standing:", (error as Error).message);
  }
}

async function brandName(): Promise<string> {
  const row = await db.setting
    .findUnique({ where: { key: "brand.name" } })
    .catch(() => null);
  return row?.value?.trim() || "Shop";
}

// ---- session ---------------------------------------------------------------

function readSession(): Credentials | null {
  try {
    const raw = JSON.parse(
      fs.readFileSync(SESSION_FILE, "utf8"),
    ) as Credentials;
    if (raw && raw.imei && raw.userAgent && raw.cookie) return raw;
  } catch {
    // No session yet, or an unreadable one: a QR scan makes a new one.
  }
  return null;
}

function writeSession(creds: Credentials): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(creds), { mode: 0o600 });
}

function clearQrFiles(): void {
  try {
    for (const name of fs.readdirSync(QR_DIR)) {
      if (/^qr-[a-z0-9]+\.png$/i.test(name))
        fs.rmSync(path.join(QR_DIR, name), { force: true });
    }
  } catch {
    // Nothing to clear.
  }
}

/** Sign in: the saved session first, else a QR the owner scans from Cấu hình. */
async function signIn(): Promise<API> {
  const zalo = new Zalo({
    selfListen: false,
    checkUpdate: false,
    logging: false,
  });
  const saved = readSession();
  if (saved) {
    try {
      const got = await zalo.login(saved);
      log("signed in with the saved session");
      return got;
    } catch (error) {
      log("saved session refused, asking for a QR:", (error as Error).message);
      fs.rmSync(SESSION_FILE, { force: true });
    }
  }

  fs.mkdirSync(QR_DIR, { recursive: true });
  clearQrFiles();
  let retries = 0;
  const got = await zalo.loginQR({}, async (event) => {
    try {
      if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
        const file = `qr-${randomBytes(6).toString("hex")}.png`;
        clearQrFiles();
        await event.actions.saveToFile(path.join(QR_DIR, file));
        const qrUrl = `${QR_URL_BASE}/${file}`;
        log("QR ready at", qrUrl, "(scan it with the spare Zalo account)");
        await report("qr", {
          qrUrl,
          note: "Mở Zalo trên điện thoại, quét mã QR để bot đăng nhập.",
        });
      } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
        ownName = event.data.display_name || null;
        log("QR scanned by", ownName ?? "?", "- confirm on the phone");
        await report("qr", {
          note: `Đã quét bởi ${ownName ?? "?"}, bấm xác nhận trên điện thoại.`,
        });
      } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
        retries += 1;
        if (retries <= QR_RETRIES) {
          log("QR expired, drawing another");
          event.actions.retry();
        } else {
          log("QR expired too many times, giving up until restart");
          await report("offline", {
            note: "Mã QR hết hạn nhiều lần, khởi động lại bot để lấy mã mới.",
          });
          event.actions.abort();
        }
      } else if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
        log("QR declined on the phone, drawing another");
        event.actions.retry();
      } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
        writeSession({
          cookie: event.data.cookie,
          imei: event.data.imei,
          userAgent: event.data.userAgent,
        });
        clearQrFiles();
        log("session saved");
      }
    } catch (error) {
      log("QR step failed:", (error as Error).message);
    }
  });
  return got;
}

// ---- the conversation: link codes and the one help text --------------------

type Incoming = {
  type: ThreadType;
  threadId: string;
  isSelf: boolean;
  data: { uidFrom?: string; dName?: string; content: unknown };
};

async function send(threadId: string, text: string): Promise<void> {
  if (!api) throw new Error("not signed in");
  await api.sendMessage(text, threadId, ThreadType.User);
}

async function onMessage(message: Incoming): Promise<void> {
  if (message.isSelf) return;
  // The group's messages go to the minder; this function is the inbox.
  if (message.type === ThreadType.Group) {
    await group?.onMessage(message as GroupMessage);
    return;
  }
  if (message.type !== ThreadType.User) return;
  if (typeof message.data.content !== "string") return;
  const threadId = message.threadId;
  const zaloId = message.data.uidFrom || threadId;
  const text = message.data.content;
  const code = readLinkMessage(text);
  const brand = await brandName();

  if (code) {
    const row = await db.zaloLinkCode.findUnique({
      where: { code },
      select: {
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { username: true, zaloId: true } },
      },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      await send(
        threadId,
        `Mã ${code} không đúng hoặc đã hết hạn. Vào web ${brand} → Bảo mật → Liên kết Zalo để lấy mã mới (mã dùng được 15 phút).`,
      );
      return;
    }
    if (row.user.zaloId && row.user.zaloId !== zaloId) {
      await send(
        threadId,
        `Tài khoản ${row.user.username} đã liên kết với một Zalo khác. Huỷ liên kết cũ ở trang Bảo mật rồi lấy mã mới.`,
      );
      return;
    }
    const holder = await db.user.findUnique({
      where: { zaloId },
      select: { id: true, username: true },
    });
    if (holder && holder.id !== row.userId) {
      await send(
        threadId,
        `Zalo này đang liên kết với tài khoản ${holder.username}. Mỗi Zalo chỉ nhận thông báo cho một tài khoản; huỷ liên kết bên đó trước.`,
      );
      return;
    }
    await db.$transaction([
      db.user.update({
        where: { id: row.userId },
        data: { zaloId, zaloName: message.data.dName?.trim() || null },
      }),
      db.zaloLinkCode.update({ where: { code }, data: { usedAt: new Date() } }),
    ]);
    log("linked", zaloId, "to", row.user.username);
    await send(
      threadId,
      `✅ Đã liên kết với tài khoản ${row.user.username} trên ${brand}. Từ giờ thông báo bảo hành, đơn hàng và nạp tiền sẽ gửi vào đây. Bot chỉ gửi thông báo, không trả lời tin nhắn; cần hỗ trợ bạn nhắn shop qua kênh hỗ trợ trên web.`,
    );
    return;
  }

  // Anything else: one help text per chat per six hours, so a chatty
  // stranger does not turn the bot into a spam source.
  const last = lastHelpAt.get(threadId) ?? 0;
  if (Date.now() - last < HELP_GAP_MS) return;
  lastHelpAt.set(threadId, Date.now());
  const linked = await db.user.findUnique({
    where: { zaloId },
    select: { username: true },
  });
  await send(
    threadId,
    linked
      ? `Đây là bot thông báo tự động của ${brand} (đang gửi cho tài khoản ${linked.username}). Bot không đọc tin nhắn; cần hỗ trợ bạn nhắn shop qua kênh hỗ trợ trên web.`
      : `Đây là bot thông báo tự động của ${brand}. Để nhận thông báo bảo hành, đơn hàng, nạp tiền: vào web → Bảo mật → Liên kết Zalo, lấy mã rồi gửi vào đây theo mẫu "${linkMessage("ABC234")}". Bot không trả lời tin nhắn khác.`,
  );
}

// ---- the outbox ------------------------------------------------------------

async function drainOutbox(): Promise<void> {
  if (!api) return;
  const pending = await db.zaloOutbox.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const item of pending) {
    if (stopping || !api) return;
    try {
      if (item.kind === "PHONE_OTP") {
        // The code goes only to the number's own Zalo, and only when that is
        // the account linked here: a stranger's number earns nothing. Zalo
        // answers 216 for an unknown number, which the client hands back as
        // an empty result.
        const found = await api.findUser(item.phone ?? "").catch(() => null);
        const owner = found?.uid ? String(found.uid) : null;
        const refusal = !owner
          ? "Số này chưa đăng ký Zalo"
          : owner !== item.zaloId
            ? "Số này không phải số của tài khoản Zalo đã liên kết"
            : null;
        if (refusal) {
          log("phone code refused", item.id, refusal);
          await db.zaloOutbox.update({
            where: { id: item.id },
            data: {
              status: "FAILED",
              attempts: { increment: 1 },
              lastError: refusal,
            },
          });
          await sleep(SEND_GAP_MS);
          continue;
        }
      }
      if (item.kind === "GROUP_POST") {
        if (!group) throw new Error("group minder not ready");
        await group.post(item.zaloId, item.text);
      } else {
        // Styled when the web wrote styles (the receipt), plain otherwise.
        const styles = readZaloStyles(item.styles, item.text.length);
        await api.sendMessage(
          styles ? { msg: item.text, styles: styles as Style[] } : item.text,
          item.zaloId,
          ThreadType.User,
        );
      }
      await db.zaloOutbox.update({
        where: { id: item.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = item.attempts + 1;
      const reason = (error as Error).message?.slice(0, 300) ?? "unknown";
      log("send failed", item.id, reason);
      await db.zaloOutbox.update({
        where: { id: item.id },
        data: {
          attempts,
          lastError: reason,
          status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
      // A refused send is often the session: let the loop notice.
      if (/login|session|unauthor|logged/i.test(reason)) throw error;
    }
    await sleep(SEND_GAP_MS);
  }
}

// ---- the life of the process -----------------------------------------------

async function run(): Promise<void> {
  let backoff = 15_000;
  while (!stopping) {
    try {
      api = await signIn();
      try {
        ownName =
          (await api.fetchAccountInfo())?.profile?.displayName ?? ownName;
      } catch {
        // The name is a nicety for the admin page.
      }
      backoff = 15_000;
      group = createGroupManager({
        api,
        db,
        log,
        siteHost: SITE_HOST,
        brand: brandName,
      });
      await report("online");
      log("online as", ownName ?? api.getOwnId());

      let closed = false;
      let closeNote = "";
      api.listener.on("message", (message) => {
        void onMessage(message as unknown as Incoming).catch((error) =>
          log("message handling failed:", (error as Error).message),
        );
      });
      api.listener.on("closed", (code, reason) => {
        closed = true;
        closeNote = `listener closed (${code}) ${reason}`;
      });
      api.listener.on("error", (error) =>
        log("listener error:", (error as Error)?.message ?? error),
      );
      api.listener.on("group_event", (ev) => {
        group?.onGroupEvent(
          ev as unknown as { type: string; data: { groupId?: string } },
        );
      });
      api.listener.start();

      let lastBeat = 0;
      while (!stopping && !closed) {
        await drainOutbox();
        await group
          ?.tick()
          .catch((error: Error) => log("group tick failed:", error.message));
        if (Date.now() - lastBeat > HEARTBEAT_MS) {
          await report("online");
          lastBeat = Date.now();
        }
        await sleep(POLL_MS);
      }
      try {
        api.listener.stop();
      } catch {
        // Already gone.
      }
      api = null;
      group = null;
      if (closed) {
        log(closeNote);
        await report("offline", { note: closeNote });
      }
    } catch (error) {
      api = null;
      const note = (error as Error).message ?? String(error);
      log("session failed:", note);
      await report("offline", { note });
    }
    if (stopping) break;
    log(`reconnecting in ${Math.round(backoff / 1000)}s`);
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 10 * 60_000);
  }
}

async function shutdown(signal: string): Promise<void> {
  stopping = true;
  log("stopping on", signal);
  try {
    api?.listener.stop();
  } catch {
    // Already gone.
  }
  await report("offline", { note: `dừng (${signal})` });
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

run().catch(async (error) => {
  log("fatal:", (error as Error).message);
  await report("offline", { note: (error as Error).message });
  await db.$disconnect();
  process.exit(1);
});
