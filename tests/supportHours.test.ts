import { describe, expect, it } from "vitest";

import {
  SUPPORT_CLOSES,
  SUPPORT_OPENS,
  SUPPORT_WINDOW,
  shopHour,
  supportOpen,
  supportStatus,
} from "@/lib/supportHours";

/** A moment given in UTC; the shop is UTC+7 and never shifts. */
const at = (utc: string) => new Date(utc);

describe("shopHour", () => {
  it("reads the hour in shop time, not the machine's", () => {
    // 02:00 UTC is 09:00 in Ho Chi Minh City.
    expect(shopHour(at("2026-09-01T02:00:00Z"))).toBe(9);
    // 18:30 UTC is 01:30 the next day there.
    expect(shopHour(at("2026-09-01T18:30:00Z"))).toBe(1);
  });

  it("calls midnight zero, not twenty-four", () => {
    expect(shopHour(at("2026-09-01T17:00:00Z"))).toBe(0);
  });
});

describe("supportOpen", () => {
  it("is open through the working day", () => {
    expect(supportOpen(at("2026-09-01T02:00:00Z"))).toBe(true); // 09:00
    expect(supportOpen(at("2026-09-01T13:00:00Z"))).toBe(true); // 20:00
  });

  it("opens on the hour and closes on the hour", () => {
    expect(supportOpen(at("2026-09-01T00:59:00Z"))).toBe(false); // 07:59
    expect(supportOpen(at("2026-09-01T01:00:00Z"))).toBe(true); // 08:00
    expect(supportOpen(at("2026-09-01T15:59:00Z"))).toBe(true); // 22:59
    expect(supportOpen(at("2026-09-01T16:00:00Z"))).toBe(false); // 23:00
  });

  it("is shut in the small hours", () => {
    expect(supportOpen(at("2026-09-01T20:00:00Z"))).toBe(false); // 03:00
  });
});

describe("supportStatus", () => {
  it("promises minutes only while somebody is there", () => {
    expect(supportStatus(at("2026-09-01T02:00:00Z"))).toEqual({
      open: true,
      label: "Đang online · trả lời trong vài phút",
    });
  });

  it("names the window instead of promising a reply out of hours", () => {
    const shut = supportStatus(at("2026-09-01T20:00:00Z"));
    expect(shut.open).toBe(false);
    expect(shut.label).toContain(SUPPORT_WINDOW);
    expect(shut.label).not.toContain("vài phút");
  });

  it("keeps the window and its numbers in step", () => {
    expect(SUPPORT_WINDOW).toBe(`${SUPPORT_OPENS}:00–${SUPPORT_CLOSES}:00`);
  });
});
