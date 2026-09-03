import "server-only";

import { BODY_MAX, TITLE_MAX, TYPE_LABELS, type AnnouncementType } from "@/lib/announcements";
import { db } from "@/lib/db";
import { SOFTWARE_STATUS, type SoftwareStatusValue } from "@/lib/softwareStatus";
import { escapeTelegramHtml, NOTICE_EMOJI, STATUS_EMOJI } from "@/lib/telegramNotify";

/**
 * The bot's tap-through menu for an admin's private chat.
 *
 * Three screens, each a message with inline buttons under it: the categories,
 * the tools in one category, one tool with its three states. A tap sends the
 * button's callback data back to the webhook, which redraws the same message
 * as the next screen. Nothing is typed, which is the point on a phone — the
 * desk was asking for the codes by name before this existed.
 *
 * Callback data is what a button carries back, 64 bytes at most, so it is a
 * short verb and an id rather than anything a screen could be rebuilt from.
 */

export interface InlineButton {
  text: string;
  callback_data: string;
}

export interface MenuScreen {
  text: string;
  keyboard: InlineButton[][];
}

export type MenuAction =
  | { kind: "cats" }
  | { kind: "cat"; id: string }
  | { kind: "tool"; id: string }
  /** A state tapped: ask for the note before anything changes. */
  | { kind: "set"; id: string; status: SoftwareStatusValue }
  /** "Đổi ngay": the same state, applied with no note. */
  | { kind: "go"; id: string; status: SoftwareStatusValue }
  | { kind: "cancel"; id: string }
  /** A notice's kind tapped: the title and body come typed next. */
  | { kind: "notice"; type: AnnouncementType }
  | { kind: "noticeCancel" };

/**
 * A state chosen from the menu, waiting for its note.
 *
 * Kept in memory, per admin, for ten minutes: the whole exchange is "tap, then
 * type", and a restart in between costs one tap, not a status. One process
 * serves the webhook, so a map is the right size of store.
 */
export interface PendingChange {
  productId: string;
  status: SoftwareStatusValue;
  /** The menu message to redraw once the change lands. */
  chatId: string;
  messageId: number;
  expiresAt: number;
}

const PENDING_TTL_MS = 10 * 60_000;
const pending = new Map<string, PendingChange>();

export function setPending(userId: string, change: Omit<PendingChange, "expiresAt">): void {
  drafts.delete(userId);
  pending.set(userId, { ...change, expiresAt: Date.now() + PENDING_TTL_MS });
}

/**
 * A notice being written from the chat: the kind is tapped, the title and
 * the body typed one after the other. Same ten-minute memory as a pending
 * state, and the two exclude each other — an admin is doing one thing.
 */
export interface NoticeDraft {
  type: AnnouncementType;
  title: string | null;
  expiresAt: number;
}

const drafts = new Map<string, NoticeDraft>();

export function startDraft(userId: string, type: AnnouncementType): void {
  pending.delete(userId);
  drafts.set(userId, { type, title: null, expiresAt: Date.now() + PENDING_TTL_MS });
}

export function peekDraft(userId: string): NoticeDraft | null {
  const draft = drafts.get(userId);
  if (!draft) return null;
  if (draft.expiresAt < Date.now()) {
    drafts.delete(userId);
    return null;
  }
  return draft;
}

export function setDraftTitle(userId: string, title: string): void {
  const draft = drafts.get(userId);
  if (draft) drafts.set(userId, { ...draft, title });
}

export function clearDraft(userId: string): void {
  drafts.delete(userId);
}

/** The kinds a notice from the chat can be; a gift needs the desk's form. */
const NOTICE_TYPES: AnnouncementType[] = ["INFO", "UPDATE", "MAINTENANCE", "PROMO"];

export function noticeTypeScreen(): MenuScreen {
  const button = (type: AnnouncementType) => ({
    text: `${NOTICE_EMOJI[type] ?? "📢"} ${TYPE_LABELS[type]}`,
    callback_data: `notice:${type}`,
  });
  return {
    text: "<b>Thông báo hệ thống mới</b>\nLên web (popup + trang Thông báo) và lên kênh. Chọn loại:",
    keyboard: [
      [button(NOTICE_TYPES[0]!), button(NOTICE_TYPES[1]!)],
      [button(NOTICE_TYPES[2]!), button(NOTICE_TYPES[3]!)],
      [{ text: "❌ Hủy", callback_data: "notice:cancel" }],
    ],
  };
}

