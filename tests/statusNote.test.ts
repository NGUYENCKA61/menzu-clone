import { describe, expect, it } from "vitest";

import {
  clauseAsSentence,
  noteSpans,
  parseStatusNote,
  statusNoteToPlainText,
  statusNoteToTelegramHtml,
} from "@/lib/statusNote";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("noteSpans", () => {
  it("splits bold runs out of a line", () => {
    expect(noteSpans("Chạy ổn định **7 ngày** liên tục")).toEqual([
      { text: "Chạy ổn định ", bold: false },
      { text: "7 ngày", bold: true },
      { text: " liên tục", bold: false },
    ]);
  });

  it("leaves an unclosed marker as text", () => {
    expect(noteSpans("giảm **20% hôm nay")).toEqual([{ text: "giảm **20% hôm nay", bold: false }]);
  });
});

describe("parseStatusNote", () => {
  it("groups lines into paragraphs and dash lines into a list", () => {
    const blocks = parseStatusNote(
      "**Đã cập nhật xong**\nTương thích bản mới.\n- Sửa lỗi văng game\n• Thêm ESP\n\nTải lại loader.",
    );
    expect(blocks.map((b) => b.kind)).toEqual(["lines", "list", "lines"]);
    expect(blocks[0]).toEqual({
      kind: "lines",
      lines: [[{ text: "Đã cập nhật xong", bold: true }], [{ text: "Tương thích bản mới.", bold: false }]],
    });
    expect(blocks[1]).toEqual({
      kind: "list",
      items: [[{ text: "Sửa lỗi văng game", bold: false }], [{ text: "Thêm ESP", bold: false }]],
    });
  });

  it("keeps a hyphen inside a line as text", () => {
    expect(parseStatusNote("Bản 2.1 - đã vá")).toEqual([
      { kind: "lines", lines: [[{ text: "Bản 2.1 - đã vá", bold: false }]] },
    ]);
  });

  it("reads Windows line breaks", () => {
    expect(parseStatusNote("a\r\n- b").map((b) => b.kind)).toEqual(["lines", "list"]);
  });
});

describe("statusNoteToPlainText", () => {
  it("drops the bold markers and draws bullets", () => {
    expect(statusNoteToPlainText("**Xong rồi**\n- tải lại loader\n\nhết")).toBe(
      "Xong rồi\n• tải lại loader\n\nhết",
    );
  });
});

describe("clauseAsSentence", () => {
  it("capitalises the clause's first letter, đ included", () => {
    expect(clauseAsSentence("đã an toàn, dùng lại bình thường.")).toBe(
      "Đã an toàn, dùng lại bình thường.",
    );
  });
});

describe("statusNoteToTelegramHtml", () => {
  it("escapes, bolds and bullets", () => {
    expect(statusNoteToTelegramHtml("**Xong** <3\n- một & hai", escape)).toBe(
      "<b>Xong</b> &lt;3\n• một &amp; hai",
    );
  });
});
