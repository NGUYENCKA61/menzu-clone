/**
 * The shop's emails, drawn the way mail clients can actually show them (the
 * owner, 13/10/2026: "gmail tự động nội dung mình làm nó đẹp được không"):
 * tables for layout, every style inline, a system font stack and no pictures
 * to be blocked, a white card under a dark band in the shop's red, so it reads
 * the same with images off and in Gmail's dark mode.
 *
 * Pure: the callers hand in the brand and every address already absolute, so
 * the drawing is tested without a database or an SMTP server. Also here, the
 * Zalo form of a receipt, which is text with style ranges, since a Zalo
 * message is not HTML (the owner: "khi khách hàng mua key thì cũng gửi về
 * gmail khách hàng và zalo").
 */

import { ZALO_STYLE, type ZaloStyleRange } from "@/lib/zaloShared";

export interface EmailBrand {
  name: string;
  /** "https://thichthihack.com", no trailing slash. */
  siteUrl: string;
  /** "8:00–23:00". */
  supportHours: string;
  telegramUrl: string | null;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "Consolas,'SFMono-Regular',Menlo,'Courier New',monospace";
const RED = "#E13D3F";
const RED_DEEP = "#b42227";
const INK = "#16161b";
const BODY = "#3a3a44";
const MUTED = "#6b6c76";
const LINE = "#ebebef";
const GROUND = "#f1f1f4";

/** Keys printed in one email or one Zalo message; the rest wait in the order. */
export const MAX_KEYS_EMAIL = 30;
export const MAX_KEYS_ZALO = 10;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "1.234.567đ". */
export function vnd(amount: number): string {
  return `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function shopParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
}

/** "13/10/2026 21:30", on the shop's clock whatever the server's says. */
export function shopDateTime(date: Date): string {
  const p = shopParts(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** The brand with a trailing "HACK" in red, the way the site's logo reads. */
function wordmark(name: string): string {
  const split = /^(.+?)(hack)$/i.exec(name.trim());
  if (!split) return escapeHtml(name);
  return `${escapeHtml(split[1]!)}<span style="color:${RED};">${escapeHtml(split[2]!)}</span>`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Escaped paragraphs, the layout's way of setting running text. */
export function paragraphs(lines: string[]): string {
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 10px;font:400 15px/1.6 ${FONT};color:${BODY};">${escapeHtml(line)}</p>`,
    )
    .join("");
}

/** A button that survives Outlook: a coloured cell around a padded link. */
export function emailButton(href: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td bgcolor="${RED}" style="border-radius:10px;background:${RED};">` +
    `<a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:13px 24px;font:700 14px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" style="color:${RED};font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`;
}

const DOT = `<span style="color:#c4c4cc;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`;

export function emailLayout(input: {
  brand: EmailBrand;
  /** The line a mail list shows after the subject. */
  preheader: string;
  /** The small word in the band's right corner: "Đơn hàng", "Bảo mật". */
  eyebrow: string;
  title: string;
  /** HTML, already escaped (see `paragraphs`). */
  introHtml: string;
  bodyHtml?: string;
  cta?: { href: string; label: string };
  /** The button's own address, printed small under it for a client that will not render the button. */
  ctaFallback?: string;
  footnote?: string;
  /** Who reads it: the shop's own alerts get a desk footer, not "nhắn shop" (21/10/2026). */
  audience?: "customer" | "admin";
}): string {
  const { brand } = input;
  const footerLine =
    input.audience === "admin"
      ? `Thư hệ thống gửi quản trị viên ${escapeHtml(brand.name)}. Đổi địa chỉ nhận trong Cấu hình của admin.`
      : `Cần hỗ trợ? Nhắn shop bằng nút hỗ trợ trên web, ${escapeHtml(brand.supportHours)} mỗi ngày.`;
  // Gmail builds its list snippet from the first text it can see, so the
  // preview line is zero-sized rather than display:none (which Gmail skipped,
  // 21/10/2026), and padded so the wordmark does not follow it in the list.
  const preheader =
    `<div style="font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${GROUND};">` +
    `${escapeHtml(input.preheader)}${"&#847;&zwnj;&nbsp;".repeat(90)}</div>`;
  const footerLinks = [
    link(brand.siteUrl, hostOf(brand.siteUrl)),
    brand.telegramUrl ? link(brand.telegramUrl, "Kênh Telegram") : null,
  ]
    .filter(Boolean)
    .join(DOT);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};-webkit-text-size-adjust:100%;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};">
<tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
<tr><td style="background:#0f1015;padding:20px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font:800 19px/1.2 ${FONT};letter-spacing:.04em;color:#ffffff;">${wordmark(brand.name)}</td>
<td align="right" style="font:700 11px/1.2 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:#ff9a9b;">${escapeHtml(input.eyebrow)}</td>
</tr></table>
</td></tr>
<tr><td style="background:${RED};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 28px 4px;">
<h1 style="margin:0 0 12px;font:800 24px/1.25 ${FONT};color:${INK};">${escapeHtml(input.title)}</h1>
${input.introHtml}
</td></tr>
${input.bodyHtml ? `<tr><td style="padding:10px 28px 4px;">${input.bodyHtml}</td></tr>` : ""}
${input.cta ? `<tr><td style="padding:16px 28px 6px;">${emailButton(input.cta.href, input.cta.label)}</td></tr>` : ""}
${input.ctaFallback ? `<tr><td style="padding:8px 28px 0;font:400 12px/1.6 ${FONT};color:${MUTED};word-break:break-all;">Nút không bấm được? Chép đường dẫn này vào trình duyệt:<br><a href="${escapeHtml(input.ctaFallback)}" target="_blank" style="color:${MUTED};text-decoration:underline;">${escapeHtml(input.ctaFallback)}</a></td></tr>` : ""}
${input.footnote ? `<tr><td style="padding:12px 28px 0;font:400 13px/1.6 ${FONT};color:${MUTED};">${escapeHtml(input.footnote)}</td></tr>` : ""}
<tr><td style="padding:24px 28px 0;"><div style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="padding:16px 28px 24px;font:400 13px/1.7 ${FONT};color:${MUTED};">${footerLine}<br>${footerLinks}</td></tr>
</table>
<p style="margin:16px 0 0;font:400 12px/1.6 ${FONT};color:#9a9aa4;">Email gửi tự động từ ${escapeHtml(brand.name)}. Vui lòng không trả lời email này.</p>
</td></tr>
</table>
</body>
</html>`;
}

// ---- the receipt -------------------------------------------------------------

export interface ReceiptLine {
  orderCode: string;
  productName: string;
  packageLabel: string | null;
  /** A tool's keys are printed; an account's sign-in never is. */
  kind: "software" | "account";
  keys: { value: string }[];
  /** A tier that runs for a set time once its key is activated; false for
   *  a lifetime tier, and for an account. */
  timed: boolean;
  total: number;
  /** Absolute addresses. */
  links: {
    order: string;
    download: string | null;
    docs: string | null;
    warranty: string;
  };
}

export interface ReceiptData {
  brand: EmailBrand;
  username: string;
  paidAt: Date;
  lines: ReceiptLine[];
  /** Absolute: the orders page, and the wiki's "Setup máy chuẩn". */
  ordersUrl: string;
  setupGuideUrl: string;
}

/** "Gói 30 ngày", without doubling a label that already says "Gói". */
function packageWords(label: string | null): string | null {
  if (!label) return null;
  return /^gói\b/i.test(label.trim()) ? label.trim() : `Gói ${label.trim()}`;
}

/**
 * How long a line's keys last, or that they do not; null for an account.
 *
 * No date: a key's clock starts when the customer activates it in the loader,
 * not at purchase, and the shop never learns when that was (the owner,
 * 21-22/10/2026: "key chỉ tính khi bắt đầu kích hoạt thôi", "web không cần
 * biết khi nào khách kích hoạt").
 */
function expiryWords(line: ReceiptLine): string | null {
  if (line.kind !== "software" || line.keys.length === 0) return null;
  return line.timed ? "tính giờ từ lúc kích hoạt key" : "không giới hạn thời gian";
}

function receiptSubject(data: ReceiptData): string {
  const [first] = data.lines;
  if (data.lines.length === 1 && first) {
    // The order code first, so the mail is found again by the one thing the
    // customer quotes to the desk (the owner, 21/10/2026: "cho chuyên nghiệp").
    return first.kind === "software"
      ? `${data.brand.name} | Đơn ${first.orderCode}, key của bạn: ${first.productName}`
      : `${data.brand.name} | Đơn ${first.orderCode}, tài khoản đã sẵn sàng: ${first.productName}`;
  }
  return `${data.brand.name} | Đơn hàng thành công (${data.lines.length} sản phẩm)`;
}

function lineCardHtml(line: ReceiptLine, keyBudget: { left: number }): string {
  const meta = [
    packageWords(line.packageLabel),
    `Đơn ${line.orderCode}`,
    expiryWords(line),
  ]
    .filter(Boolean)
    .join(" · ");
  let inner =
    `<p style="margin:0 0 4px;font:700 16px/1.35 ${FONT};color:${INK};">${escapeHtml(line.productName)}</p>` +
    `<p style="margin:0 0 14px;font:400 13px/1.5 ${FONT};color:${MUTED};">${escapeHtml(meta)}</p>`;

  if (line.kind === "software") {
    const shown = line.keys.slice(0, Math.max(0, keyBudget.left));
    keyBudget.left -= shown.length;
    inner += shown
      .map(
        (key) =>
          `<div style="margin:0 0 8px;padding:12px 14px;background:#fff6f6;border:1px dashed #f0a3a4;border-radius:10px;font:700 15px/1.45 ${MONO};color:${RED_DEEP};word-break:break-all;">${escapeHtml(key.value)}</div>`,
      )
      .join("");
    const hidden = line.keys.length - shown.length;
    if (hidden > 0) {
      inner += `<p style="margin:0 0 8px;font:400 13px/1.5 ${FONT};color:${MUTED};">Còn ${hidden} key nữa trong đơn, mở Lịch sử mua để xem đủ.</p>`;
    }
    const links = [
      line.links.download ? link(line.links.download, "Tải tool") : null,
      line.links.docs ? link(line.links.docs, "Tài liệu") : null,
      link(line.links.warranty, "Bảo hành"),
    ]
      .filter(Boolean)
      .join(DOT);
    inner += `<p style="margin:6px 0 0;font:400 13px/1.5 ${FONT};">${links}</p>`;
  } else {
    inner +=
      `<div style="margin:0 0 8px;padding:12px 14px;background:#f6f6f8;border:1px solid ${LINE};border-radius:10px;font:400 14px/1.55 ${FONT};color:${BODY};">` +
      `Thông tin đăng nhập nằm trong Lịch sử mua. Bật quay màn hình, bấm <strong>Lấy thông tin</strong>, rồi đổi mật khẩu ngay.` +
      `</div>` +
      `<p style="margin:6px 0 0;font:400 13px/1.5 ${FONT};">${link(line.links.order, "Mở đơn")}${DOT}${link(line.links.warranty, "Bảo hành")}</p>`;
  }
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:12px;">` +
    `<tr><td style="padding:16px 18px;">${inner}</td></tr></table>`
  );
}

