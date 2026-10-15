import { describe, expect, it } from "vitest";

import categoriesJson from "../content/seo/categories.json";
import toolsJson from "../content/seo/tools.json";
import {
  INTRO_ALLOWED,
  SeoCopyError,
  faqEntries,
  parseCategorySeoCopy,
  parseToolSeoCopy,
  styleViolation,
} from "@/lib/seoCopy";

/**
 * The written SEO copy ships in git (content/seo/*.json) and is rendered
 * straight into pages, the intro as HTML. The loader is therefore the one
 * gate: whatever it lets through reaches a <title>, a search snippet and
 * a dangerouslySetInnerHTML. These tests pin what it refuses.
 */

const intro =
  "<p>Shelf <strong>CS2</strong> của <em>shop</em>: thuê theo ngày, xem <a href=\"/tai-lieu\">tài liệu</a>.</p>" +
  "<p>Trạng thái từng bản luôn ở <a href=\"/thong-bao\">thông báo</a>.</p>";

const faq = [
  { q: "Hack CS2 giá bao nhiêu?", a: "Giá theo gói: từ 39.000đ một ngày đến 1.500.000đ vĩnh viễn, tuỳ bản." },
  { q: "Máy net dùng được không?", a: "Tuỳ bản: trang tool ghi rõ máy nhà hay máy nhà và net, đọc trước khi mua key." },
  { q: "Cần cài gì trước khi chạy?", a: "Tắt Windows Defender, tắt Secure Boot nếu tool yêu cầu và cài đủ runtime theo tài liệu." },
];

const good = {
  "hack-cs2-counter-strike-2": {
    metaTitle: "Thuê hack CS2 giá rẻ, key theo ngày",
    metaDescription:
      "Thuê hack CS2 tại THICHTHIHACK: bản legit, bản rage và bản precheat, key giao tự động, bảo hành đổi máy, hỗ trợ 8:00 đến 23:00 mỗi ngày.",
    intro,
    faq,
  },
};

function category(patch: Record<string, unknown>, slug = "hack-cs2-counter-strike-2") {
  return { [slug]: { ...good["hack-cs2-counter-strike-2"], ...patch } };
}

