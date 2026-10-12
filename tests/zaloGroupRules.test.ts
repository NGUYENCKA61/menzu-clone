import { describe, expect, it } from "vitest";

import {
  RecentMessages,
  badWordIn,
  joinDecision,
  outsideLinkIn,
  parseBadWords,
  parseZaloGroupIds,
  readZaloJoinMode,
  spamReason,
  strikeAction,
  warnText,
  welcomeText,
} from "@/lib/zaloGroupRules";

describe("who gets into the group", () => {
  it("follows the mode the shop set", () => {
    expect(joinDecision("off", { linked: true, buyer: true })).toBe("leave");
    expect(joinDecision("all", { linked: false, buyer: false })).toBe("approve");
    expect(joinDecision("linked", { linked: false, buyer: false })).toBe("refuse");
    expect(joinDecision("linked", { linked: true, buyer: false })).toBe("approve");
    expect(joinDecision("buyers", { linked: true, buyer: false })).toBe("refuse");
    expect(joinDecision("buyers", { linked: true, buyer: true })).toBe("approve");
  });

  it("reads an unknown mode as off", () => {
    expect(readZaloJoinMode("buyers")).toBe("buyers");
    expect(readZaloJoinMode("everyone")).toBe("off");
    expect(readZaloJoinMode(undefined)).toBe("off");
  });
});

describe("links and words", () => {
  it("finds a link that leaves the shop, and lets the shop's own pass", () => {
    const ours = ["thichthihack.com"];
    expect(outsideLinkIn("vào thichthihack.com/hack-cs2 nhé", ours)).toBeNull();
    expect(outsideLinkIn("xem https://www.thichthihack.com/docs", ours)).toBeNull();
    expect(outsideLinkIn("rẻ hơn ở shopkhac.vn/abc", ours)).toBe("shopkhac.vn/abc");
    expect(outsideLinkIn("https://t.me/spamchannel", ours)).toBe("https://t.me/spamchannel");
    expect(outsideLinkIn("không có link gì cả 10.000đ", ours)).toBeNull();
  });

  it("reads the shop's banned words, whole text, any case", () => {
    const words = parseBadWords("lừa đảo, Scam;  x ");
    expect(words).toEqual(["lừa đảo", "scam"]);
    expect(badWordIn("shop này SCAM à", words)).toBe("scam");
    expect(badWordIn("tool ngon", words)).toBeNull();
  });
});

describe("repeats and floods", () => {
  it("calls the third same message in a minute a repeat", () => {
    const recent = new RecentMessages();
    const t = 1_000_000;
    expect(recent.note("u1", "mua key ở đâu", t)).toBeNull();
    expect(recent.note("u1", "Mua key ở đâu ", t + 10_000)).toBeNull();
    expect(recent.note("u1", "mua key ở đâu", t + 20_000)).toBe("repeat");
    // Another member is not charged for it.
    expect(recent.note("u2", "mua key ở đâu", t + 21_000)).toBeNull();
  });

  it("calls six messages in twenty seconds a flood", () => {
    const recent = new RecentMessages();
    const t = 2_000_000;
    let verdict = null;
    for (let i = 0; i < 6; i++) verdict = recent.note("u1", `tin số ${i}`, t + i * 1000);
    expect(verdict).toBe("flood");
  });

  it("ranks a link first, then a banned word, then the history", () => {
    const recent = new RecentMessages();
    const rules = { blockLinks: true, allowedHosts: ["thichthihack.com"], badWords: ["scam"] };
    expect(spamReason("xem shopkhac.vn scam", recent, "u1", 0, rules)).toBe("link");
    expect(spamReason("scam", recent, "u1", 0, rules)).toBe("badword");
    expect(spamReason("chào mọi người", recent, "u1", 0, rules)).toBeNull();
    expect(
      spamReason("xem shopkhac.vn", recent, "u1", 0, { ...rules, blockLinks: false }),
    ).toBeNull();
  });
});

describe("what a strike earns", () => {
  it("warns once, then shows the door", () => {
    expect(strikeAction(0)).toBe("warn");
    expect(strikeAction(1)).toBe("remove");
    expect(strikeAction(3)).toBe("remove");
  });

  it("writes the member's name where the mention goes", () => {
    expect(warnText("An", "link").startsWith("@An ")).toBe(true);
    expect(welcomeText("Chào {name}, đây là nhóm {shop}", "An", "THICHTHIHACK")).toBe(
      "Chào An, đây là nhóm THICHTHIHACK",
    );
    expect(welcomeText("   ", "An", "X")).toBeNull();
  });
});

describe("the group ids at one setting key", () => {
  it("reads them however they were typed, once each, in order", () => {
    expect(parseZaloGroupIds("")).toEqual([]);
    expect(parseZaloGroupIds(undefined)).toEqual([]);
    expect(parseZaloGroupIds("111, 222\n333;111")).toEqual(["111", "222", "333"]);
    expect(parseZaloGroupIds(["111", " 222 ", 333])).toEqual(["111", "222", "333"]);
  });
});
