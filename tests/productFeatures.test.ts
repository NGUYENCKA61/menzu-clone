import { describe, expect, it } from "vitest";

import {
  cleanFeaturesNote,
  DEFAULT_FEATURES,
  FEATURE_MAX,
  featuresOrDefault,
  featuresToLines,
  noteToEditorHtml,
  parseFeatureLines,
  parseFeatures,
  sanitizeFeatures,
  serializeFeatures,
} from "@/lib/productFeatures";
import { cleanGuideHtml, DEFAULT_GUIDE, guideToEditorHtml } from "@/lib/productGuide";

/**
 * The feature list is per product and stored as text, so the two things that
 * matter are what survives a round trip and what a page does when the column
 * holds nothing usable — a storefront must never go blank over it.
 */
describe("sanitizeFeatures", () => {
  it("keeps a row that has a name, drops one that does not", () => {
    // The title is what is set in bold and what a skimming reader reads; a
    // bullet without one is an empty line with a dot in front of it.
    expect(
      sanitizeFeatures([
        { title: "Aimbot", body: "mượt" },
        { title: "   ", body: "vẫn có mô tả" },
        { title: "ESP" },
      ]),
    ).toEqual([
      { title: "Aimbot", body: "mượt" },
      { title: "ESP", body: "" },
    ]);
  });

  it("trims what a paste brings with it", () => {
    expect(sanitizeFeatures([{ title: "  No recoil  ", body: "  ổn định. " }])).toEqual([
      { title: "No recoil", body: "ổn định." },
    ]);
  });

  it("refuses anything that is not a list", () => {
    for (const junk of [null, undefined, "Aimbot", 42, { title: "Aimbot" }]) {
      expect(sanitizeFeatures(junk)).toEqual([]);
    }
  });

  it("stops at the ceiling", () => {
    const many = Array.from({ length: FEATURE_MAX + 5 }, (_, i) => ({
      title: `T${i}`,
      body: "",
    }));
    expect(sanitizeFeatures(many)).toHaveLength(FEATURE_MAX);
  });
});

describe("parseFeatures", () => {
  it("round-trips through the column", () => {
    const list = [{ title: "Aimbot", body: "mượt" }];
    expect(parseFeatures(serializeFeatures(list))).toEqual(list);
  });

  it("reads an unset or corrupt column as no list at all", () => {
    // Not as an error: the caller turns an empty list into the default one, so
    // a bad row costs the page its custom bullets, never the whole block.
    expect(parseFeatures(null)).toEqual([]);
    expect(parseFeatures("")).toEqual([]);
    expect(parseFeatures("{not json")).toEqual([]);
    expect(parseFeatures('{"title":"Aimbot"}')).toEqual([]);
  });

  it("stores nothing rather than an empty list", () => {
    // "[]" and NULL would mean the same thing, and one of them is fewer bytes
    // and already what an untouched product holds.
    expect(serializeFeatures([])).toBeNull();
    expect(serializeFeatures([{ title: "", body: "x" }])).toBeNull();
  });
});

describe("parseFeatureLines", () => {
  it("splits each line at its first colon", () => {
    expect(parseFeatureLines("Aimbot: mượt\nESP: xuyên tường")).toEqual([
      { title: "Aimbot", body: "mượt" },
      { title: "ESP", body: "xuyên tường" },
    ]);
  });

  it("leaves later colons inside the description", () => {
    // "ESP: tường, tên, máu: đầy đủ" is one feature, not a nested pair.
    expect(parseFeatureLines("ESP: tường, tên, máu: đầy đủ")).toEqual([
      { title: "ESP", body: "tường, tên, máu: đầy đủ" },
    ]);
  });

  it("takes a line with no colon as all name", () => {
    // "No recoil" needs no sentence after it.
    expect(parseFeatureLines("No recoil")).toEqual([{ title: "No recoil", body: "" }]);
  });

  it("drops blank lines and a line that is only a colon", () => {
    expect(parseFeatureLines("Aimbot: mượt\n\n   \n: mô tả không tên\nESP")).toEqual([
      { title: "Aimbot", body: "mượt" },
      { title: "ESP", body: "" },
    ]);
  });

  it("round-trips back to the same text", () => {
    const text = "Aimbot: mượt\nNo recoil";
    expect(featuresToLines(parseFeatureLines(text))).toBe(text);
  });
});

