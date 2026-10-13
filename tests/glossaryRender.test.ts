import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlossaryBrowser } from "@/components/sites/menzu-lol-f7ae197a/shared/GlossaryBrowser";
import { aliasAnchors, GLOSSARY_GROUPS, GLOSSARY_TERMS } from "@/lib/glossary/terms";

/**
 * The page as the server sends it, before any script runs: the whole library
 * has to be in the HTML (search engines read that, and a #word link has to
 * land without waiting for React), and every anchor on it exactly once.
 */
function render(initialQuery?: string): string {
  return renderToStaticMarkup(
    createElement(GlossaryBrowser, { terms: GLOSSARY_TERMS, initialQuery }),
  );
}

function idsIn(html: string): string[] {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
}

describe("glossary page markup", () => {
  it("renders every word, every alias anchor and every group without a script", () => {
    const html = render();
    const ids = idsIn(html);
    for (const term of GLOSSARY_TERMS) {
      expect(ids, term.id).toContain(term.id);
      for (const anchor of aliasAnchors(term)) expect(ids, anchor).toContain(anchor);
    }
    for (const group of GLOSSARY_GROUPS) expect(ids).toContain(`nhom-${group.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens a shared ?q= as its results, with the library put away", () => {
    const html = render("silent");
    expect(html).toContain('id="silent-aim"');
    expect(html).not.toContain('id="nhom-ngam-ban"');
    expect(html).toMatch(/\d+ thuật ngữ/);
    const ids = idsIn(html);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("says so when nothing matches", () => {
    const html = render("khongcotunay");
    expect(html).toContain("0 thuật ngữ");
    expect(html).toContain("Không có thuật ngữ nào khớp");
  });

  it("draws the exposure chips and the wiki links", () => {
    const html = render();
    expect(html).toContain("Rất lộ");
    expect(html).toContain("Ít lộ");
    expect(html).toContain("Lộ vừa");
    expect(html).toContain('href="/docs/spoofer-la-gi"');
    expect(html).toContain('href="#fov"');
  });
});