export function orderReceiptEmail(data: ReceiptData): RenderedEmail {
  const software = data.lines.some((line) => line.kind === "software");
  const total = data.lines.reduce((sum, line) => sum + line.total, 0);
  const codes = data.lines.map((line) => line.orderCode).join(", ");
  const budget = { left: MAX_KEYS_EMAIL };

  const totalRow =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 14px;"><tr>` +
    `<td style="font:400 14px/1.4 ${FONT};color:${MUTED};">Tổng thanh toán</td>` +
    `<td align="right" style="font:800 18px/1.4 ${FONT};color:${INK};">${escapeHtml(vnd(total))}</td>` +
    `</tr></table>`;

  const notes = software
    ? `<div style="margin:4px 0 0;padding:14px 16px;background:#f6f6f8;border-radius:12px;font:400 13px/1.65 ${FONT};color:${BODY};">` +
      `<strong style="color:${INK};">Trước khi chạy tool</strong><br>` +
      `Làm theo ${link(data.setupGuideUrl, "Setup máy chuẩn")}: tắt Defender, Secure Boot, Core Isolation và cài runtime.<br>` +
      `Key gắn với máy đầu tiên dùng nó. Đổi máy hay thay ổ cứng thì gửi yêu cầu bảo hành để reset.<br>` +
      `Shop không bao giờ hỏi lại key hay mật khẩu qua tin nhắn. Đừng gửi key cho ai.` +
      `</div>`
    : "";

  const html = emailLayout({
    brand: data.brand,
    preheader: software
      ? "Key và link tải đã sẵn sàng. Lưu email này để tra cứu khi cần."
      : "Đơn của bạn đã sẵn sàng trong Lịch sử mua.",
    eyebrow: "Đơn hàng",
    title: "Mua hàng thành công",
    introHtml: paragraphs([
      `Chào ${data.username}, cảm ơn bạn đã mua hàng.`,
      `Đơn ${codes}, lúc ${shopDateTime(data.paidAt)}.`,
    ]),
    bodyHtml:
      data.lines.map((line) => lineCardHtml(line, budget)).join("") +
      totalRow +
      notes,
    cta: { href: data.ordersUrl, label: "Xem đơn hàng" },
  });

  const textBudget = { left: MAX_KEYS_EMAIL };
  const text = [
    `Chào ${data.username}, cảm ơn bạn đã mua hàng tại ${data.brand.name}.`,
    `Đơn ${codes}, lúc ${shopDateTime(data.paidAt)}.`,
    "",
    ...data.lines.flatMap((line) => {
      const head = [
        line.productName,
        packageWords(line.packageLabel),
        expiryWords(line),
      ]
        .filter(Boolean)
        .join(" · ");
      if (line.kind !== "software") {
        return [
          head,
          "Thông tin đăng nhập: vào Lịch sử mua, bật quay màn hình, bấm Lấy thông tin.",
          "",
        ];
      }
      const shown = line.keys.slice(0, Math.max(0, textBudget.left));
      textBudget.left -= shown.length;
      const hidden = line.keys.length - shown.length;
      return [
        head,
        ...shown.map((key) => `Key: ${key.value}`),
        ...(hidden > 0 ? [`Còn ${hidden} key nữa trong Lịch sử mua.`] : []),
        ...(line.links.download ? [`Tải tool: ${line.links.download}`] : []),
        ...(line.links.docs ? [`Tài liệu: ${line.links.docs}`] : []),
        "",
      ];
    }),
    `Tổng thanh toán: ${vnd(total)}`,
    `Xem đơn hàng: ${data.ordersUrl}`,
    "",
    ...(software
      ? [
          `Trước khi chạy tool, làm theo Setup máy chuẩn: ${data.setupGuideUrl}`,
          "Shop không bao giờ hỏi lại key hay mật khẩu qua tin nhắn. Đừng gửi key cho ai.",
          "",
        ]
      : []),
    `Cần hỗ trợ? Nhắn shop trên web, ${data.brand.supportHours} mỗi ngày.`,
  ].join("\n");

  return { subject: receiptSubject(data), text, html };
}

