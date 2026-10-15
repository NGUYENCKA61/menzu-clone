import { describe, expect, it } from "vitest";

import {
  ONLINE_REPORT_FRESH_MS,
  settleZaloBotState,
  type ZaloBotState,
} from "@/lib/zaloShared";

const at = Date.parse("2026-10-15T10:00:00.000Z");
const online: ZaloBotState = {
  state: "online",
  qrUrl: null,
  name: "Kn",
  at: new Date(at).toISOString(),
  note: null,
};

/**
 * A bot killed outright leaves "online" in the settings row; the web must not
 * hand out phone codes to a bot that is not there (15/10/2026).
 */
describe("a bot that stopped saying it is online", () => {
  it("is online while the heartbeat is fresh", () => {
    expect(settleZaloBotState(online, at + 60_000)).toEqual(online);
    expect(settleZaloBotState(online, at + ONLINE_REPORT_FRESH_MS)).toEqual(
      online,
    );
  });

  it("is offline once the heartbeat is stale, and says since when", () => {
    const settled = settleZaloBotState(online, at + ONLINE_REPORT_FRESH_MS + 1);
    expect(settled?.state).toBe("offline");
    expect(settled?.name).toBe("Kn");
    // Node's vi-VN puts a dash between day and month.
    expect(settled?.note).toMatch(/^bot không báo về từ 17:00 15[-/]10/);
  });

  it("leaves an offline report alone, however old", () => {
    const offline: ZaloBotState = { ...online, state: "offline", note: "dừng" };
    expect(settleZaloBotState(offline, at + 10 * ONLINE_REPORT_FRESH_MS)).toEqual(
      offline,
    );
  });
});
