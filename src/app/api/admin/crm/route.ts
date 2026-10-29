import { NextResponse } from "next/server";

import { BODY_MAX, TITLE_MAX, type AnnouncementType } from "@/lib/announcements";
import { FORBIDDEN, getAdmin } from "@/lib/admin";
import {
  appendChatMessage,
  crmCounts,
  crmCustomers,
  customerActivity,
  listThreadsForDesk,
  listWarrantyForDesk,
  markThreadSeen,
  threadDetailForDesk,
  warrantyDetailForDesk,
} from "@/lib/chatStore";
import {
  CRM_KEYS,
  getQuickReplies,
  getSettingValue,
  saveQuickReplies,
  setSettingValue,
} from "@/lib/crmSettings";
import { draftOnce } from "@/lib/assistant";
import { db } from "@/lib/db";
import { readFacebookPage, postToFacebookPage } from "@/lib/facebookPage";
import { listKnowledge } from "@/lib/knowledge";
import { productHref } from "@/lib/routes";
import { manychatConfigured, manychatSendText, MANYCHAT_GUEST_PREFIX } from "@/lib/manychat";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import { publishNotice } from "@/lib/telegramMenu";
import { postAnnouncementToTelegram } from "@/lib/telegramNotify";
import { postAnnouncementToZaloGroup } from "@/lib/zaloGroupPost";

/**
 * The CRM desk's API — everything its screens read and do. Every handler
 * resolves the caller through getAdmin: the desk reads customers' words and
 * holds integration keys, so a member must get nothing here, not even a
 * count.
 *
 * The inbox speaks two id dialects: a bare cuid is a chat thread, a `w_`
 * prefix is a warranty ticket. A warranty reply is written with the same
 * fields the admin warranty desk writes; everything else about a ticket
 * (refunds, statuses, the bank form) stays on that desk.
 */

export const dynamic = "force-dynamic";

const THREAD_STATUSES = ["BOT", "NEED_ADMIN", "DONE"] as const;
type ThreadStatus = (typeof THREAD_STATUSES)[number];

function isStatus(value: unknown): value is ThreadStatus {
  return typeof value === "string" && (THREAD_STATUSES as readonly string[]).includes(value);
}

const NOTICE_TYPES: AnnouncementType[] = ["INFO", "UPDATE", "PROMO", "MAINTENANCE", "GIFT"];

const CHANNELS = ["ALL", "WEB", "WARRANTY", "FACEBOOK"] as const;
type ChannelFilter = (typeof CHANNELS)[number];