/**
 * The receipt as a Zalo message: plain text with style ranges the bot passes
 * to zca-js (bold, red, big). Kept to the BMP outside the ranges' reach: an
 * astral emoji counts as two units in JavaScript and may not on Zalo's side,
 * which would shift every range after it.
 */
export function zaloReceiptMessage(data: ReceiptData): {
  text: string;
  styles: ZaloStyleRange[];
} {
  let text = "";
  const styles: ZaloStyleRange[] = [];
  const add = (part: string, ...st: string[]) => {
    const start = text.length;
    text += part;
    if (part.length > 0)
      for (const style of st)
        styles.push({ start, len: part.length, st: style });
  };

  const codes = data.lines.map((line) => line.orderCode).join(", ");
  const total = data.lines.reduce((sum, line) => sum + line.total, 0);
  add("Mua hàng thành công", ZALO_STYLE.bold, ZALO_STYLE.big);
  add(`\nĐơn ${codes}, ${shopDateTime(data.paidAt)}\n`);

  let left = MAX_KEYS_ZALO;
  for (const line of data.lines) {
    add("\n");
    add(line.productName, ZALO_STYLE.bold);
    const meta = [packageWords(line.packageLabel), expiryWords(line)]
      .filter(Boolean)
      .join(", ");
    if (meta) add(`\n${meta}`);
    if (line.kind === "software") {
      const shown = line.keys.slice(0, Math.max(0, left));
      left -= shown.length;
      for (const key of shown) {
        add("\nKey: ");
        add(key.value, ZALO_STYLE.bold, ZALO_STYLE.red);
      }
      const hidden = line.keys.length - shown.length;
      if (hidden > 0) add(`\nCòn ${hidden} key nữa trong Lịch sử mua.`);
    } else {
      add(
        "\nThông tin đăng nhập: vào Lịch sử mua, bật quay màn hình, bấm Lấy thông tin.",
      );
    }
    add("\n");
  }

  add("\nTổng thanh toán: ");
  add(vnd(total), ZALO_STYLE.bold);
  add(`\nXem đơn, tải tool và tài liệu: ${data.ordersUrl}`);
  add(
    `\nĐừng gửi key cho ai. Cần hỗ trợ: nhắn shop trên web, ${data.brand.supportHours} mỗi ngày.`,
  );
  return { text, styles };
}

