import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  publicFilePath,
  SHARE_CARD_PATH,
  shareCardHref,
  shareCardVersion,
} from "@/lib/shareCardImage";

describe("shareCardHref", () => {
  it("points at the crop route with a tag naming the banner", () => {
    const href = shareCardHref("/uploads/site/b3f364dbfc4ca0afaea16c03.jpg");
    expect(href).toMatch(new RegExp(`^${SHARE_CARD_PATH.replace(".", "\\.")}\\?v=[0-9a-z]+$`));
  });

  it("is stable for one banner and changes with the banner", () => {
    const a = "/uploads/site/a.jpg";
    expect(shareCardVersion(a)).toBe(shareCardVersion(a));
    expect(shareCardHref(` ${a} `)).toBe(shareCardHref(a));
    expect(shareCardVersion("/uploads/site/b.jpg")).not.toBe(shareCardVersion(a));
  });
});

describe("publicFilePath", () => {
  const pub = path.resolve("/srv/app/public");

  it("maps a site path to the file under public/", () => {
    expect(publicFilePath("/uploads/site/a.jpg", pub)).toBe(path.join(pub, "uploads", "site", "a.jpg"));
    expect(publicFilePath("/uploads/site/a%20b.jpg?x=1", pub)).toBe(
      path.join(pub, "uploads", "site", "a b.jpg"),
    );
  });

  it("refuses anything that is not a plain path inside public/", () => {
    for (const src of [
      "https://cdn.example.com/a.jpg",
      "//cdn.example.com/a.jpg",
      "uploads/a.jpg",
      "/../secret.txt",
      "/uploads/%2e%2e/%2e%2e/secret.txt",
      "/uploads/..%5c..%5csecret.txt",
      "/uploads/.env",
      "/",
      "/%E0%A4%A",
    ]) {
      expect(publicFilePath(src, pub)).toBeNull();
    }
  });
});
