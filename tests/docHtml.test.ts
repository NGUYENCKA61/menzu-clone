import { describe, expect, it } from "vitest";

import { docHtmlToPlainText, sanitizeDocHtml, stripNewlineArtifacts } from "@/lib/docHtml";

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

describe("stripNewlineArtifacts", () => {
  it("turns the old site's bare rn runs back into line breaks", () => {
    expect(stripNewlineArtifacts(" rnrn<p></p>rnrn<span>DEMO</span>rn\t<li>")).toBe(
      " \n<p></p>\n<span>DEMO</span>\n\t<li>",
    );
  });

  it("leaves rn inside a word alone", () => {
    expect(stripNewlineArtifacts("modern Bern turn rn")).toBe("modern Bern turn \n");
  });

  it("is applied on both voices", () => {
    expect(docHtmlToPlainText("rnrn<p>Hello</p>rnrn<p>World</p>")).toBe("Hello World");
    expect(sanitizeDocHtml("<p>A</p>rnrn<p>B</p>")).not.toContain("rn");
  });
});

describe("sanitizeDocHtml font sizes", () => {
  it("keeps a span up to 20px and drops a larger one", () => {
    const out = sanitizeDocHtml(
      '<span style="font-size:28px">A</span><span style="font-size:16px">B</span>',
    );
    expect(out).toContain("font-size:16px");
    expect(out).not.toContain("28px");
  });
});
