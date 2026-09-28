import { describe, expect, it } from "vitest";

import { embedVideoLines, sanitizeDocHtml } from "@/lib/docHtml";

/**
 * How a guide gets a video: a YouTube link alone on its line becomes the
 * player, after the sanitizer has run. The cases below are the ones where
 * getting it wrong would either drop a video the shop meant to show, or turn
 * something that was never a video into an empty frame.
 */
const PLAYER = (id: string) => `src="https://www.youtube-nocookie.com/embed/${id}?rel=0"`;

describe("embedVideoLines", () => {
  it("plays a bare link on its own line", () => {
    const out = embedVideoLines("<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>");
    expect(out).toContain('<div class="doc-video"><iframe');
    expect(out).toContain(PLAYER("dQw4w9WgXcQ"));
    expect(out).not.toContain("<p>");
  });

  it("plays the link the editor makes of a pasted address", () => {
    const html = sanitizeDocHtml(
      '<p><a href="https://youtu.be/dQw4w9WgXcQ?si=abc">https://youtu.be/dQw4w9WgXcQ?si=abc</a></p>',
    );
    expect(embedVideoLines(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("reads an address whose query came back escaped", () => {
    const html = sanitizeDocHtml(
      "<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s</p>",
    );
    expect(html).toContain("&amp;");
    expect(embedVideoLines(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("keeps a centred line centred on its way to becoming a player", () => {
    const html = '<p style="text-align:center">https://youtu.be/dQw4w9WgXcQ</p>';
    expect(embedVideoLines(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("leaves a link inside a sentence as a link", () => {
    const html = "<p>Xem video tại https://youtu.be/dQw4w9WgXcQ nhé</p>";
    expect(embedVideoLines(html)).toBe(html);
  });

  it("leaves a link under words of its own as a link", () => {
    const html = '<p><a href="https://youtu.be/dQw4w9WgXcQ">Xem video hướng dẫn</a></p>';
    expect(embedVideoLines(html)).toBe(html);
  });

  it("does not take an eleven-letter word for a video", () => {
    const html = "<p>Configuring</p>";
    expect(embedVideoLines(html)).toBe(html);
  });

  it("does not play another site's video", () => {
    const html = "<p>https://vimeo.com/123456789</p>";
    expect(embedVideoLines(html)).toBe(html);
  });

  it("never lets a hand-written iframe through, video or not", () => {
    const html = sanitizeDocHtml(
      '<p>Trước</p><iframe src="https://evil.example/"></iframe><p>Sau</p>',
    );
    expect(embedVideoLines(html)).not.toContain("<iframe");
  });

  it("plays each of several videos, and leaves the prose around them", () => {
    const html =
      "<p>Bước 1: tải tool.</p><p>https://youtu.be/dQw4w9WgXcQ</p><p>Bước 2: nhập key.</p><p>https://www.youtube.com/shorts/aaaaaaaaaaa</p>";
    const out = embedVideoLines(html);
    expect(out.match(/<iframe/g)).toHaveLength(2);
    expect(out).toContain("<p>Bước 1: tải tool.</p>");
    expect(out).toContain("<p>Bước 2: nhập key.</p>");
    expect(out).toContain(PLAYER("aaaaaaaaaaa"));
  });
});
