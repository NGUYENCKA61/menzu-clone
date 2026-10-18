import { describe, expect, it } from "vitest";

import { docHtmlToPlainText, outlineDocHtml, sanitizeDocHtml, stripNewlineArtifacts } from "@/lib/docHtml";

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

describe("sanitizeDocHtml links", () => {
  it("marks a link to another site nofollow and keeps target=_blank", () => {
    const out = sanitizeDocHtml('<p><a href="https://obvhax.com/cs2">OBV</a></p>');
    expect(out).toContain('rel="nofollow noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(sanitizeDocHtml('<p><a href="//beasthax.com/">B</a></p>')).toContain("nofollow");
  });

  it("leaves the shop's own addresses, old domain included, without nofollow", () => {
    for (const own of [
      "/docs/spoofer-la-gi",
      "https://thichthihackk.com/docs/x",
      "https://www.thichthihack.com/",
      "http://thichthihack.com/huong-dan/x",
    ]) {
      const out = sanitizeDocHtml(`<p><a href="${own}">Bài</a></p>`);
      expect(out, own).toContain('rel="noopener noreferrer"');
      expect(out, own).not.toContain("nofollow");
    }
  });

  it("drops a link with nothing in it, and keeps one around a picture", () => {
    expect(sanitizeDocHtml('<p><a href="https://beasthax.com/"></a>B</p>')).toBe("<p>B</p>");
    expect(sanitizeDocHtml('<p><a href="/x"> </a>B</p>')).toBe("<p>B</p>");
    expect(sanitizeDocHtml('<p><a href="/x"><img src="/uploads/docs/a.png" /></a></p>')).toContain(
      "<a ",
    );
    expect(sanitizeDocHtml('<p><a href="/x"><strong>Đậm</strong></a></p>')).toContain("<a ");
  });
});

describe("sanitizeDocHtml empty headings", () => {
  it("drops a heading with no words and keeps one with", () => {
    expect(sanitizeDocHtml("<h3></h3><p>A</p>")).toBe("<p>A</p>");
    expect(sanitizeDocHtml("<h2> &nbsp; </h2><p>A</p>")).toBe("<p>A</p>");
    expect(sanitizeDocHtml("<h3>Cài đặt</h3>")).toBe("<h3>Cài đặt</h3>");
  });
});

describe("sanitizeDocHtml picture corners", () => {
  it("keeps a picture set to square corners", () => {
    expect(sanitizeDocHtml('<img src="/uploads/docs/a.png" data-corner="square" />')).toContain(
      'data-corner="square"',
    );
  });

  it("empties any other corner value, leaving the house rounding", () => {
    // sanitize-html keeps the attribute but strips a value not on its list;
    // the stylesheet only squares data-corner="square".
    const out = sanitizeDocHtml('<img src="/uploads/docs/a.png" data-corner="round" />');
    expect(out).toContain('src="/uploads/docs/a.png"');
    expect(out).not.toContain('data-corner="');
  });

  it("does not let the corner mark onto anything but a picture", () => {
    expect(sanitizeDocHtml('<p data-corner="square">A</p>')).toBe("<p>A</p>");
  });
});

/**
 * The wiki's "Mục lục" links to ids this hands out; the article renders the
 * same body through it, so the same words must always give the same ids.
 */
describe("outlineDocHtml", () => {
  it("gives each h2 an id from its words and lists them in order", () => {
    const { html, headings } = outlineDocHtml(
      '<h2>Bước 1: tạo tài khoản</h2><p>A</p><h2 style="text-align: center">Bước 2: nạp <strong>tiền</strong></h2>',
    );
    expect(headings).toEqual([
      { id: "buoc-1-tao-tai-khoan", text: "Bước 1: tạo tài khoản" },
      { id: "buoc-2-nap-tien", text: "Bước 2: nạp tiền" },
    ]);
    expect(html).toBe(
      '<h2 id="buoc-1-tao-tai-khoan">Bước 1: tạo tài khoản</h2><p>A</p><h2 style="text-align: center" id="buoc-2-nap-tien">Bước 2: nạp <strong>tiền</strong></h2>',
    );
  });

  it("numbers a heading that reads like an earlier one and skips empty ones", () => {
    const { headings } = outlineDocHtml("<h2>Lưu ý</h2><h2></h2><h2>Lưu ý</h2>");
    expect(headings.map((h) => h.id)).toEqual(["luu-y", "luu-y-2"]);
  });
});