describe("parseCategorySeoCopy", () => {
  it("reads a good entry by slug", () => {
    const map = parseCategorySeoCopy(good);
    expect(map.get("hack-cs2-counter-strike-2")?.metaTitle).toBe(
      "Thuê hack CS2 giá rẻ, key theo ngày",
    );
    expect(map.get("hack-cs2-counter-strike-2")?.faq).toHaveLength(3);
  });

  it("names the file, the slug and the field in its error", () => {
    expect(() => parseCategorySeoCopy(category({ metaTitle: "Ngắn" }), "x.json")).toThrow(
      /^x\.json: hack-cs2-counter-strike-2\.metaTitle /,
    );
    expect(() => parseCategorySeoCopy(category({ metaTitle: "Ngắn" }))).toThrow(SeoCopyError);
  });

  it("refuses anything but an object keyed by slugs", () => {
    expect(() => parseCategorySeoCopy([])).toThrow(/root must be an object/);
    expect(() => parseCategorySeoCopy(null)).toThrow(SeoCopyError);
    expect(() => parseCategorySeoCopy({ "Hack CS2": good["hack-cs2-counter-strike-2"] })).toThrow(
      /key must be a slug/,
    );
    expect(() => parseCategorySeoCopy({ "hack-cs2": "text" })).toThrow(/entry must be an object/);
  });

  it("keeps the title between 20 and 48 characters, with no bar and no brand", () => {
    expect(() => parseCategorySeoCopy(category({ metaTitle: "Hack CS2 giá rẻ" }))).toThrow(
      /metaTitle must be 20\.\.48/,
    );
    expect(() =>
      parseCategorySeoCopy(category({ metaTitle: "Thuê hack CS2 giá rẻ, key theo ngày, tuần và tháng, bảo hành" })),
    ).toThrow(/metaTitle must be 20\.\.48/);
    expect(() => parseCategorySeoCopy(category({ metaTitle: "Thuê hack CS2 | key theo ngày" }))).toThrow(
      /must not carry "\|"/,
    );
    expect(() =>
      parseCategorySeoCopy(category({ metaTitle: "Thuê hack CS2 tại THICHTHIHACK" })),
    ).toThrow(/must not carry/);
  });

  it("keeps the description between 80 and 160 characters", () => {
    expect(() =>
      parseCategorySeoCopy(category({ metaDescription: "Thuê hack CS2 giá rẻ tại shop." })),
    ).toThrow(/metaDescription must be 80\.\.160/);
    expect(() =>
      parseCategorySeoCopy(category({ metaDescription: "a".repeat(161) })),
    ).toThrow(/metaDescription must be 80\.\.160/);
  });

  it("refuses a string with stray whitespace or a non-string", () => {
    expect(() => parseCategorySeoCopy(category({ metaTitle: " Thuê hack CS2 giá rẻ, key theo ngày" }))).toThrow(
      /whitespace/,
    );
    expect(() => parseCategorySeoCopy(category({ metaDescription: 42 }))).toThrow(/must be a string/);
  });

  it("wants 3 to 6 questions, each ending in ?, with plain-text answers", () => {
    expect(() => parseCategorySeoCopy(category({ faq: faq.slice(0, 2) }))).toThrow(
      /faq must be a list of 3\.\.6/,
    );
    expect(() => parseCategorySeoCopy(category({ faq: [...faq, ...faq, faq[0]] }))).toThrow(
      /faq must be a list of 3\.\.6/,
    );
    expect(() =>
      parseCategorySeoCopy(category({ faq: [{ q: "Hack CS2 giá bao nhiêu", a: faq[0]!.a }, ...faq.slice(1)] })),
    ).toThrow(/faq\[0\]\.q must end in "\?"/);
    expect(() =>
      parseCategorySeoCopy(category({ faq: [{ q: "Giá?", a: faq[0]!.a }, ...faq.slice(1)] })),
    ).toThrow(/faq\[0\]\.q must be 10\.\.120/);
    expect(() =>
      parseCategorySeoCopy(category({ faq: [{ q: faq[0]!.q, a: "Ngắn quá." }, ...faq.slice(1)] })),
    ).toThrow(/faq\[0\]\.a must be 40\.\.600/);
    expect(() =>
      parseCategorySeoCopy(
        category({ faq: [{ q: faq[0]!.q, a: `${faq[0]!.a} <a href="/x">xem</a>` }, ...faq.slice(1)] }),
      ),
    ).toThrow(/faq\[0\]\.a must be plain text/);
    expect(() => parseCategorySeoCopy(category({ faq: "none" }))).toThrow(/faq must be a list/);
  });

  it("maps the FAQ to the accordion's shape", () => {
    const copy = parseCategorySeoCopy(good).get("hack-cs2-counter-strike-2")!;
    expect(faqEntries(copy)[0]).toEqual({ question: faq[0]!.q, answer: faq[0]!.a });
  });
});