describe("cleanFeaturesNote", () => {
  it("keeps the formatting the editor is allowed to send", () => {
    const clean = cleanFeaturesNote("<p><strong>Aimbot</strong> chạy nền</p>");
    expect(clean).toContain("<strong>Aimbot</strong>");
  });

  it("strips a script the way every other body is stripped", () => {
    const clean = cleanFeaturesNote("<p>Aimbot</p><script>alert(1)</script>");
    expect(clean).not.toContain("script");
    expect(clean).toContain("Aimbot");
  });

  it("stores nothing for a document with nothing in it", () => {
    // An editor left untouched still sends markup. Storing that would draw an
    // empty block under the bullets.
    for (const empty of ["", "   ", "<p></p>", "<p><br></p>"]) {
      expect(cleanFeaturesNote(empty)).toBeNull();
    }
  });
});

describe("noteToEditorHtml", () => {
  it("opens empty when nothing is stored", () => {
    expect(noteToEditorHtml(null)).toBe("");
    expect(noteToEditorHtml("")).toBe("");
  });

  it("passes stored markup straight through", () => {
    const html = "<p><strong>Aimbot</strong></p>";
    expect(noteToEditorHtml(html)).toBe(html);
  });

  it("lifts a bare string into markup the editor can open", () => {
    const lifted = noteToEditorHtml("Aimbot chạy nền");
    expect(lifted).toContain("Aimbot chạy nền");
    expect(lifted).toMatch(/^<p/);
  });
});

describe("featuresOrDefault", () => {
  it("prints the shop's list when the product has none", () => {
    expect(featuresOrDefault([])).toBe(DEFAULT_FEATURES);
    expect(DEFAULT_FEATURES.length).toBeGreaterThan(0);
  });

  it("prefers the product's own", () => {
    const own = [{ title: "Aimbot", body: "" }];
    expect(featuresOrDefault(own)).toBe(own);
  });
});

describe("cleanGuideHtml", () => {
  it("keeps the formatting the editor is allowed to send", () => {
    const clean = cleanGuideHtml("<ol><li>Tải file</li><li>Bấm <strong>INSERT</strong></li></ol>");
    expect(clean).toContain("<li>");
    expect(clean).toContain("<strong>INSERT</strong>");
  });

  it("strips a script the way every other body is stripped", () => {
    const clean = cleanGuideHtml("<p>Tải file</p><script>alert(1)</script>");
    expect(clean).not.toContain("script");
    expect(clean).toContain("Tải file");
  });

  it("stores nothing for a document with nothing in it", () => {
    // Nothing stored is what puts the default sentence back on the page; an
    // untouched editor sends markup, and saving it would blank the block.
    for (const empty of ["", "   ", "<p></p>", "<p><br></p>"]) {
      expect(cleanGuideHtml(empty)).toBeNull();
    }
  });

  it("leaves a default to fall back to", () => {
    expect(DEFAULT_GUIDE.trim().length).toBeGreaterThan(0);
  });
});

describe("guideToEditorHtml", () => {
  it("opens empty when nothing is stored", () => {
    expect(guideToEditorHtml(null)).toBe("");
    expect(guideToEditorHtml("")).toBe("");
  });

  it("passes stored markup straight through", () => {
    const html = "<p>Bấm INSERT</p>";
    expect(guideToEditorHtml(html)).toBe(html);
  });

  it("lifts a bare string into markup the editor can open", () => {
    const lifted = guideToEditorHtml("Bấm INSERT");
    expect(lifted).toContain("Bấm INSERT");
    expect(lifted).toMatch(/^<p/);
  });
});
