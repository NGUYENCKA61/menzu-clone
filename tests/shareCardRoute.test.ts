import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The route reads the banner from Cấu hình; here it is a picture that ships
// in the repo, so the test needs no database.
const settings = { heroBanner: "/images/brand/thichthihack-mark.png" };
vi.mock("@/lib/settingsStore", () => ({
  getShopSettings: async () => settings,
}));

const { GET } = await import("@/app/share-card.jpg/route");

describe("GET /share-card.jpg", () => {
  beforeEach(() => {
    settings.heroBanner = "/images/brand/thichthihack-mark.png";
  });

  it("serves the banner as a 1200x630 JPEG with a day's cache", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    const body = Buffer.from(await res.arrayBuffer());
    expect(res.headers.get("content-length")).toBe(String(body.length));
    const meta = await sharp(body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1200, 630]);
    expect(body.length).toBeLessThan(300 * 1024);
  });

  it("sends the reader to the banner itself when it cannot be cropped", async () => {
    settings.heroBanner = "/images/brand/does-not-exist-here.png";
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    try {
      const res = await GET();
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toMatch(/\/images\/brand\/does-not-exist-here\.png$/);
      expect(res.headers.get("cache-control")).toBe("no-store");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("answers 404 when no banner is set", async () => {
    settings.heroBanner = "  ";
    expect((await GET()).status).toBe(404);
  });
});