describe("INTRO_ALLOWED, the intro's sanitizer", () => {
  const p = (inner: string) => `<p>${inner}</p>`;

  it("admits 2 or 3 paragraphs of text, strong, em and root-relative links", () => {
    expect(INTRO_ALLOWED.test(intro)).toBe(true);
    expect(INTRO_ALLOWED.test(`${p("Một")}\n${p("Hai")}\n${p("Ba")}\n`)).toBe(true);
    expect(INTRO_ALLOWED.test(p('Xem <a href="/docs/spoofer-la-gi">bài</a> và <a href="/">trang chủ</a>.') + p("Hai"))).toBe(true);
  });

  it("refuses one paragraph or four", () => {
    expect(INTRO_ALLOWED.test(p("Một"))).toBe(false);
    expect(INTRO_ALLOWED.test(p("1") + p("2") + p("3") + p("4"))).toBe(false);
  });

  it("refuses scripts, pictures, absolute links, protocol-relative links and attributes", () => {
    expect(INTRO_ALLOWED.test(p("A<script>alert(1)</script>") + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<img src="/x.png">') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<a href="https://obvhax.com/">x</a>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<a href="//evil.com/">x</a>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<a href="/x" target="_blank">x</a>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<a href="/x" onclick="x()">x</a>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<a href="javascript:alert(1)">x</a>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p('<span style="color:red">x</span>') + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test(p("<br>") + p("B"))).toBe(false);
    expect(INTRO_ALLOWED.test('<p class="x">A</p>' + p("B"))).toBe(false);
  });

  it("is what the loader applies", () => {
    expect(() => parseCategorySeoCopy(category({ intro: p("A<script></script>") + p("B") }))).toThrow(
      /intro must be 2 or 3 <p>/,
    );
  });
});

describe("the style rules", () => {
  it("catch dashes, ban promises, 100%, undetected and 24/7", () => {
    for (const bad of [
      "Giá từ 39.000đ – 1.500.000đ",
      "Key theo ngày — giao ngay",
      "Bản này không bị ban",
      "Chơi thoải mái, ko bị khoá acc",
      "Bản mới KHÔNG BỊ PHÁT HIỆN",
      "An toàn 100 %",
      "an toàn tuyệt đối",
      "Undetected từ tháng 9",
      "Shop hỗ trợ 24/7",
      "Không thể bị VAC quét",
    ]) {
      expect(styleViolation(bad), bad).not.toBeNull();
    }
  });

  it("let the allowed phrasings through", () => {
    for (const ok of [
      "Mọi tool bên thứ ba đều có thể bị anti-cheat phát hiện vào một lúc nào đó.",
      "Hỗ trợ 8:00 đến 23:00 mỗi ngày.",
      "Shop không bồi hoàn acc bị khoá.",
      "Key không bị trừ ngày khi shop bảo trì.",
    ]) {
      expect(styleViolation(ok), ok).toBeNull();
    }
  });

  it("are applied to every string the loader reads", () => {
    expect(() =>
      parseCategorySeoCopy(category({ metaDescription: `${good["hack-cs2-counter-strike-2"].metaDescription.slice(0, 90)} không bị ban.` })),
    ).toThrow(/says something forbidden/);
    expect(() =>
      parseCategorySeoCopy(category({ faq: [{ q: faq[0]!.q, a: `${faq[0]!.a} Hỗ trợ 24/7.` }, ...faq.slice(1)] })),
    ).toThrow(/faq\[0\]\.a says something forbidden/);
    expect(() =>
      parseToolSeoCopy({ "hack-cs2": { summary: "Bản legit CS2 cho máy nhà, ESP và aimbot, không bị phát hiện, key theo ngày." } }),
    ).toThrow(/summary says something forbidden/);
  });
});

describe("parseToolSeoCopy", () => {
  const summary =
    "Bản legit CS2 cho máy nhà: ESP, aimbot mượt, mod skin, key theo ngày, tuần hoặc tháng.";

  it("reads a plain-text summary of 60 to 160 characters", () => {
    expect(parseToolSeoCopy({ "hack-cs2-ban-legit": { summary } }).get("hack-cs2-ban-legit")).toEqual({
      summary,
    });
    expect(() => parseToolSeoCopy({ "hack-cs2": { summary: "Bản legit CS2." } })).toThrow(
      /summary must be 60\.\.160/,
    );
    expect(() => parseToolSeoCopy({ "hack-cs2": { summary: "a".repeat(161) } })).toThrow(
      /summary must be 60\.\.160/,
    );
    expect(() => parseToolSeoCopy({ "hack-cs2": { summary: `${summary} <b>x</b>` } })).toThrow(
      /summary must be plain text/,
    );
    expect(() => parseToolSeoCopy({ "hack-cs2": {} })).toThrow(/summary must be a string/);
    expect(() => parseToolSeoCopy({ "Hack CS2": { summary } })).toThrow(/key must be a slug/);
  });
});

/** The committed files: what the copy builders wrote is checked at merge. */
describe("real files", () => {
  it("content/seo/categories.json parses, titles at most 48 and descriptions at most 160", () => {
    const map = parseCategorySeoCopy(categoriesJson);
    for (const [slug, copy] of map) {
      expect(copy.metaTitle.length, `${slug}.metaTitle`).toBeLessThanOrEqual(48);
      expect(copy.metaDescription.length, `${slug}.metaDescription`).toBeLessThanOrEqual(160);
    }
  });

  it("content/seo/tools.json parses", () => {
    const map = parseToolSeoCopy(toolsJson);
    for (const [slug, copy] of map) {
      expect(copy.summary.length, `${slug}.summary`).toBeLessThanOrEqual(160);
    }
  });
});
