import { describe, expect, it } from "vitest";

import {
  announcementState,
  BULLETS_MAX,
  dismissalKey,
  isAnnouncementActive,
  isSnoozed,
  parseBullets,
  parseUsernames,
  readAudience,
  readDate,
  readPriority,
  readStatus,
  readType,
  relativeTime,
  SNOOZE_MS,
} from "@/lib/announcements";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date("2026-08-13T10:00:00Z");

function window_(
  status: string,
  startMinutesAgo: number,
  endMinutesFromNow: number | null,
) {
  return {
    status,
    startAt: new Date(NOW.getTime() - startMinutesAgo * MINUTE),
    endAt: endMinutesFromNow === null ? null : new Date(NOW.getTime() + endMinutesFromNow * MINUTE),
  };
}

describe("announcementState", () => {
  it("is active inside its window", () => {
    expect(announcementState(window_("PUBLISHED", 10, 60), NOW)).toBe("ACTIVE");
  });

  it("runs forever without an end", () => {
    expect(announcementState(window_("PUBLISHED", 10, null), NOW)).toBe("ACTIVE");
  });

  it("waits until its start", () => {
    expect(announcementState(window_("PUBLISHED", -30, 60), NOW)).toBe("SCHEDULED");
  });

  it("is over past its end", () => {
    expect(announcementState(window_("PUBLISHED", 120, -30), NOW)).toBe("EXPIRED");
  });

  it("lets a decision outrank the clock", () => {
    // The point of being able to disable one is that it stops showing even
    // though its window says otherwise.
    expect(announcementState(window_("DISABLED", 10, 60), NOW)).toBe("DISABLED");
    expect(announcementState(window_("DRAFT", 10, 60), NOW)).toBe("DRAFT");
  });

  it("counts the boundaries as inside", () => {
    // The database filter uses lte/gte; this has to agree with it, or a notice
    // fetched for a visitor is reported as not running.
    const exact = { status: "PUBLISHED", startAt: NOW, endAt: NOW };
    expect(announcementState(exact, NOW)).toBe("ACTIVE");
  });
});

describe("isAnnouncementActive", () => {
  it("is true only for the state a visitor sees", () => {
    expect(isAnnouncementActive(window_("PUBLISHED", 10, 60), NOW)).toBe(true);
    expect(isAnnouncementActive(window_("PUBLISHED", -30, 60), NOW)).toBe(false);
    expect(isAnnouncementActive(window_("PUBLISHED", 120, -30), NOW)).toBe(false);
    expect(isAnnouncementActive(window_("DRAFT", 10, 60), NOW)).toBe(false);
    expect(isAnnouncementActive(window_("DISABLED", 10, 60), NOW)).toBe(false);
  });
});

describe("dismissalKey", () => {
  it("changes when the wording does", () => {
    // Otherwise editing a notice everyone has already closed reaches nobody.
    expect(dismissalKey("abc", 1)).not.toBe(dismissalKey("abc", 2));
    expect(dismissalKey("abc", 1)).not.toBe(dismissalKey("abd", 1));
    expect(dismissalKey("abc", 1)).toBe(dismissalKey("abc", 1));
  });
});

