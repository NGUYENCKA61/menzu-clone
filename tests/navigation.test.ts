import { describe, expect, it } from "vitest";

import { canGoBack } from "@/lib/navigation";

const ORIGIN = "http://localhost:3100";

describe("canGoBack", () => {
  it("goes back when they came from a page of ours", () => {
    expect(canGoBack(3, `${ORIGIN}/account/VLR2030`, ORIGIN)).toBe(true);
    expect(canGoBack(2, ORIGIN, ORIGIN)).toBe(true);
    expect(canGoBack(2, `${ORIGIN}/`, ORIGIN)).toBe(true);
  });

  it("goes home when there is no history to go back into", () => {
    expect(canGoBack(1, `${ORIGIN}/`, ORIGIN)).toBe(false);
    expect(canGoBack(0, `${ORIGIN}/`, ORIGIN)).toBe(false);
  });

  it("goes home when they arrived from somewhere else", () => {
    // Back from a tab opened by an ad or a message walks the visitor off the
    // site entirely, which is the opposite of what the arrow promises.
    expect(canGoBack(3, "", ORIGIN)).toBe(false);
    expect(canGoBack(3, "https://facebook.com/", ORIGIN)).toBe(false);
    expect(canGoBack(3, "https://google.com/search?q=menzu", ORIGIN)).toBe(false);
  });

  it("does not mistake a neighbouring port for this site", () => {
    // "http://localhost:3100" is a prefix of "http://localhost:31000", and a
    // plain startsWith would call that a page of ours.
    expect(canGoBack(3, "http://localhost:31000/x", ORIGIN)).toBe(false);
    expect(canGoBack(3, "http://localhost:3100.evil.com/", ORIGIN)).toBe(false);
  });

  it("says no rather than guessing when it has nothing to go on", () => {
    expect(canGoBack(3, `${ORIGIN}/`, "")).toBe(false);
  });
});
