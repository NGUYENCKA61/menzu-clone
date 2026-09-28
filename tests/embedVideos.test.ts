import { describe, expect, it } from "vitest";

import { docHtmlIsEmpty, embedVideos, sanitizeDocHtml } from "@/lib/docHtml";

/**
 * How a guide gets a video: the editor's video block, or a YouTube link alone
 * on its line, becomes the player after the sanitizer has run. The cases below
 * are the ones where getting it wrong would either drop a video the shop meant
 * to show, or turn something that was never a video into an empty frame.
 */
const PLAYER = (id: string) => `src="https://www.youtube-nocookie.com/embed/${id}?rel=0"`;

describe("embedVideos — a link alone on its line", () => {
  it("plays a bare link on its own line", () => {
    const out = embedVideos("<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>");
    expect(out).toContain('<div class="doc-video"><iframe');
    expect(out).toContain(PLAYER("dQw4w9WgXcQ"));
    expect(out).not.toContain("<p>");
  });

  it("plays the link the editor makes of a pasted address", () => {
    const html = sanitizeDocHtml(
      '<p><a href="https://youtu.be/dQw4w9WgXcQ?si=abc">https://youtu.be/dQw4w9WgXcQ?si=abc</a></p>',
    );
    expect(embedVideos(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("reads an address whose query came back escaped", () => {
    const html = sanitizeDocHtml(
      "<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s</p>",
    );
    expect(html).toContain("&amp;");
    expect(embedVideos(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("keeps a centred line centred on its way to becoming a player", () => {
    const html = '<p style="text-align:center">https://youtu.be/dQw4w9WgXcQ</p>';
    expect(embedVideos(html)).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("leaves a link inside a sentence as a link", () => {
    const html = "<p>Xem video tại https://youtu.be/dQw4w9WgXcQ nhé</p>";
    expect(embedVideos(html)).toBe(html);
  });

  it("leaves a link under words of its own as a link", () => {
    const html = '<p><a href="https://youtu.be/dQw4w9WgXcQ">Xem video hướng dẫn</a></p>';
    expect(embedVideos(html)).toBe(html);
  });

  it("does not take an eleven-letter word for a video", () => {
    const html = "<p>Configuring</p>";
    expect(embedVideos(html)).toBe(html);
  });

  it("does not play another site's video", () => {
    const html = "<p>https://vimeo.com/123456789</p>";
    expect(embedVideos(html)).toBe(html);
  });

  it("never lets a hand-written iframe through, video or not", () => {
    const html = sanitizeDocHtml(
      '<p>Trước</p><iframe src="https://evil.example/"></iframe><p>Sau</p>',
    );
    expect(embedVideos(html)).not.toContain("<iframe");
  });

  it("plays each of several videos, and leaves the prose around them", () => {
    const html =
      "<p>Bước 1: tải tool.</p><p>https://youtu.be/dQw4w9WgXcQ</p><p>Bước 2: nhập key.</p><p>https://www.youtube.com/shorts/aaaaaaaaaaa</p>";
    const out = embedVideos(html);
    expect(out.match(/<iframe/g)).toHaveLength(2);
    expect(out).toContain("<p>Bước 1: tải tool.</p>");
    expect(out).toContain("<p>Bước 2: nhập key.</p>");
    expect(out).toContain(PLAYER("aaaaaaaaaaa"));
  });
});

/**
 * The editor's "Video" button: an empty div naming the id, sized and leaning
 * the way a picture does. It goes through the same sanitizer on the way into
 * the database and out to the page.
 */
describe("embedVideos — the editor's video block", () => {
  /** What the editor writes for a half-width video on the left. */
  const BLOCK =
    '<div data-youtube="dQw4w9WgXcQ" style="width: 50%; margin-left: 0; margin-right: auto"></div>';

  it("survives the sanitizer with its width and side", () => {
    const clean = sanitizeDocHtml(BLOCK);
    expect(clean).toContain('data-youtube="dQw4w9WgXcQ"');
    expect(clean).toMatch(/style="width:\s*50%;\s*margin-left:\s*0;\s*margin-right:\s*auto;?"/);
  });

  it("plays at the width and on the side it was given", () => {
    const out = embedVideos(sanitizeDocHtml(BLOCK));
    expect(out).toContain(PLAYER("dQw4w9WgXcQ"));
    expect(out).toMatch(/<div class="doc-video" style="width:\s*50%;\s*margin-left:\s*0;\s*margin-right:\s*auto;?">/);
    expect(out).not.toContain("data-youtube");
  });

  it("plays at the default size when it was given none", () => {
    const out = embedVideos(sanitizeDocHtml('<div data-youtube="dQw4w9WgXcQ"></div>'));
    expect(out).toContain('<div class="doc-video"><iframe');
    expect(out).toContain(PLAYER("dQw4w9WgXcQ"));
  });

  it("keeps nothing of a style but width and side", () => {
    const clean = sanitizeDocHtml(
      '<div data-youtube="dQw4w9WgXcQ" style="position: fixed; inset: 0; width: 50%; background: url(https://evil.example/x)"></div>',
    );
    expect(clean).not.toMatch(/position|inset|background|evil/);
    expect(clean).toMatch(/width:\s*50%/);
  });

  it("drops a block whose id is not a YouTube id", () => {
    for (const id of ['x"><script>', "javascript:alert(1)", "short", "https://youtu.be/dQw4w9WgXcQ"]) {
      const clean = sanitizeDocHtml(`<div data-youtube="${id.replace(/"/g, "&quot;")}"></div>`);
      expect(clean).not.toContain("data-youtube");
      expect(embedVideos(clean)).not.toContain("<iframe");
    }
  });

  it("counts as content, so a guide that is only a video is not stored as empty", () => {
    expect(docHtmlIsEmpty(sanitizeDocHtml('<div data-youtube="dQw4w9WgXcQ"></div>'))).toBe(false);
    expect(docHtmlIsEmpty("<p></p>")).toBe(true);
  });

  it("leaves an ordinary div of pasted text as it was", () => {
    const html = sanitizeDocHtml("<div>Chữ dán từ nơi khác</div>");
    expect(embedVideos(html)).toBe(html);
  });
});

/**
 * "Lề": a picture or video pushed in from the side it leans to. It is the
 * margin on that side, in percent, plus `data-offset` naming the side so a
 * phone can drop the push.
 */
describe("the push from the side (Lề)", () => {
  it("keeps a picture's push and the side it is pushed from", () => {
    const clean = sanitizeDocHtml(
      '<img src="/uploads/docs/a.webp" style="width: 40%; margin-left: 20%; margin-right: auto" data-offset="left">',
    );
    expect(clean).toMatch(/margin-left:\s*20%/);
    expect(clean).toContain('data-offset="left"');
  });

  it("keeps a video block's push and plays it there", () => {
    const out = embedVideos(
      sanitizeDocHtml(
        '<div data-youtube="dQw4w9WgXcQ" style="width: 50%; margin-left: auto; margin-right: 15%" data-offset="right"></div>',
      ),
    );
    expect(out).toMatch(/<div class="doc-video" style="width:\s*50%;\s*margin-left:\s*auto;\s*margin-right:\s*15%;?">/);
  });

  it("refuses a push of 100% or more, and any side but left or right", () => {
    const clean = sanitizeDocHtml(
      '<img src="/uploads/docs/a.webp" style="margin-left: 150%; margin-right: auto" data-offset="middle">',
    );
    expect(clean).not.toMatch(/150%/);
    // The sanitizer empties a value it does not know rather than dropping
    // the name; an empty one matches no phone rule, which is what counts.
    expect(clean).not.toMatch(/data-offset="(?!left"|right")/);
  });
});
