import { describe, expect, it } from "vitest";

import {
  emailCodeMail,
  escapeHtml,
  MAX_KEYS_EMAIL,
  MAX_KEYS_ZALO,
  orderReceiptEmail,
  passwordResetMail,
  shopDateTime,
  vnd,
  zaloReceiptMessage,
  type ReceiptData,
  type ReceiptLine,
} from "@/lib/emailTemplates";
import { readZaloStyles, ZALO_STYLE } from "@/lib/zaloShared";

/**
 * The shop's emails and the Zalo receipt, drawn without a database or a
 * mail server: what reaches the buyer, what is escaped, and what never
 * leaves the site (an account's sign-in).
 */

const brand = {
  name: "THICHTHIHACK",
  siteUrl: "https://thichthihack.com",
  supportHours: "8:00–23:00",
  telegramUrl: "https://t.me/thichthihack",
};

function line(overrides: Partial<ReceiptLine> = {}): ReceiptLine {
  return {
    orderCode: "DHABC123",
    productName: "HACK CS2 BẢN PRECHEAT",
    packageLabel: "30 ngày",
    kind: "software",
    keys: [
      { value: "KEY-AAAA-1111", expiresAt: new Date("2026-11-13T14:30:00Z") },
    ],
    total: 250_000,
    links: {
      order: "https://thichthihack.com/orders?don=DHABC123",
      download: "https://example.com/loader.zip",
      docs: "https://thichthihack.com/tai-lieu/hack-cs2",
      warranty: "https://thichthihack.com/orders/DHABC123/bao-hanh",
    },
    ...overrides,
  };
}

function receipt(lines: ReceiptLine[]): ReceiptData {
  return {
    brand,
    username: "khach01",
    paidAt: new Date("2026-10-14T14:30:00Z"),
    lines,
    ordersUrl: "https://thichthihack.com/orders?don=DHABC123",
    setupGuideUrl:
      "https://thichthihack.com/docs/setup-may-chuan-thich-thi-hack",
  };
}