function isChannel(value: unknown): value is ChannelFilter {
  return typeof value === "string" && (CHANNELS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const url = new URL(request.url);

  // One conversation, by either dialect.
  const id = url.searchParams.get("id");
  if (id) {
    const thread = id.startsWith("w_")
      ? await warrantyDetailForDesk(id.slice(2))
      : await threadDetailForDesk(id);
    if (!thread) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    return NextResponse.json({ thread });
  }

  const q = url.searchParams.get("q")?.trim().slice(0, 60) || undefined;

  // The customer book, paged.
  if (url.searchParams.get("view") === "customers") {
    const skip = Math.max(0, Math.min(5000, Number(url.searchParams.get("skip")) || 0));
    return NextResponse.json({ customers: await crmCustomers({ q, skip }) });
  }

  // The connection cards on Kết nối. Keys are reported set or not set,
  // never echoed: the browser has no business holding a page token.
  if (url.searchParams.get("view") === "connections") {
    const [settings, facebook, manychatKey, manychatSecret] = await Promise.all([
      getShopSettings(),
      readFacebookPage(),
      getSettingValue(CRM_KEYS.manychatApiKey),
      getSettingValue(CRM_KEYS.manychatSecret),
    ]);
    return NextResponse.json({
      telegram: {
        ready: Boolean(settings.telegramBotToken.trim() && settings.telegramChatId.trim()),
      },
      zalo: {
        groupsConfigured: settings.zaloGroupIds.length,
        groupPostOn: settings.zaloGroupPost,
      },
      facebook: { pageId: facebook?.pageId ?? "", tokenSet: Boolean(facebook) },
      manychat: {
        keySet: Boolean(manychatKey.trim()),
        secretSet: Boolean(manychatSecret.trim()),
        webhookUrl: absoluteUrl("/api/integrations/manychat"),
      },
    });
  }

  // The bot's handbook, and the voice it speaks every answer in.
  if (url.searchParams.get("view") === "knowledge") {
    const [entries, voice] = await Promise.all([
      listKnowledge(q),
      getSettingValue(CRM_KEYS.assistantVoice),
    ]);
    return NextResponse.json({ entries, voice });
  }

  // What the drafting agent may write about.
  if (url.searchParams.get("view") === "postproducts") {
    const products = await db.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        productType: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: [{ productType: "asc" }, { name: "asc" }],
      take: 150,
    });
    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        label: `${product.name ?? product.code} (${product.category.name})`,
        type: product.productType,
      })),
    });
  }

  // One customer's conversations and latest activity, for the drawer.
  const userId = url.searchParams.get("userId");
  if (userId) {
    const [threads, activity] = await Promise.all([
      listThreadsForDesk({ userId }),
      customerActivity(userId),
    ]);
    return NextResponse.json({ threads, ...activity });
  }

  // The inbox: chats, warranty tickets, or everything woven together.
  const channelRaw = url.searchParams.get("channel");
  const channel: ChannelFilter = isChannel(channelRaw) ? channelRaw : "ALL";
  const statusRaw = url.searchParams.get("status");
  const status = isStatus(statusRaw) ? statusRaw : undefined;

  const wantChats = channel !== "WARRANTY";
  const wantWarranty = (channel === "ALL" && !status) || channel === "WARRANTY";

  const [chats, warranty, counts, quickReplies] = await Promise.all([
    wantChats
      ? listThreadsForDesk({
          status,
          q,
          channel: channel === "ALL" ? undefined : channel,
        })
      : Promise.resolve([]),
    wantWarranty ? listWarrantyForDesk(q) : Promise.resolve([]),
    crmCounts(),
    getQuickReplies(),
  ]);

  const threads = [...chats, ...warranty]
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1))
    .slice(0, 60);

  return NextResponse.json({
    threads,
    counts: { ...counts, warranty: channel === "WARRANTY" ? warranty.length : undefined },
    quickReplies,
  });
}

