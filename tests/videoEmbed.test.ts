import { describe, expect, it } from "vitest";

import {
  kinescopeEmbedUrl,
  kinescopeVideoId,
  videoEmbed,
} from "@/lib/videoEmbed";

/**
 * A product's demo video comes from a pasted link, and the link ends up in
 * an iframe src. What matters: every way a Kinescope link is pasted is read,
 * YouTube still wins where it applies, and nothing else gets a frame.
 */
describe("kinescope links", () => {
  it("reads the share link and the embed link", () => {
    expect(kinescopeVideoId("https://kinescope.io/202589431")).toBe(
      "202589431",
    );
    expect(kinescopeVideoId("https://kinescope.io/embed/202589431")).toBe(
      "202589431",
    );
    expect(kinescopeVideoId("kinescope.io/sVNqb8GptJMmdcU3WyM4hp")).toBe(
      "sVNqb8GptJMmdcU3WyM4hp",
    );
    expect(
      kinescopeVideoId(
        "https://www.kinescope.io/embed/sVNqb8GptJMmdcU3WyM4hp?autoplay=1",
      ),
    ).toBe("sVNqb8GptJMmdcU3WyM4hp");
    expect(kinescopeEmbedUrl(" https://kinescope.io/202589431 ")).toBe(
      "https://kinescope.io/embed/202589431",
    );
  });

  it("refuses other hosts, empty paths and junk", () => {
    expect(kinescopeVideoId("https://kinescope.io/")).toBeNull();
    expect(kinescopeVideoId("https://kinescope.io/embed/")).toBeNull();
    expect(
      kinescopeVideoId("https://evil.example/kinescope.io/embed/202589431"),
    ).toBeNull();
    expect(kinescopeVideoId("javascript:alert(1)")).toBeNull();
    expect(kinescopeVideoId("hello world")).toBeNull();
    // A bare word is not a link: it would otherwise frame an empty player.
    expect(kinescopeVideoId("abc123")).toBeNull();
    expect(kinescopeVideoId("sVNqb8GptJMmdcU3WyM4hp")).toBeNull();
    expect(kinescopeVideoId("")).toBeNull();
    expect(kinescopeVideoId(null)).toBeNull();
  });
});

describe("the player a pasted link gets", () => {
  it("is YouTube for a YouTube link, Kinescope for a Kinescope link, nothing otherwise", () => {
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
      provider: "youtube",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
    });
    expect(videoEmbed("https://kinescope.io/202589431")).toMatchObject({
      provider: "kinescope",
      src: "https://kinescope.io/embed/202589431",
    });
    expect(videoEmbed("https://kinescope.io/202589431")?.allow).toContain(
      "fullscreen",
    );
    expect(videoEmbed("https://vimeo.com/123456")).toBeNull();
    expect(videoEmbed(null)).toBeNull();
  });
});