export function noticeTitleScreen(type: AnnouncementType): MenuScreen {
  return {
    text: [
      `Loại: ${NOTICE_EMOJI[type] ?? "📢"} <b>${TYPE_LABELS[type]}</b>`,
      "",
      `Gửi <b>tiêu đề</b> thông báo (tối đa ${TITLE_MAX} ký tự):`,
    ].join("\n"),
    keyboard: [[{ text: "❌ Hủy", callback_data: "notice:cancel" }]],
  };
}

export function noticeBodyScreen(title: string): MenuScreen {
  return {
    text: [
      `Tiêu đề: <b>${escapeTelegramHtml(title)}</b>`,
      "",
      `Gửi <b>nội dung</b> (tối đa ${BODY_MAX} ký tự). Muốn kèm ảnh thì gửi ảnh và ghi nội dung vào chú thích.`,
    ].join("\n"),
    keyboard: [[{ text: "❌ Hủy", callback_data: "notice:cancel" }]],
  };
}

/**
 * The notice, live on the site the moment it is written: published, for
 * everyone, starting now — the chat is where the desk goes to say something
 * immediately, and a draft it would have to go and publish from the desk
 * defeats that. The channel post is the caller's next step.
 */
export async function publishNotice(input: {
  type: AnnouncementType;
  title: string;
  body: string;
  imageUrl: string | null;
}): Promise<string> {
  const row = await db.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      type: input.type,
      priority: "NORMAL",
      status: "PUBLISHED",
      audience: "ALL",
      bullets: [],
      imageUrl: input.imageUrl,
    },
    select: { id: true },
  });
  return row.id;
}

export function peekPending(userId: string): PendingChange | null {
  const change = pending.get(userId);
  if (!change) return null;
  if (change.expiresAt < Date.now()) {
    pending.delete(userId);
    return null;
  }
  return change;
}

export function clearPending(userId: string): void {
  pending.delete(userId);
}

/** Only the tools carry a status; account listings never appear here. */
const SOFTWARE_WHERE = { productType: "SOFTWARE_GAME" as const, deletedAt: null };

const LEGEND = "🟢 an toàn · 🔵 ổn định · 🟣 cập nhật mới · 🟠 rủi ro · 🟡 bảo trì · 🔴 phát hiện";

function dot(status: SoftwareStatusValue | null): string {
  return status ? STATUS_EMOJI[status] : "⚪";
}

