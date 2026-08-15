import { describe, expect, it } from "vitest";

import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * The value this parses ends up inside an iframe's `src`, so the rejections
 * below matter more than the acceptances: anything that slipped through would
 * let whoever edits a product frame an arbitrary page inside the shop.
 */
describe("youtubeEmbedUrl", () => {
  const ID = "dQw4w9WgXcQ";
  const EMBED = `https://www.youtube-nocookie.com/embed/${ID}?rel=0`;

  it("accepts the shapes a shop actually pastes", () => {
    expect(youtubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}`)).toBe(EMBED);
    expect(youtubeEmbedUrl(`https://youtu.be/${ID}`)).toBe(EMBED);
    expect(youtubeEmbedUrl(`https://www.youtube.com/embed/${ID}`)).toBe(EMBED);
    expect(youtubeEmbedUrl(`https://www.youtube.com/shorts/${ID}`)).toBe(EMBED);
    expect(youtubeEmbedUrl(`https://m.youtube.com/watch?v=${ID}`)).toBe(EMBED);
    expect(youtubeEmbedUrl(ID)).toBe(EMBED);
  });

  it("keeps the extra query a share link carries, by ignoring it", () => {
    expect(youtubeEmbedUrl(`https://youtu.be/${ID}?t=42&si=abc`)).toBe(EMBED);
    expect(youtubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}&list=PLxyz`)).toBe(EMBED);
  });

  it("tolerates a missing scheme, which phone share sheets omit", () => {
    expect(youtubeEmbedUrl(`youtu.be/${ID}`)).toBe(EMBED);
  });

  it("refuses anything that is not YouTube", () => {
    expect(youtubeEmbedUrl("https://vimeo.com/123456789")).toBeNull();
    expect(youtubeEmbedUrl("https://evil.example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    // A lookalike host — the check is on the whole hostname, not a substring.
    expect(youtubeEmbedUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(youtubeEmbedUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("refuses a YouTube URL with no video in it", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/")).toBeNull();
    expect(youtubeEmbedUrl("https://www.youtube.com/@somechannel")).toBeNull();
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=tooshort")).toBeNull();
  });

  it("treats empty and absent input as no video", () => {
    expect(youtubeEmbedUrl(null)).toBeNull();
    expect(youtubeEmbedUrl(undefined)).toBeNull();
    expect(youtubeEmbedUrl("   ")).toBeNull();
  });
});