// ---- account mail --------------------------------------------------------------

export function emailCodeMail(input: {
  brand: EmailBrand;
  username: string;
  code: string;
  ttlMinutes: number;
}): RenderedEmail {
  const codeBox = `<div style="margin:6px 0 4px;padding:16px 18px;background:#fff6f6;border:1px dashed #f0a3a4;border-radius:12px;text-align:center;font:800 32px/1.2 ${MONO};letter-spacing:.32em;color:${RED_DEEP};">${escapeHtml(input.code)}</div>`;
  return {
    subject: `${input.brand.name} | Mã xác minh email: ${input.code}`,
    text: [
      `Xin chào ${input.username},`,
      "",
      `Mã xác minh email của bạn là: ${input.code}`,
      `Mã có hiệu lực trong ${input.ttlMinutes} phút. Nhập mã này ở trang Bảo mật tài khoản.`,
      "Không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên shop.",
      "",
      "Nếu không phải bạn yêu cầu, bỏ qua email này, tài khoản của bạn không thay đổi gì.",
    ].join("\n"),
    html: emailLayout({
      brand: input.brand,
      preheader: `Mã xác minh: ${input.code}. Hiệu lực ${input.ttlMinutes} phút.`,
      eyebrow: "Bảo mật",
      title: "Mã xác minh email",
      introHtml: paragraphs([
        `Xin chào ${input.username},`,
        "Nhập mã dưới đây ở trang Bảo mật tài khoản để xác minh email.",
      ]),
      bodyHtml: codeBox,
      footnote: `Mã có hiệu lực trong ${input.ttlMinutes} phút. Không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên shop. Nếu không phải bạn yêu cầu, bỏ qua email này, tài khoản của bạn không thay đổi gì.`,
    }),
  };
}