/** Button labels get one line on a phone; past this Telegram cuts them. */
function shorten(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** The button's data, read back. Anything else is a stale or forged tap. */
export function parseCallback(data: string | undefined): MenuAction | null {
  if (!data) return null;
  if (data === "cats") return { kind: "cats" };
  const open = /^(cat|tool):([\w-]{1,40})$/.exec(data);
  if (open) return { kind: open[1] as "cat" | "tool", id: open[2]! };
  const set = /^(set|go):([\w-]{1,40}):(UNDETECTED|STABLE|UPDATED|RISKY|UPDATING|DETECTED)$/.exec(
    data,
  );
  if (set) {
    return { kind: set[1] as "set" | "go", id: set[2]!, status: set[3] as SoftwareStatusValue };
  }
  const cancel = /^cancel:([\w-]{1,40})$/.exec(data);
  if (cancel) return { kind: "cancel", id: cancel[1]! };
  if (data === "notice:cancel") return { kind: "noticeCancel" };
  const notice = /^notice:(INFO|UPDATE|MAINTENANCE|PROMO)$/.exec(data);
  if (notice) return { kind: "notice", type: notice[1] as AnnouncementType };
  return null;
}

export async function categoryScreen(): Promise<MenuScreen> {
  const tools = await db.product.findMany({
    where: SOFTWARE_WHERE,
    select: { softwareStatus: true, category: { select: { id: true, name: true } } },
    orderBy: { category: { name: "asc" } },
  });

  const groups = new Map<
    string,
    { name: string; total: number; detected: number; risky: number; updating: number }
  >();
  for (const tool of tools) {
    const group = groups.get(tool.category.id) ?? {
      name: tool.category.name,
      total: 0,
      detected: 0,
      risky: 0,
      updating: 0,
    };
    group.total += 1;
    if (tool.softwareStatus === "DETECTED") group.detected += 1;
    if (tool.softwareStatus === "RISKY") group.risky += 1;
    if (tool.softwareStatus === "UPDATING") group.updating += 1;
    groups.set(tool.category.id, group);
  }
  if (groups.size === 0) return { text: "Chưa có tool nào trong shop.", keyboard: [] };

  // The trouble counts ride on the button, so a category with a dead tool
  // shows it before anyone opens it.
  const keyboard = [...groups].map(([id, group]) => [
    {
      text: [
        shorten(group.name, 28),
        `${group.total} tool`,
        group.detected ? `🔴${group.detected}` : "",
        group.risky ? `🟠${group.risky}` : "",
        group.updating ? `🟡${group.updating}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      callback_data: `cat:${id}`,
    },
  ]);
  return {
    text: "<b>Chọn danh mục</b>\nBấm danh mục để xem tool, bấm tool để đổi trạng thái.\nHoặc gõ mã / tên tool để tìm nhanh.",
    keyboard,
  };
}

/**
 * Whatever the admin typed that was not a command, read as a search: a code,
 * or a word from the name. Twenty at most — past that the words were too few.
 */
export async function searchScreen(query: string): Promise<MenuScreen> {
  const q = query.trim().slice(0, 60);
  const tools = await db.product.findMany({
    where: {
      ...SOFTWARE_WHERE,
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true, softwareStatus: true },
    orderBy: { code: "asc" },
    take: 20,
  });
  if (tools.length === 0) {
    return {
      text: `Không thấy tool nào khớp “${escapeTelegramHtml(q)}”. Thử mã (HACK12) hoặc một từ trong tên.`,
      keyboard: [[{ text: "🏠 Danh mục", callback_data: "cats" }]],
    };
  }
  const keyboard = tools.map((tool) => [
    {
      text: `${dot(tool.softwareStatus)} ${tool.code} · ${shorten(tool.name ?? "", 26)}`,
      callback_data: `tool:${tool.id}`,
    },
  ]);
  keyboard.push([{ text: "🏠 Danh mục", callback_data: "cats" }]);
  const cap = tools.length === 20 ? " (20 đầu tiên)" : "";
  return {
    text: `<b>Kết quả cho “${escapeTelegramHtml(q)}”</b> · ${tools.length} tool${cap}\n${LEGEND}`,
    keyboard,
  };
}

/** The screen a tapped state leads to: the ask for a note. */
export async function askNoteScreen(
  productId: string,
  status: SoftwareStatusValue,
): Promise<MenuScreen | null> {
  const tool = await db.product.findFirst({
    where: { ...SOFTWARE_WHERE, id: productId },
    select: { code: true },
  });
  if (!tool) return null;
  return {
    text: [
      `Đã chọn ${STATUS_EMOJI[status]} <b>${SOFTWARE_STATUS[status].label}</b> cho <b>${escapeTelegramHtml(tool.code)}</b>.`,
      "",
      "Gửi ghi chú (kèm ảnh nếu có) trong 10 phút, hoặc bấm:",
    ].join("\n"),
    keyboard: [
      [{ text: "✅ Đổi ngay, không ghi chú", callback_data: `go:${productId}:${status}` }],
      [{ text: "❌ Hủy", callback_data: `cancel:${productId}` }],
    ],
  };
}

export async function toolsScreen(categoryId: string): Promise<MenuScreen | null> {
  const tools = await db.product.findMany({
    where: { ...SOFTWARE_WHERE, categoryId },
    select: {
      id: true,
      code: true,
      name: true,
      softwareStatus: true,
      category: { select: { name: true } },
    },
    orderBy: { code: "asc" },
  });
  const first = tools[0];
  if (!first) return null;

  const keyboard = tools.map((tool) => [
    {
      text: `${dot(tool.softwareStatus)} ${tool.code} · ${shorten(tool.name ?? "", 26)}`,
      callback_data: `tool:${tool.id}`,
    },
  ]);
  keyboard.push([{ text: "⬅️ Danh mục", callback_data: "cats" }]);
  return {
    text: `<b>${escapeTelegramHtml(first.category.name)}</b> · ${tools.length} tool\n${LEGEND}`,
    keyboard,
  };
}

export async function toolScreen(productId: string): Promise<MenuScreen | null> {
  const tool = await db.product.findFirst({
    where: { ...SOFTWARE_WHERE, id: productId },
    select: {
      id: true,
      code: true,
      name: true,
      softwareStatus: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  if (!tool) return null;

  const current = tool.softwareStatus;
  const choice = (status: SoftwareStatusValue, label: string) => ({
    text: `${STATUS_EMOJI[status]} ${label}${current === status ? " ✓" : ""}`,
    callback_data: `set:${tool.id}:${status}`,
  });
  return {
    text: [
      `<b>${escapeTelegramHtml(tool.code)}</b>`,
      escapeTelegramHtml(tool.name ?? ""),
      `Danh mục: ${escapeTelegramHtml(tool.category.name)}`,
      `Trạng thái: ${dot(current)} <b>${current ? SOFTWARE_STATUS[current].label : "chưa đặt"}</b>`,
      "",
      "Chọn trạng thái mới:",
    ].join("\n"),
    keyboard: [
      [choice("UNDETECTED", "An toàn"), choice("STABLE", "Ổn định")],
      [choice("UPDATED", "Cập nhật mới"), choice("RISKY", "Rủi ro")],
      [choice("UPDATING", "Bảo trì"), choice("DETECTED", "Phát hiện")],
      [
        { text: `⬅️ ${shorten(tool.category.name, 20)}`, callback_data: `cat:${tool.categoryId}` },
        { text: "🏠 Danh mục", callback_data: "cats" },
      ],
    ],
  };
}

/**
 * The change a tap makes, recorded exactly like a typed command: the tool
 * flips and the history gets its row. "same" is not an error — the desk
 * tapped the state the tool was already in, and the history must not fill
 * with "still detected".
 */
export async function setStatus(
  productId: string,
  status: SoftwareStatusValue,
  note: string | null = null,
  imageUrl: string | null = null,
): Promise<"changed" | "same" | "missing"> {
  const product = await db.product.findFirst({
    where: { ...SOFTWARE_WHERE, id: productId },
    select: { id: true, softwareStatus: true },
  });
  if (!product) return "missing";
  if (product.softwareStatus === status) return "same";

  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: { softwareStatus: status } }),
    db.softwareStatusEvent.create({
      data: { productId: product.id, status, note, imageUrl, source: "telegram" },
    }),
  ]);
  return "changed";
}

/**
 * The same catalogue as plain text, grouped by category, for the channel —
 * where buttons would invite every subscriber to tap, and the tap would be
 * refused. Split under Telegram's 4096-character cap.
 */
export async function listScreenText(): Promise<string[]> {
  const tools = await db.product.findMany({
    where: SOFTWARE_WHERE,
    select: { code: true, name: true, softwareStatus: true, category: { select: { name: true } } },
    orderBy: [{ category: { name: "asc" } }, { code: "asc" }],
  });
  if (tools.length === 0) return ["Chưa có tool nào trong shop."];

  const lines: string[] = [];
  let heading = "";
  for (const tool of tools) {
    if (tool.category.name !== heading) {
      heading = tool.category.name;
      lines.push("", `<b>${escapeTelegramHtml(heading)}</b>`);
    }
    lines.push(
      `${dot(tool.softwareStatus)} <code>${escapeTelegramHtml(tool.code)}</code> ${escapeTelegramHtml(
        shorten(tool.name ?? "", 42),
      )}`,
    );
  }

  const chunks: string[] = [];
  let current = `<b>Mã tool và trạng thái</b> · ${LEGEND}`;
  for (const line of lines) {
    if (current.length + line.length + 1 > 3800) {
      chunks.push(current);
      current = "";
    }
    current += `\n${line}`;
  }
  chunks.push(current);
  return chunks;
}
