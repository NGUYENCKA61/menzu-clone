import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildGlossaryIndex, foldText, rankEntry, searchGlossary } from "@/lib/glossary/search";
import {
  aliasAnchor,
  aliasAnchors,
  GLOSSARY_GROUPS,
  GLOSSARY_TERMS,
  termHref,
  type GlossaryTerm,
} from "@/lib/glossary/terms";
import { docHref, GLOSSARY_LEGACY_SLUG, GLOSSARY_SLUG } from "@/lib/routes";
import { glossaryJsonLd } from "@/lib/seo";

/** Written as a code so this file holds none itself. */
const EM_DASH = String.fromCharCode(0x2014);

/** Wiki articles that live only in the database, not in content/wiki. */
const LEGACY_DOC_SLUGS = ["drop-mail-la-gi"];

const articleSlugs: string[] = (
  JSON.parse(
    readFileSync(path.join(__dirname, "..", "content", "wiki", "articles.json"), "utf8"),
  ) as { slug: string }[]
).map((article) => article.slug);

const groupLabel = (id: GlossaryTerm["group"]) =>
  GLOSSARY_GROUPS.find((group) => group.id === id)?.label ?? "";
const index = buildGlossaryIndex(GLOSSARY_TERMS, groupLabel);
const ids = (query: string) => searchGlossary(index, query).map((term) => term.id);

/** Every string a term carries, for the copy rules. */
function stringsOf(term: GlossaryTerm): string[] {
  return [
    term.id,
    term.term,
    term.short,
    term.detail,
    ...(term.aliases ?? []),
    ...(term.tags ?? []),
    ...(term.related ?? []),
    ...(term.doc ? [term.doc.href, term.doc.label] : []),
  ];
}

describe("glossary data", () => {
  it("has more than 80 words, as the page and the article title say", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThan(80);
  });

  it("gives every word a unique id fit for an anchor", () => {
    const seen = new Set<string>();
    for (const term of GLOSSARY_TERMS) {
      expect(term.id).toMatch(/^[a-z0-9-]+$/);
      expect(seen.has(term.id), term.id).toBe(false);
      seen.add(term.id);
    }
  });

  it("points related words at words that exist, never at themselves", () => {
    const known = new Set(GLOSSARY_TERMS.map((term) => term.id));
    for (const term of GLOSSARY_TERMS) {
      for (const id of term.related ?? []) {
        expect(known.has(id), `${term.id} -> ${id}`).toBe(true);
        expect(id, term.id).not.toBe(term.id);
      }
    }
  });

  it("keeps every anchor, id or alias, unique across the page", () => {
    const owner = new Map<string, string>();
    for (const term of GLOSSARY_TERMS) {
      for (const anchor of [term.id, ...aliasAnchors(term)]) {
        expect(owner.get(anchor) ?? term.id, `#${anchor} on ${term.id}`).toBe(term.id);
        owner.set(anchor, term.id);
      }
    }
    // The group sections (#nhom-ngam-ban...) share the document with the
    // cards and must not collide with them either.
    for (const group of GLOSSARY_GROUPS) {
      expect(owner.has(`nhom-${group.id}`)).toBe(false);
    }
  });

  it("files a word under every group", () => {
    for (const group of GLOSSARY_GROUPS) {
      expect(
        GLOSSARY_TERMS.some((term) => term.group === group.id),
        group.id,
      ).toBe(true);
    }
  });

  it("writes no em dash anywhere", () => {
    const all = [
      ...GLOSSARY_TERMS.flatMap(stringsOf),
      ...GLOSSARY_GROUPS.flatMap((group) => [group.label, group.blurb]),
    ];
    for (const text of all) expect(text, text).not.toContain(EM_DASH);
  });

  it("keeps each one-line meaning to one line", () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.short.length, term.id).toBeLessThanOrEqual(140);
      expect(term.detail.trim().length, term.id).toBeGreaterThan(0);
    }
  });

  it("links only to wiki articles that exist", () => {
    for (const term of GLOSSARY_TERMS) {
      if (!term.doc) continue;
      expect(term.doc.href.startsWith("/docs/"), term.id).toBe(true);
      const slug = term.doc.href.slice("/docs/".length);
      expect(
        articleSlugs.includes(slug) || LEGACY_DOC_SLUGS.includes(slug),
        `${term.id} -> ${term.doc.href}`,
      ).toBe(true);
    }
  });

  it("never files an article on the glossary page's slug", () => {
    expect(articleSlugs).not.toContain(GLOSSARY_SLUG);
    expect(articleSlugs).toContain(GLOSSARY_LEGACY_SLUG);
  });
});