describe("relativeTime", () => {
  it("reads as how long ago", () => {
    expect(relativeTime(new Date(NOW.getTime() - 30 * 1000), NOW)).toBe("vừa xong");
    expect(relativeTime(new Date(NOW.getTime() - 5 * MINUTE), NOW)).toBe("5 phút trước");
    expect(relativeTime(new Date(NOW.getTime() - 2 * HOUR), NOW)).toBe("2 giờ trước");
    expect(relativeTime(new Date(NOW.getTime() - 3 * DAY), NOW)).toBe("3 ngày trước");
  });

  it("gives a date once relative stops helping", () => {
    // "37 ngày trước" is arithmetic the reader has to do.
    expect(relativeTime(new Date(NOW.getTime() - 40 * DAY), NOW)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("does not count forwards when a clock runs slow", () => {
    expect(relativeTime(new Date(NOW.getTime() + 3 * MINUTE), NOW)).toBe("vừa xong");
  });
});

describe("parseUsernames", () => {
  it("accepts whatever separator the admin pasted", () => {
    // The list arrives out of a spreadsheet or typed by hand, and being strict
    // about which separator is correct only yields a name with a comma on it.
    expect(parseUsernames("an, binh; cuong\ndung  em")).toEqual([
      "an",
      "binh",
      "cuong",
      "dung",
      "em",
    ]);
  });

  it("collapses a name pasted twice", () => {
    // Including in a different case, or the admin's own count is wrong.
    expect(parseUsernames("an, AN, An")).toEqual(["an"]);
  });

  it("is empty for nothing usable", () => {
    expect(parseUsernames("")).toEqual([]);
    expect(parseUsernames("  ,  ;  ")).toEqual([]);
  });
});

describe("parseBullets", () => {
  it("takes one bullet per line", () => {
    expect(parseBullets("dong mot\ndong hai")).toEqual(["dong mot", "dong hai"]);
  });

  it("keeps commas inside a bullet", () => {
    // Unlike the recipient list: a bullet is a sentence, and sentences have
    // commas in them.
    expect(parseBullets("nhap dung noi dung, khong sua gi")).toEqual([
      "nhap dung noi dung, khong sua gi",
    ]);
  });

  it("strips a marker the admin typed by hand", () => {
    expect(parseBullets("- mot\n• hai\n* ba")).toEqual(["mot", "hai", "ba"]);
  });

  it("drops blank lines and caps the list", () => {
    expect(parseBullets("mot\n\n\nhai")).toEqual(["mot", "hai"]);
    expect(
      parseBullets(Array.from({ length: 40 }, (_, i) => `d${i}`).join("\n")),
    ).toHaveLength(BULLETS_MAX);
  });
});

describe("isSnoozed", () => {
  const at = 1_000_000;

  it("holds until the deadline passes", () => {
    expect(isSnoozed(at + SNOOZE_MS, at)).toBe(true);
    expect(isSnoozed(at - 1, at)).toBe(false);
    expect(isSnoozed(at, at)).toBe(false);
  });

  it("treats nothing stored as not snoozed", () => {
    // A notice nobody has snoozed must still be able to open, so a missing or
    // corrupted entry has to fail towards showing it.
    expect(isSnoozed(null, at)).toBe(false);
    expect(isSnoozed(Number.NaN, at)).toBe(false);
  });
});

describe("input guards", () => {
  it("refuses anything not in the enum", () => {
    // These reach a Postgres enum column; an admin session is still a session
    // somebody could be driving with curl.
    expect(readType("UPDATE")).toBe("UPDATE");
    expect(readType("DROP TABLE")).toBeNull();
    expect(readType(42)).toBeNull();

    expect(readPriority("HIGH")).toBe("HIGH");
    expect(readPriority("URGENT")).toBeNull();

    expect(readStatus("PUBLISHED")).toBe("PUBLISHED");
    expect(readStatus("ACTIVE")).toBeNull();
  });

  it("refuses an audience it does not know", () => {
    expect(readAudience("ALL")).toBe("ALL");
    expect(readAudience("USERS")).toBe("USERS");
    expect(readAudience("EVERYONE")).toBeNull();
    expect(readAudience(null)).toBeNull();
  });

  it("tells 'not mentioned' apart from 'cleared'", () => {
    // A PATCH that omits endAt must not wipe it, but one that sends "" must.
    expect(readDate(undefined)).toBeUndefined();
    expect(readDate("")).toBeNull();
    expect(readDate(null)).toBeNull();
    expect(readDate("2026-08-13T10:00")).toBeInstanceOf(Date);
    expect(readDate("hôm nào đó")).toBeUndefined();
  });
});
