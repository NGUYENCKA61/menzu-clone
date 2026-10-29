import { describe, expect, it } from "vitest";

import { foldText, handoffReason } from "@/lib/chatHandoff";

describe("foldText", () => {
  it("lowercases, strips diacritics and folds đ", () => {
    expect(foldText("HOÀN TIỀN")).toBe("hoan tien");
    expect(foldText("Đơn hàng")).toBe("don hang");
    expect(foldText("nạp chưa VÀO")).toBe("nap chua vao");
  });
});

describe("handoffReason", () => {
  it("hands over money questions, with or without diacritics", () => {
    expect(handoffReason("Cho mình hoàn tiền đơn hôm qua")).toBe("Hỏi về tiền, nạp, hoàn");
    expect(handoffReason("hoan tien giup em")).toBe("Hỏi về tiền, nạp, hoàn");
    expect(handoffReason("Nạp 50k mà chưa vào tài khoản")).toBe("Hỏi về tiền, nạp, hoàn");
    expect(handoffReason("nap tien 2 tieng roi khong thay len")).toBe("Hỏi về tiền, nạp, hoàn");
    expect(handoffReason("chuyển khoản rồi mà chưa thấy gì")).toBe("Hỏi về tiền, nạp, hoàn");
    expect(handoffReason("sao bị trừ tiền 2 lần vậy")).toBe("Hỏi về tiền, nạp, hoàn");
  });

  it("hands over a key or a paid order that still fails", () => {
    expect(handoffReason("key không chạy dù làm đúng hướng dẫn")).toBe(
      "Key hoặc đơn đã mua bị lỗi",
    );
    expect(handoffReason("mua xong chua nhan duoc key")).toBe("Key hoặc đơn đã mua bị lỗi");
    expect(handoffReason("acc bị khoá rồi shop ơi")).toBe("Key hoặc đơn đã mua bị lỗi");
    expect(handoffReason("mua rồi mà không thấy hàng đâu")).toBe("Key hoặc đơn đã mua bị lỗi");
  });

  it("hands over when the customer asks for a human", () => {
    expect(handoffReason("cho mình gặp admin")).toBe("Đòi gặp admin");
    expect(handoffReason("admin ơi")).toBe("Đòi gặp admin");
    expect(handoffReason("toi muon noi chuyen voi admin")).toBe("Đòi gặp admin");
  });

  it("flags an angry customer before milder labels", () => {
    expect(handoffReason("đây là lừa đảo, tôi báo công an")).toBe("Khách bức xúc");
    expect(handoffReason("shop scam tiền của khách à")).toBe("Khách bức xúc");
  });

  it("lets the bot keep ordinary product talk", () => {
    expect(handoffReason("Mình chơi CS2, nên mua gói nào?")).toBeNull();
    expect(handoffReason("Gói 1 tháng giá bao nhiêu?")).toBeNull();
    expect(handoffReason("Hack này có an toàn không?")).toBeNull();
    expect(handoffReason("Cách cài đặt tool như nào?")).toBeNull();
    expect(handoffReason("nạp tiền ở đâu vậy shop")).toBeNull();
    expect(handoffReason("mua key ở trang nào")).toBeNull();
  });
});