describe("anchors", () => {
  it("turns an alias into a plain ASCII anchor", () => {
    expect(aliasAnchor("Show FOV circle")).toBe("show-fov-circle");
    expect(aliasAnchor("Nạp tool")).toBe("nap-tool");
    expect(aliasAnchor("Đổi IP")).toBe("doi-ip");
    expect(aliasAnchor("Visual C++ Redistributable")).toBe("visual-c-redistributable");
    expect(aliasAnchor("  TPM 2.0 ")).toBe("tpm-2-0");
  });

  it("drops an alias anchor that would repeat the card's own id", () => {
    const fov = GLOSSARY_TERMS.find((term) => term.id === "fov");
    expect(fov && aliasAnchors(fov)).toEqual(["aim-fov", "field-of-view"]);
  });

  it("lands unnamedtech's alias cards on ours", () => {
    const anchors = new Map<string, string>();
    for (const term of GLOSSARY_TERMS) {
      for (const anchor of aliasAnchors(term)) anchors.set(anchor, term.id);
    }
    expect(anchors.get("smoothness")).toBe("smooth");
    expect(anchors.get("show-fov")).toBe("draw-fov");
    expect(anchors.get("rcs")).toBe("no-recoil");
    expect(anchors.get("visible-only")).toBe("visible-check");
    expect(anchors.get("only-enemies")).toBe("team-check");
    expect(anchors.get("speed")).toBe("aim-speed");
  });

  it("builds a word's address on the page", () => {
    expect(termHref("silent-aim")).toBe("/docs/thuat-ngu#silent-aim");
  });
});

describe("glossary search", () => {
  it("folds accents, đ, case and punctuation", () => {
    expect(foldText("Độ mượt")).toBe("do muot");
    expect(foldText("  Tâm   NGẮM ")).toBe("tam ngam");
    expect(foldText("VT-x")).toBe("vt x");
    expect(foldText("Tuỳ chỉnh")).toBe(foldText("Tùy chỉnh"));
    expect(foldText(EM_DASH)).toBe("");
  });

  it("finds words typed without accents", () => {
    expect(ids("do muot")[0]).toBe("smooth");
    expect(ids("kiem tra")[0]).toBe("visible-check");
    expect(ids("tam ngam")).toContain("aimbot");
  });

  it("puts a word's own name before a mention elsewhere", () => {
    const hits = ids("spoof");
    expect(hits[0]).toBe("spoofer");
    // The others only mention spoofing in their explanations.
    expect(hits).toContain("hwid-ban");
    expect(hits.indexOf("spoofer")).toBeLessThan(hits.indexOf("hwid-ban"));
  });

  it("ranks exact, then prefix, then contains, then text", () => {
    const entry = index.find((e) => e.term.id === "silent-aim");
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(rankEntry(entry, "silent aim")).toBe(0);
    expect(rankEntry(entry, "silent")).toBe(1);
    expect(rankEntry(entry, "aim")).toBe(2);
    expect(rankEntry(entry, "replay")).toBe(3);
    expect(rankEntry(entry, "replay acc")).toBe(4);
    expect(rankEntry(entry, "bunny")).toBeNull();
  });

  it("matches aliases and spellings without spaces or hyphens", () => {
    expect(ids("smoothness")[0]).toBe("smooth");
    expect(ids("anticheat")[0]).toBe("anti-cheat");
    expect(ids("stream-proof")[0]).toBe("stream-proof");
    expect(ids("RCS")[0]).toBe("no-recoil");
  });

  it("keeps the file's order among equals", () => {
    const ranked = searchGlossary(index, "esp").map((term) => {
      const at = GLOSSARY_TERMS.indexOf(term);
      return { at, rank: rankEntry(index[at], "esp") ?? Number.POSITIVE_INFINITY };
    });
    expect(ranked.length).toBeGreaterThan(5);
    for (let k = 1; k < ranked.length; k += 1) {
      const [before, after] = [ranked[k - 1], ranked[k]];
      expect(before.rank).toBeLessThanOrEqual(after.rank);
      if (before.rank === after.rank) expect(before.at).toBeLessThan(after.at);
    }
  });

  it("returns nothing for an empty or punctuation-only query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
    expect(ids("??")).toEqual([]);
  });

  it("searches the group's label too", () => {
    expect(ids("chuan bi may")).toContain("secure-boot");
  });
});

describe("glossary addresses", () => {
  it("sends the old glossary article straight to the page", () => {
    expect(docHref(GLOSSARY_LEGACY_SLUG)).toBe("/docs/thuat-ngu");
    expect(docHref("config-la-gi")).toBe("/docs/config-la-gi");
  });

  it("describes every word in the schema.org record", () => {
    const record = glossaryJsonLd(GLOSSARY_TERMS);
    expect(record["@type"]).toBe("DefinedTermSet");
    expect(record.hasDefinedTerm).toHaveLength(GLOSSARY_TERMS.length);
    const first = record.hasDefinedTerm[0];
    expect(first["@type"]).toBe("DefinedTerm");
    expect(first.url.endsWith("/docs/thuat-ngu#aimbot")).toBe(true);
    expect(first.inDefinedTermSet).toBe(record["@id"]);
    // Valid JSON for the <script> it goes into.
    expect(() => JSON.parse(JSON.stringify(record))).not.toThrow();
  });
});
