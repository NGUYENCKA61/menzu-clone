import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseSettings,
  serializeSettings,
} from "@/lib/settings";

/** The group bot's six settings survive the round trip through the table. */
describe("the Zalo group settings", () => {
  it("default to a bot that minds no group and lets nobody in by itself", () => {
    const s = parseSettings([]);
    expect(s.zaloGroupId).toBe("");
    expect(s.zaloGroupJoin).toBe("off");
    expect(s.zaloGroupPost).toBe(false);
    expect(s.zaloGroupBlockLinks).toBe(true);
    expect(s.zaloGroupWelcome).toBe("");
    expect(s.zaloGroupBadWords).toBe("");
  });

  it("read back what the admin saved, and refuse a mode they never chose", () => {
    const saved = normalizeSettings({
      ...DEFAULT_SETTINGS,
      zaloGroupId: " 1234567890 ",
      zaloGroupJoin: "buyers",
      zaloGroupPost: true,
      zaloGroupBlockLinks: false,
      zaloGroupWelcome: " @{name} chào ",
      zaloGroupBadWords: "scam, lừa",
    });
    const rows = serializeSettings(saved);
    const back = parseSettings(rows);
    expect(back.zaloGroupId).toBe("1234567890");
    expect(back.zaloGroupJoin).toBe("buyers");
    expect(back.zaloGroupPost).toBe(true);
    expect(back.zaloGroupBlockLinks).toBe(false);
    expect(back.zaloGroupWelcome).toBe("@{name} chào");
    expect(back.zaloGroupBadWords).toBe("scam, lừa");

    const odd = normalizeSettings({
      ...DEFAULT_SETTINGS,
      zaloGroupJoin: "everyone",
    });
    expect(odd.zaloGroupJoin).toBe("off");
  });
});
