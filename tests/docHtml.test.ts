import { describe, expect, it } from "vitest";

import { docHtmlToPlainText } from "@/lib/docHtml";

/**
 * One stored description, two voices: the rich HTML goes to the page, and this
 * is the sentence every other surface prints — meta description, OG card,
 * product tile, buy-panel blurb. What breaks here breaks in search results,
 * where nobody on the shop's side would ever see it.
 */
describe("docHtmlToPlainText", () => {
  it("keeps the words apart across block boundaries", () => {
    const html =
      "<h2>Tính năng nổi bật</h2><p>Aimbot mượt</p><ul><li>ESP</li><li>Radar</li></ul>";
    expect(docHtmlToPlainText(html)).toBe("Tính năng nổi bật Aimbot mượt ESP Radar");
  });

  it("treats a line break as a space, not as nothing", () => {
    expect(docHtmlToPlainText("<p>Dòng một<br />Dòng hai</p>")).toBe("Dòng một Dòng hai");
  });

  it("gives back characters, not entities", () => {
    expect(docHtmlToPlainText("<p>Acc &amp; Tool &quot;xịn&quot;</p>")).toBe(
      'Acc & Tool "xịn"',
    );
  });

  it("drops the markup a description can carry", () => {
    expect(docHtmlToPlainText('<p>Xin <strong>chào</strong> <em>bạn</em></p>')).toBe(
      "Xin chào bạn",
    );
  });

  it("trims to length with an ellipsis, on a whole word", () => {
    const long = `<p>${"a".repeat(50)}</p>`;
    const short = docHtmlToPlainText(long, 20);
    expect(short).toHaveLength(20);
    expect(short.endsWith("…")).toBe(true);
    // Under the limit it is left exactly as it reads.
    expect(docHtmlToPlainText("<p>ngắn</p>", 20)).toBe("ngắn");
  });
});
