import { describe, expect, it } from "vitest";

import { messengerUrl, pickMessenger, pickZalo, zaloChat } from "@/lib/messenger";

describe("messengerUrl", () => {
  it("turns the shop's own Facebook row into a chat link", () => {
    expect(messengerUrl("https://www.facebook.com/menhzu0906")).toBe(
      "https://m.me/menhzu0906",
    );
  });

  it("accepts every Facebook host the same way", () => {
    for (const host of ["facebook.com", "m.facebook.com", "web.facebook.com", "fb.com"]) {
      expect(messengerUrl(`https://${host}/menzu`)).toBe("https://m.me/menzu");
    }
  });

  it("ignores a trailing slash, a query and surrounding space", () => {
    expect(messengerUrl("  https://facebook.com/menzu/?ref=bookmarks  ")).toBe(
      "https://m.me/menzu",
    );
  });

  it("reads the numeric id out of a profile.php link", () => {
    expect(messengerUrl("https://facebook.com/profile.php?id=61550001112223")).toBe(
      "https://m.me/61550001112223",
    );
  });

  it("takes the id off the end of a /people/ link", () => {
    expect(messengerUrl("https://www.facebook.com/people/Menzu-Shop/61550001112223/")).toBe(
      "https://m.me/61550001112223",
    );
  });

  it("passes an m.me link through, normalised", () => {
    expect(messengerUrl("https://m.me/menzu/")).toBe("https://m.me/menzu");
  });

  it("refuses what is not a conversation", () => {
    expect(messengerUrl("https://facebook.com/groups/123456")).toBeNull();
    expect(messengerUrl("https://facebook.com/menzu/reviews")).toBeNull();
    expect(messengerUrl("https://facebook.com/share/p/abc")).toBeNull();
    expect(messengerUrl("https://facebook.com/profile.php?id=khong-phai-so")).toBeNull();
    expect(messengerUrl("https://facebook.com")).toBeNull();
  });

  it("refuses another site, however it is spelled", () => {
    expect(messengerUrl("https://zalo.me/0793025545")).toBeNull();
    expect(messengerUrl("https://discord.com/invite/abc")).toBeNull();
    // A lookalike host must not be read as Facebook.
    expect(messengerUrl("https://facebook.com.evil.tld/menzu")).toBeNull();
    expect(messengerUrl("khong-phai-url")).toBeNull();
  });
});

describe("pickMessenger", () => {
  const zalo = { id: "z", url: "https://zalo.me/0793025545" };
  const facebook = { id: "f", url: "https://www.facebook.com/valhaxthichthihack114" };

  it("finds the messageable row and keeps the rest of it", () => {
    const found = pickMessenger([zalo, facebook]);
    expect(found).toEqual({
      ...facebook,
      chatUrl: "https://m.me/valhaxthichthihack114",
    });
  });

  it("takes the first one when the shop lists two", () => {
    const other = { id: "f2", url: "https://facebook.com/menzu-backup" };
    expect(pickMessenger([facebook, other])?.id).toBe("f");
  });

  it("is null when nothing in the list can be messaged", () => {
    expect(pickMessenger([zalo])).toBeNull();
    expect(pickMessenger([])).toBeNull();
  });
});

describe("zaloChat", () => {
  it("keeps the shop's own support row as it is", () => {
    expect(zaloChat("https://zalo.me/0962109471")).toBe("https://zalo.me/0962109471");
  });

  it("accepts the www host too", () => {
    expect(zaloChat("https://www.zalo.me/0962109471")).toBe("https://zalo.me/0962109471");
  });

  it("ignores a trailing slash, a query and surrounding space", () => {
    expect(zaloChat("  https://zalo.me/0962109471/?utm=bio  ")).toBe(
      "https://zalo.me/0962109471",
    );
  });

  it("takes the number out of a chat.zalo.me link", () => {
    expect(zaloChat("https://chat.zalo.me/?phone=0962109471")).toBe(
      "https://chat.zalo.me/?phone=0962109471",
    );
  });

  it("refuses a chat link that names no number", () => {
    expect(zaloChat("https://chat.zalo.me/")).toBeNull();
    expect(zaloChat("https://chat.zalo.me/?phone=khong-phai-so")).toBeNull();
  });

  it("refuses a community room — that is other customers, not the shop", () => {
    expect(zaloChat("https://zalo.me/g/abcdef123")).toBeNull();
    expect(zaloChat("https://zalo.me/g")).toBeNull();
  });

  it("refuses what is not a conversation", () => {
    expect(zaloChat("https://zalo.me")).toBeNull();
    expect(zaloChat("https://zalo.me/0962109471/photos")).toBeNull();
    expect(zaloChat("https://zalo.me/ab")).toBeNull();
  });

  it("refuses another site, however it is spelled", () => {
    expect(zaloChat("https://www.facebook.com/valhaxthichthihack114")).toBeNull();
    expect(zaloChat("https://discord.com/invite/abc")).toBeNull();
    // A lookalike host must not be read as Zalo.
    expect(zaloChat("https://zalo.me.evil.tld/0962109471")).toBeNull();
    expect(zaloChat("khong-phai-url")).toBeNull();
  });
});

describe("pickZalo", () => {
  const facebook = { id: "f", url: "https://www.facebook.com/valhaxthichthihack114" };
  const support = { id: "z", label: "Zalo hỗ trợ", url: "https://zalo.me/0962109471" };
  const room = { id: "z2", label: "Cộng đồng Zalo", url: "https://zalo.me/g/abcdef123" };

  it("finds the Zalo row and keeps the rest of it", () => {
    expect(pickZalo([facebook, support])).toEqual({
      ...support,
      chatUrl: "https://zalo.me/0962109471",
    });
  });

  it("walks past a community room to reach the one that answers", () => {
    expect(pickZalo([room, support])?.id).toBe("z");
  });

  it("is null when the shop lists no Zalo to message", () => {
    expect(pickZalo([facebook])).toBeNull();
    expect(pickZalo([room])).toBeNull();
    expect(pickZalo([])).toBeNull();
  });

  it("does not confuse the two channels", () => {
    expect(pickMessenger([support])).toBeNull();
    expect(pickZalo([facebook])).toBeNull();
  });
});