describe("formatting", () => {
  it("prints money and the shop's clock", () => {
    expect(vnd(1_234_567)).toBe("1.234.567đ");
    expect(shopDateTime(new Date("2026-10-14T14:30:00Z"))).toBe(
      "14/10/2026 21:30",
    );
    expect(shopDateTime(new Date("2026-10-14T17:05:00Z"))).toBe(
      "15/10/2026 00:05",
    );
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("the order receipt email", () => {
  it("prints a tool's key, its links and the total, in the subject too", () => {
    const mail = orderReceiptEmail(receipt([line()]));
    expect(mail.subject).toBe(
      "THICHTHIHACK | Key của bạn: HACK CS2 BẢN PRECHEAT",
    );
    expect(mail.html).toContain("KEY-AAAA-1111");
    expect(mail.html).toContain("Gói 30 ngày");
    expect(mail.html).toContain("hết hạn 13/11/2026 21:30");
    expect(mail.html).toContain("250.000đ");
    expect(mail.html).toContain('href="https://example.com/loader.zip"');
    expect(mail.html).toContain("Setup máy chuẩn");
    expect(mail.text).toContain("Key: KEY-AAAA-1111");
    expect(mail.text).toContain("Tải tool: https://example.com/loader.zip");
  });

  it("escapes whatever a product or a buyer is called", () => {
    const mail = orderReceiptEmail({
      ...receipt([line({ productName: `<img src=x onerror=alert(1)>` })]),
      username: `"><script>x</script>`,
    });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("never prints an account's sign-in, only where to take it", () => {
    const mail = orderReceiptEmail(
      receipt([
        line({
          kind: "account",
          productName: "ACC VALORANT",
          packageLabel: null,
          keys: [{ value: "user|secret-password", expiresAt: null }],
        }),
      ]),
    );
    expect(mail.subject).toBe(
      "THICHTHIHACK | Tài khoản đã sẵn sàng: ACC VALORANT",
    );
    expect(mail.html).not.toContain("secret-password");
    expect(mail.text).not.toContain("secret-password");
    expect(mail.html).toContain("Lấy thông tin");
    expect(mail.html).not.toContain("Setup máy chuẩn");
  });

  it("caps the keys it prints and says how many wait in the order", () => {
    const keys = Array.from({ length: MAX_KEYS_EMAIL + 5 }, (_, i) => ({
      value: `K-${String(i).padStart(3, "0")}`,
      expiresAt: null,
    }));
    const mail = orderReceiptEmail(receipt([line({ keys })]));
    expect(mail.html).toContain(
      `K-${String(MAX_KEYS_EMAIL - 1).padStart(3, "0")}`,
    );
    expect(mail.html).not.toContain(
      `K-${String(MAX_KEYS_EMAIL).padStart(3, "0")}`,
    );
    expect(mail.html).toContain("Còn 5 key nữa");
    expect(mail.html).toContain("không giới hạn thời gian");
  });

  it("names a basket of several by its count", () => {
    const mail = orderReceiptEmail(
      receipt([
        line(),
        line({ orderCode: "DHXYZ789", productName: "SPOOFER", total: 100_000 }),
      ]),
    );
    expect(mail.subject).toBe(
      "THICHTHIHACK | Đơn hàng thành công (2 sản phẩm)",
    );
    expect(mail.html).toContain("DHABC123, DHXYZ789");
    expect(mail.html).toContain("350.000đ");
  });
});

describe("the Zalo receipt", () => {
  it("styles exactly the words it means to", () => {
    const { text, styles } = zaloReceiptMessage(receipt([line()]));
    const slice = (s: { start: number; len: number }) =>
      text.slice(s.start, s.start + s.len);
    const bold = styles.filter((s) => s.st === ZALO_STYLE.bold).map(slice);
    expect(bold).toContain("Mua hàng thành công");
    expect(bold).toContain("HACK CS2 BẢN PRECHEAT");
    expect(bold).toContain("KEY-AAAA-1111");
    expect(styles.filter((s) => s.st === ZALO_STYLE.red).map(slice)).toEqual([
      "KEY-AAAA-1111",
    ]);
    expect(styles.filter((s) => s.st === ZALO_STYLE.big).map(slice)).toEqual([
      "Mua hàng thành công",
    ]);
    expect(text).toContain("https://thichthihack.com/orders?don=DHABC123");
    // Every range survives the bot's own check.
    expect(readZaloStyles(styles, text.length)).toHaveLength(styles.length);
  });

  it("keeps an account's sign-in out and caps the keys", () => {
    const account = zaloReceiptMessage(
      receipt([
        line({
          kind: "account",
          keys: [{ value: "u|pass-123", expiresAt: null }],
        }),
      ]),
    );
    expect(account.text).not.toContain("pass-123");
    expect(account.text).toContain("Lấy thông tin");

    const keys = Array.from({ length: MAX_KEYS_ZALO + 3 }, (_, i) => ({
      value: `Z-${i}`,
      expiresAt: null,
    }));
    const many = zaloReceiptMessage(receipt([line({ keys })]));
    expect(many.text).toContain(`Z-${MAX_KEYS_ZALO - 1}`);
    expect(many.text).not.toContain(`Z-${MAX_KEYS_ZALO}\n`);
    expect(many.text).toContain("Còn 3 key nữa");
  });
});

describe("readZaloStyles", () => {
  it("keeps known styles inside the text and drops the rest", () => {
    expect(
      readZaloStyles(
        [
          { start: 0, len: 3, st: "b" },
          { start: 2, len: 50, st: "b" },
          { start: 1, len: 1, st: "script" },
          { start: -1, len: 2, st: "b" },
          { start: 1.5, len: 2, st: "b" },
          "junk",
        ],
        10,
      ),
    ).toEqual([{ start: 0, len: 3, st: "b" }]);
    expect(readZaloStyles(null, 10)).toBeNull();
    expect(readZaloStyles([{ start: 0, len: 0, st: "b" }], 10)).toBeNull();
  });
});

describe("account mail", () => {
  it("sets the code large and escapes the reset link", () => {
    const code = emailCodeMail({
      brand,
      username: "khach01",
      code: "482913",
      ttlMinutes: 10,
    });
    expect(code.subject).toBe("THICHTHIHACK | Mã xác minh email: 482913");
    expect(code.html).toContain(">482913</div>");
    expect(code.text).toContain("Mã xác minh email của bạn là: 482913");

    const reset = passwordResetMail({
      brand,
      username: "khach01",
      link: "https://thichthihack.com/reset-password?token=a&b=<c>",
      ttlMinutes: 30,
    });
    expect(reset.html).toContain(
      'href="https://thichthihack.com/reset-password?token=a&amp;b=&lt;c&gt;"',
    );
    expect(reset.html).toContain("Đặt mật khẩu mới");
    expect(reset.text).toContain("trong vòng 30 phút");
  });
});
