import { describe, expect, it } from "vitest";

import { startOfDayVn } from "@/lib/time";

/**
 * These pin the boundary the admin dashboard's "hôm nay" figures depend on.
 * Getting it wrong is invisible in the UI — the numbers still render, they are
 * just filed under the wrong day.
 */
describe("startOfDayVn", () => {
  it("returns 17:00 UTC the previous day, which is 00:00 in Vietnam", () => {
    // 2026-08-12 09:00 in Vietnam is 02:00 UTC the same day.
    const result = startOfDayVn(new Date("2026-08-12T02:00:00Z"));
    expect(result.toISOString()).toBe("2026-08-11T17:00:00.000Z");
  });

  it("keeps an early-morning local time in today, not yesterday", () => {
    // 00:30 in Vietnam is 17:30 UTC the day before. Flooring in UTC would file
    // this under the previous day and understate the morning's takings.
    const at0030 = new Date("2026-08-11T17:30:00Z");
    expect(startOfDayVn(at0030).toISOString()).toBe("2026-08-11T17:00:00.000Z");
  });

  it("keeps a late-evening local time in today, not tomorrow", () => {
    // 23:30 in Vietnam on the 12th is 16:30 UTC on the 12th.
    const at2330 = new Date("2026-08-12T16:30:00Z");
    expect(startOfDayVn(at2330).toISOString()).toBe("2026-08-11T17:00:00.000Z");
  });

  it("rolls over exactly at local midnight", () => {
    const justBefore = new Date("2026-08-12T16:59:59Z");
    const justAfter = new Date("2026-08-12T17:00:00Z");
    expect(startOfDayVn(justBefore).toISOString()).toBe("2026-08-11T17:00:00.000Z");
    expect(startOfDayVn(justAfter).toISOString()).toBe("2026-08-12T17:00:00.000Z");
  });

  it("is stable across a day, so two calls in one day agree", () => {
    const morning = startOfDayVn(new Date("2026-08-12T01:00:00Z"));
    const evening = startOfDayVn(new Date("2026-08-12T15:00:00Z"));
    expect(morning.getTime()).toBe(evening.getTime());
  });

  it("does not shift across a UTC month boundary", () => {
    // 2026-09-01 06:00 in Vietnam is 2026-08-31 23:00 UTC — the local day is
    // September even though the UTC date still says August.
    const result = startOfDayVn(new Date("2026-08-31T23:00:00Z"));
    expect(result.toISOString()).toBe("2026-08-31T17:00:00.000Z");
  });
});