export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  // --- the admin's answer --------------------------------------------------
  if (body.action === "reply") {
    const id = typeof body.id === "string" ? body.id : "";
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
    if (!id || !text) {
      return NextResponse.json({ error: "Bạn nhập nội dung trả lời" }, { status: 400 });
    }

    // A warranty reply: the same row the warranty desk writes, named author
    // and all, so both screens show one conversation.
    if (id.startsWith("w_")) {
      const ticketId = id.slice(2);
      const ticket = await db.warrantyRequest.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true },
      });
      if (!ticket) {
        return NextResponse.json({ error: "Không tìm thấy phiếu bảo hành" }, { status: 404 });
      }
      if (!["OPEN", "IN_PROGRESS", "REFUNDING"].includes(ticket.status)) {
        return NextResponse.json(
          { error: "Phiếu này đã xử lý xong, khung trao đổi đã đóng." },
          { status: 400 },
        );
      }
      await db.warrantyMessage.create({
        data: { requestId: ticketId, fromShop: true, authorId: admin.id, body: text.slice(0, 500) },
      });
      return NextResponse.json({ ok: true });
    }

    const thread = await db.chatThread.findUnique({
      where: { id },
      select: { id: true, channel: true, guestKey: true },
    });
    if (!thread) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    await appendChatMessage(id, "ADMIN", text);

    // A Messenger thread's answer also rides out through ManyChat. The local
    // copy stays either way; a refusal comes back as a warning, not a loss.
    let warn: string | undefined;
    if (thread.channel === "FACEBOOK" && thread.guestKey?.startsWith(MANYCHAT_GUEST_PREFIX)) {
      const sent = await manychatSendText(thread.guestKey.slice(MANYCHAT_GUEST_PREFIX.length), text);
      if (!sent.ok) warn = `Đã lưu nhưng chưa gửi được qua ManyChat: ${sent.error}`;
    }
    return NextResponse.json({ ok: true, warn });
  }

  // --- who holds the conversation ------------------------------------------
  if (body.action === "status") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || id.startsWith("w_") || !isStatus(body.status)) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
    }
    const moved = await db.chatThread.updateMany({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === "NEED_ADMIN" ? {} : { needReason: null }),
      },
    });
    if (moved.count === 0) {
      return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // --- the unread dot ------------------------------------------------------
  if (body.action === "seen") {
    const id = typeof body.id === "string" ? body.id : "";
    if (id && !id.startsWith("w_")) await markThreadSeen(id);
    return NextResponse.json({ ok: true });
  }

  // --- the margin note on a customer ---------------------------------------
  if (body.action === "note") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim().slice(0, 24))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    if (!userId) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
    }
    const updated = await db.user.updateMany({
      where: { id: userId },
      data: { crmNote: note, crmTags: tags },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // --- the desk's canned answers -------------------------------------------
  if (body.action === "quickreplies") {
    const list = Array.isArray(body.list)
      ? body.list.filter(
          (item): item is { label: string; body: string } =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { label?: unknown }).label === "string" &&
            typeof (item as { body?: unknown }).body === "string",
        )
      : [];
    await saveQuickReplies(list);
    return NextResponse.json({ ok: true, quickReplies: await getQuickReplies() });
  }

  // --- the shop's voice ------------------------------------------------------
  if (body.action === "voice") {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 1500) : "";
    await setSettingValue(CRM_KEYS.assistantVoice, text);
    return NextResponse.json({ ok: true });
  }

  // --- the handbook's own writes --------------------------------------------
  if (body.action === "knowledge-save") {
    const id = typeof body.id === "string" ? body.id : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 150) : "";
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
    const internal = body.internal === true;
    if (!title || !text) {
      return NextResponse.json({ error: "Bạn nhập tiêu đề và nội dung" }, { status: 400 });
    }
    if (id) {
      const updated = await db.knowledgeEntry.updateMany({
        where: { id },
        data: { title, body: text, internal },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Không tìm thấy mục sổ tay" }, { status: 404 });
      }
    } else {
      await db.knowledgeEntry.create({ data: { title, body: text, internal } });
    }
    return NextResponse.json({ ok: true, entries: await listKnowledge() });
  }
  if (body.action === "knowledge-delete") {
    const id = typeof body.id === "string" ? body.id : "";
    if (id) await db.knowledgeEntry.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true, entries: await listKnowledge() });
  }

  // --- the drafting agent: one SEO-minded post from the product's own facts --
  if (body.action === "draft") {
    const productId = typeof body.productId === "string" ? body.productId : "";
    const hint = typeof body.hint === "string" ? body.hint.trim().slice(0, 300) : "";
    const product = productId
      ? await db.product.findUnique({
          where: { id: productId },
          select: {
            name: true,
            code: true,
            slug: true,
            productType: true,
            price: true,
            rank: true,
            features: true,
            category: { select: { name: true, slug: true } },
            packages: {
              orderBy: { price: "asc" },
              select: { label: true, price: true },
              take: 6,
            },
          },
        })
      : null;
    if (!product) {
      return NextResponse.json({ error: "Bạn chọn một sản phẩm" }, { status: 400 });
    }

    const link = absoluteUrl(productHref(product.category.slug, product.slug));
    const facts = [
      `Tên: ${product.name ?? product.code}`,
      `Danh mục: ${product.category.name}`,
      product.productType === "ACCOUNT_GAME"
        ? `Loại: tài khoản game${product.rank ? `, rank ${product.rank}` : ""}, giá ${Number(product.price).toLocaleString("vi-VN")}đ`
        : `Loại: phần mềm hỗ trợ game`,
      product.packages.length
        ? `Các gói: ${product.packages
            .map((tier) => `${tier.label} ${Number(tier.price).toLocaleString("vi-VN")}đ`)
            .join("; ")}`
        : "",
      `Link mua: ${link}`,
      hint ? `Yêu cầu thêm của admin: ${hint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system =
      "Bạn là người viết bài cho shop THICHTHIHACK (web bán phần mềm hỗ trợ game và tài khoản game tại Việt Nam). " +
      "Viết một bài đăng giới thiệu ngắn, chuẩn SEO, bằng tiếng Việt, giọng thân thiện và chắc chắn.\n" +
      "Luật:\n" +
      "- Chỉ dùng đúng các dữ kiện được đưa, không bịa tính năng, giá hay cam kết.\n" +
      "- Tiêu đề một dòng, có tên sản phẩm, tối đa 100 ký tự, không viết HOA toàn bộ.\n" +
      "- Hai câu đầu phải nhắc tên sản phẩm và tên game (từ khóa tìm kiếm).\n" +
      "- Thân bài 80 đến 160 chữ, 2 đến 3 đoạn ngắn hoặc gạch đầu dòng, nêu giá gói nếu có, kết bằng lời mời bấm link mua.\n" +
      "- Không dùng dấu gạch ngang dài, không emoji quá 2 cái, không hứa hoàn tiền.\n" +
      "Trả về đúng định dạng:\nTIÊU ĐỀ: <tiêu đề>\nNỘI DUNG:\n<thân bài>";

    try {
      const raw = await draftOnce(system, facts);
      const match = raw.match(/TIÊU ĐỀ:\s*(.+)\s*\n+\s*NỘI DUNG:\s*\n?([\s\S]+)/);
      const title = (match?.[1] ?? "").trim().slice(0, TITLE_MAX);
      const text = (match?.[2] ?? raw).trim().slice(0, BODY_MAX);
      if (!text) {
        return NextResponse.json({ error: "AI chưa viết được, bạn thử lại" }, { status: 502 });
      }
      return NextResponse.json({ ok: true, title, body: text });
    } catch {
      return NextResponse.json(
        { error: "Chưa gọi được model (kiểm tra khóa AI trong Cấu hình hoặc .env)" },
        { status: 502 },
      );
    }
  }

  // --- one post, out on every ticked channel --------------------------------
  if (body.action === "post") {
    const type: AnnouncementType = NOTICE_TYPES.includes(body.type as AnnouncementType)
      ? (body.type as AnnouncementType)
      : "INFO";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, TITLE_MAX) : "";
    const text = typeof body.body === "string" ? body.body.trim().slice(0, BODY_MAX) : "";
    if (!title || !text) {
      return NextResponse.json({ error: "Bạn nhập tiêu đề và nội dung" }, { status: 400 });
    }
    const to = {
      telegram: body.telegram === true,
      zalo: body.zalo === true,
      facebook: body.facebook === true,
    };

    // The web notice first: it is the record the other channels point at.
    const announcementId = await publishNotice({ type, title, body: text, imageUrl: null });

    const results: Record<string, string> = { web: "Đã đăng lên web" };
    if (to.telegram) {
      try {
        await postAnnouncementToTelegram(announcementId);
        results.telegram = "Đã gửi lên kênh Telegram";
      } catch {
        results.telegram = "Lỗi khi gửi Telegram";
      }
    }
    if (to.zalo) {
      try {
        await postAnnouncementToZaloGroup(announcementId);
        results.zalo = "Đã xếp vào hàng chờ nhóm Zalo (bot gửi khi đang chạy)";
      } catch {
        results.zalo = "Lỗi khi xếp hàng Zalo";
      }
    }
    if (to.facebook) {
      const posted = await postToFacebookPage({
        message: `${title}\n\n${text}`,
        link: absoluteUrl("/thong-bao"),
      });
      results.facebook = posted.ok ? "Đã đăng lên Facebook Page" : posted.error;
    }
    return NextResponse.json({ ok: true, announcementId, results });
  }

  // --- integration keys (written, never read back) ---------------------------
  if (body.action === "integrations") {
    const which = body.which;
    if (which === "facebook") {
      const pageId = typeof body.pageId === "string" ? body.pageId.trim().slice(0, 64) : "";
      const token = typeof body.token === "string" ? body.token.trim().slice(0, 512) : "";
      if (pageId) await setSettingValue(CRM_KEYS.facebookPageId, pageId);
      if (token) await setSettingValue(CRM_KEYS.facebookPageToken, token);
      return NextResponse.json({ ok: true });
    }
    if (which === "manychat") {
      const key = typeof body.key === "string" ? body.key.trim().slice(0, 256) : "";
      const secret = typeof body.secret === "string" ? body.secret.trim().slice(0, 128) : "";
      if (key) await setSettingValue(CRM_KEYS.manychatApiKey, key);
      if (secret) {
        if (secret.length < 32) {
          return NextResponse.json(
            { error: "Mã bí mật webhook phải từ 32 ký tự" },
            { status: 400 },
          );
        }
        await setSettingValue(CRM_KEYS.manychatSecret, secret);
      }
      return NextResponse.json({ ok: true, configured: await manychatConfigured() });
    }
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
}
