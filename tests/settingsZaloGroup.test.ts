import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseSettings,
  serializeSettings,
  type ShopSettings,
} from "@/lib/settings";

/** The group bot's six settings survive the round trip through the table. */
describe("the Zalo group settings", () => {
  it("default to a bot that minds no group and lets nobody in by itself", () => {
    const s = parseSettings([]);
    expect(s.zaloGroupIds).toEqual([]);
    expect(s.zaloGroupJoin).toBe("off");
    expect(s.zaloGroupPost).toBe(false);
    expect(s.zaloGroupBlockLinks).toBe(true);
    expect(s.zaloGroupExemptDeputies).toBe(true);
    expect(s.zaloGroupWelcome).toBe("");
    expect(s.zaloGroupBadWords).toBe("");
  });

  it("read back what the admin saved, and refuse a mode they never chose", () => {
    const saved = normalizeSettings({
      ...DEFAULT_SETTINGS,
      zaloGroupIds: ["1234567890", "1234567890", "222"],
      zaloGroupJoin: "buyers",
      zaloGroupPost: true,
      zaloGroupBlockLinks: false,
      zaloGroupExemptDeputies: false,
      zaloGroupWelcome: " @{name} chào ",
      zaloGroupBadWords: "scam, lừa",
    });
    const rows = serializeSettings(saved);
    const back = parseSettings(rows);
    expect(back.zaloGroupIds).toEqual(["1234567890", "222"]);
    expect(back.zaloGroupJoin).toBe("buyers");
    expect(back.zaloGroupPost).toBe(true);
    expect(back.zaloGroupBlockLinks).toBe(false);
    expect(back.zaloGroupExemptDeputies).toBe(false);
    expect(back.zaloGroupWelcome).toBe("@{name} chào");
    expect(back.zaloGroupBadWords).toBe("scam, lừa");

    const odd = normalizeSettings({
      ...DEFAULT_SETTINGS,
      zaloGroupJoin: "everyone" as unknown as ShopSettings["zaloGroupJoin"],
    });
    expect(odd.zaloGroupJoin).toBe("off");
  });

  it("read the one id stored before, and several typed at the same key", () => {
    const one = parseSettings([
      { key: "integrations.zalo.group.id", value: "7770612918596925178" },
    ]);
    expect(one.zaloGroupIds).toEqual(["7770612918596925178"]);
    const many = parseSettings([
      { key: "integrations.zalo.group.id", value: " 111,222\n333 ; 111 " },
    ]);
    expect(many.zaloGroupIds).toEqual(["111", "222", "333"]);
  });
});
