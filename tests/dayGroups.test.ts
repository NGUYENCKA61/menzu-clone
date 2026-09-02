import { describe, expect, it } from "vitest";

import {
  dayHeading,
  dayKey,
  dayLabel,
  dayTime,
  groupByDay,
} from "@/lib/dayGroups";

/**
 * Both the status history and the order history print their rows under the day
 * they happened, and both are read in Vietnam while the server may be anywhere.
 * What matters is that the day boundary is the shop's midnight, not the
 * machine's, and that "Hôm nay" means today rather than "within 24 hours".
 */

/** 2026-08-31 23:30 Vietnam time — which is still the 31st in Cần Thơ and
 *  already the 31st in UTC only by sixteen and a half hours' luck. */
const lateOn31 = new Date("2026-08-31T16:30:00Z");
/** 2026-09-01 00:30 Vietnam time — half an hour later, and a different day. */
const earlyOn1 = new Date("2026-08-31T17:30:00Z");

describe("dayKey", () => {
  it("files a moment under the shop's day, not UTC's", () => {
    // 17:30Z is still the 31st in UTC and already the 1st in Vietnam. A page
    // read in Cần Thơ must say the 1st.
    expect(dayKey(earlyOn1)).toBe("01/09/2026");
    expect(dayKey(lateOn31)).toBe("31/08/2026");
  });

  it("gives two moments in the same shop-day the same key", () => {
    expect(dayKey(new Date("2026-08-31T01:00:00Z"))).toBe(
      dayKey(new Date("2026-08-31T16:00:00Z")),
    );
  });
});

describe("dayLabel", () => {
  it("names today and yesterday rather than dating them", () => {
    expect(dayLabel(dayKey(earlyOn1), earlyOn1)).toBe("Hôm nay");
    expect(dayLabel(dayKey(lateOn31), earlyOn1)).toBe("Hôm qua");
  });

  it("dates anything older", () => {
    expect(dayLabel("29/08/2026", earlyOn1)).toBe("29/08/2026");
  });

  it("calls an hour ago yesterday when an hour ago was yesterday", () => {
    // 23:30 and 00:30 are sixty minutes apart and on different days; a
    // "within 24 hours" rule would have called the first one today.
    expect(dayHeading(lateOn31, earlyOn1)).toBe("Hôm qua");
  });
});

describe("dayTime", () => {
  it("reads the clock in Vietnam", () => {
    expect(dayTime(new Date("2026-08-31T07:22:00Z"))).toBe("14:22");
  });
});

describe("groupByDay", () => {
  const rows = [
    { id: "a", at: new Date("2026-08-31T10:00:00Z") },
    { id: "b", at: new Date("2026-08-31T03:00:00Z") },
    { id: "c", at: new Date("2026-08-30T03:00:00Z") },
  ];

  it("keeps the list's own order instead of imposing one", () => {
    // Sorted newest-first going in, so newest-first coming out. A list handed
    // over oldest-first must not be flipped behind the caller's back.
    expect(groupByDay(rows, (r) => r.at).map((g) => g.key)).toEqual([
      "31/08/2026",
      "30/08/2026",
    ]);
    expect(groupByDay([...rows].reverse(), (r) => r.at).map((g) => g.key)).toEqual([
      "30/08/2026",
      "31/08/2026",
    ]);
  });

  it("keeps every row, in the order it arrived", () => {
    const groups = groupByDay(rows, (r) => r.at);
    expect(groups[0]!.items.map((r) => r.id)).toEqual(["a", "b"]);
    expect(groups[1]!.items.map((r) => r.id)).toEqual(["c"]);
  });

  it("is empty for an empty list", () => {
    expect(groupByDay([], (r: { at: Date }) => r.at)).toEqual([]);
  });

  it("starts a new group when a day repeats after a gap", () => {
    // Walking the list, not bucketing: an unsorted list gets the day printed
    // twice rather than having its rows quietly reordered.
    const jumbled = [rows[0]!, rows[2]!, rows[1]!];
    expect(groupByDay(jumbled, (r) => r.at).map((g) => g.key)).toEqual([
      "31/08/2026",
      "30/08/2026",
      "31/08/2026",
    ]);
  });
});