export function passwordResetMail(input: {
  brand: EmailBrand;
  username: string;
  link: string;
  ttlMinutes: number;
}): RenderedEmail {
  return {
    subject: `${input.brand.name} | Đặt lại mật khẩu`,
    text: [
      `Xin chào ${input.username},`,
      "",
      `Shop nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${input.username}.`,
      `Mở đường dẫn sau trong vòng ${input.ttlMinutes} phút để đặt mật khẩu mới:`,
      "",
      input.link,
      "",
      "Nếu không phải bạn yêu cầu, bỏ qua email này, mật khẩu hiện tại không thay đổi.",
    ].join("\n"),
    html: emailLayout({
      brand: input.brand,
      preheader: `Đường dẫn đặt mật khẩu mới dùng được trong ${input.ttlMinutes} phút.`,
      eyebrow: "Bảo mật",
      title: "Đặt lại mật khẩu",
      introHtml: paragraphs([
        `Xin chào ${input.username},`,
        `Shop nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${input.username}. Bấm nút dưới đây để đặt mật khẩu mới.`,
      ]),
      cta: { href: input.link, label: "Đặt mật khẩu mới" },
      ctaFallback: input.link,
      footnote: `Đường dẫn dùng được trong ${input.ttlMinutes} phút. Nếu không phải bạn yêu cầu, bỏ qua email này, mật khẩu hiện tại không thay đổi.`,
    }),
  };
}

/** "kh***@gmail.com": enough to recognise, not enough to copy. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length))}***${email.slice(at)}`;
}

/**
 * To the OLD address when the account's email moves (the owner, 21/10/2026):
 * the one reader who can still act if the move was not theirs.
 */
export function emailChangedMail(input: {
  brand: EmailBrand;
  username: string;
  oldEmail: string;
  newEmail: string;
  changedAt: Date;
}): RenderedEmail {
  const when = shopDateTime(input.changedAt);
  const line = `Email của tài khoản ${input.username} vừa đổi từ ${input.oldEmail} sang ${maskEmail(input.newEmail)} lúc ${when}.`;
  const warn =
    "Nếu không phải bạn đổi, hãy đăng nhập đổi mật khẩu ngay và nhắn shop qua nút hỗ trợ trên web.";
  return {
    subject: `${input.brand.name} | Email tài khoản đã được đổi`,
    text: [`Xin chào ${input.username},`, "", line, "", warn, "", input.brand.name].join("\n"),
    html: emailLayout({
      brand: input.brand,
      preheader: "Email tài khoản vừa được đổi. Không phải bạn thì nhắn shop ngay.",
      eyebrow: "Bảo mật",
      title: "Email tài khoản đã được đổi",
      introHtml: paragraphs([`Xin chào ${input.username},`, line]),
      cta: { href: `${input.brand.siteUrl}/security`, label: "Mở trang Bảo mật" },
      footnote: `Thư này gửi tới địa chỉ cũ để bạn biết. ${warn}`,
    }),
  };
}

/** The desk's own alerts (stock, warranty): the facts, and the page to open. */
export function adminAlertMail(input: {
  brand: EmailBrand;
  subject: string;
  title: string;
  lines: string[];
  /** Pre-rendered HTML in place of the plain lines, when the alert has a list. */
  bodyHtml?: string;
  cta: { href: string; label: string };
  note?: string;
}): string {
  return emailLayout({
    brand: input.brand,
    preheader: input.lines[0] ?? input.title,
    eyebrow: "Quản trị",
    title: input.title,
    introHtml: paragraphs(input.lines),
    ...(input.bodyHtml ? { bodyHtml: input.bodyHtml } : {}),
    cta: input.cta,
    ...(input.note ? { footnote: input.note } : {}),
    audience: "admin",
  });
}
