import "server-only";

import { db } from "@/lib/db";
import { SOFTWARE_STATUS, type SoftwareStatusValue } from "@/lib/softwareStatus";
import { escapeTelegramHtml, STATUS_EMOJI } from "@/lib/telegramNotify";

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
  | { kind: "set"; id: string; status: SoftwareStatusValue };

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
  const set = /^set:([\w-]{1,40}):(UNDETECTED|STABLE|UPDATED|RISKY|UPDATING|DETECTED)$/.exec(data);
  if (set) return { kind: "set", id: set[1]!, status: set[2] as SoftwareStatusValue };
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
    text: "<b>Chọn danh mục</b>\nBấm danh mục để xem tool, bấm tool để đổi trạng thái.",
    keyboard,
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
      data: { productId: product.id, status, note: null, imageUrl: null, source: "telegram" },
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
