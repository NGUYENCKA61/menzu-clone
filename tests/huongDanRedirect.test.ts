import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /huong-dan/<slug> was the old PHP shop's buy page. Its handler must answer
 * with a real 308 to the product or a real 404, never a 200 (the owner's SEO
 * review, 13/10/2026). The database is replaced by two lookups whose answers
 * each test sets.
 */
const lookups = vi.hoisted(() => ({
  live: new Map<string, { slug: string; categorySlug: string }>(),
  history: new Map<string, { slug: string; categorySlug: string }>(),
}));

vi.mock("@/lib/queries", () => ({
  resolveProduct: async ({ slug }: { slug?: string }) => {
    const hit = slug ? lookups.live.get(slug) : undefined;
    return hit ? { ...hit, code: "X", isSoftware: true } : null;
  },
}));
vi.mock("@/lib/slugHistory", () => ({
  productBehindOldSlug: async (slug: string) => lookups.history.get(slug) ?? null,
}));

const { GET } = await import("@/app/huong-dan/[slug]/route");

async function get(path: string): Promise<Response> {
  const url = new URL(path, "http://shop.test");
  const slug = url.pathname.split("/")[2] ?? "";
  return GET(new NextRequest(url), { params: Promise.resolve({ slug }) });
}

beforeEach(() => {
  lookups.live.clear();
  lookups.history.clear();
});

describe("the old /huong-dan buy page", () => {
  it("sends a product to its page under its category, permanently", async () => {
    lookups.live.set("spoofer-valorant-", { slug: "spoofer-valorant-", categorySlug: "hack-valorant-moi" });
    const res = await get("/huong-dan/spoofer-valorant-");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("/hack-valorant-moi/spoofer-valorant-");
  });

  it("keeps the query string, so a share code survives", async () => {
    lookups.live.set("hack-naraka-vn", { slug: "hack-naraka-vn", categorySlug: "hack-naraka-vn" });
    const res = await get("/huong-dan/hack-naraka-vn?ref=abc");
    expect(res.headers.get("location")).toBe("/hack-naraka-vn/hack-naraka-vn?ref=abc");
  });

  it("follows a product renamed since, through the slug history", async () => {
    const renamed = "spoof-delta-force-fix-loi-bi-khoa-hwid-khong-can-cai-win";
    lookups.history.set(`${renamed}-`, { slug: renamed, categorySlug: "hack-delta-force-moi" });
    const res = await get(`/huong-dan/${renamed}-`);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(`/hack-delta-force-moi/${renamed}`);
  });

  it("answers a real 404 for a product nobody sells, with a way back", async () => {
    const res = await get("/huong-dan/khong-ton-tai");
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
    const body = await res.text();
    expect(body).toContain('href="/"');
    expect(body).toContain('name="robots" content="noindex"');
  });

  it("looks a percent-encoded slug up decoded, and survives a broken escape", async () => {
    lookups.live.set("hack pubg", { slug: "hack-pubg", categorySlug: "hack-pubg-steam-pc-" });
    expect((await get("/huong-dan/hack%20pubg")).headers.get("location")).toBe(
      "/hack-pubg-steam-pc-/hack-pubg",
    );
    expect((await get("/huong-dan/%E0%A4%A")).status).toBe(404);
  });

  it("never builds an address another host could be read from", async () => {
    // An empty category would make the target //slug, which a browser
    // treats as a different site.
    lookups.live.set("mo-coi", { slug: "mo-coi", categorySlug: "" });
    expect((await get("/huong-dan/mo-coi")).status).toBe(404);
  });
});
