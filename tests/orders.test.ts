import { describe, expect, it } from "vitest";

import {
  csvCell,
  exportFilename,
  hasOrderFilters,
  parseOrderFilters,
  QUERY_MAX,
  toCsv,
} from "@/lib/orders";
import { GAP, pageRange, pageStrip, pageWindow, parsePage, searchNeedsSync } from "@/lib/paging";
import { dayRangeVn } from "@/lib/time";

describe("parseOrderFilters", () => {
  it("keeps values it recognises", () => {
    expect(
      parseOrderFilters({
        q: "  NTA1  ",
        status: "PAID",
        method: "TRADE_IN",
        day: "2026-08-13",
      }),
    ).toEqual({ q: "NTA1", status: "PAID", method: "TRADE_IN", day: "2026-08-13" });
  });

  it("drops anything it does not", () => {
    // These arrive from a URL somebody may have edited, or a bookmark kept
    // from an older version of the page. Unfiltered beats a crash.
    const filters = parseOrderFilters({
      status: "SHIPPED",
      method: "CRYPTO",
      day: "hôm qua",
    });
    expect(filters.status).toBeNull();
    expect(filters.method).toBeNull();
    expect(filters.day).toBe("");
  });

  it("caps the search term", () => {
    expect(parseOrderFilters({ q: "x".repeat(500) }).q).toHaveLength(QUERY_MAX);
  });

  it("knows when nothing is narrowing the list", () => {
    expect(hasOrderFilters(parseOrderFilters({}))).toBe(false);
    expect(hasOrderFilters(parseOrderFilters({ status: "PAID" }))).toBe(true);
    expect(hasOrderFilters(parseOrderFilters({ q: "abc" }))).toBe(true);
  });
});

describe("parsePage", () => {
  it("clamps to a page that exists", () => {
    // ?page=999 on a three-page list should land on the last page, not on an
    // empty table that reads as "no orders".
    expect(parsePage("999", 3)).toBe(3);
    expect(parsePage("0", 3)).toBe(1);
    expect(parsePage("-5", 3)).toBe(1);
    expect(parsePage("2", 3)).toBe(2);
  });

  it("survives nonsense in the URL", () => {
    expect(parsePage(undefined, 3)).toBe(1);
    expect(parsePage("cuối", 3)).toBe(1);
    expect(parsePage("2.7", 3)).toBe(2);
  });

  it("still returns a page when there are none", () => {
    expect(parsePage("1", 0)).toBe(1);
  });
});

describe("pageWindow", () => {
  it("keeps a fixed width and slides", () => {
    // A shop with sixty pages cannot have sixty buttons.
    expect(pageWindow(1, 60)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(30, 60)).toEqual([28, 29, 30, 31, 32]);
    expect(pageWindow(60, 60)).toEqual([56, 57, 58, 59, 60]);
  });

  it("does not shrink at the ends", () => {
    // Anchoring rather than clipping, or the strip narrows as you reach page 1.
    expect(pageWindow(2, 60)).toHaveLength(5);
    expect(pageWindow(59, 60)).toHaveLength(5);
  });

  it("shows only what exists on a short list", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 0)).toEqual([1]);
  });
});

describe("pageRange", () => {
  it("counts the rows actually on screen", () => {
    expect(pageRange(1, 20, 356)).toEqual({ from: 1, to: 20 });
    expect(pageRange(18, 20, 356)).toEqual({ from: 341, to: 356 });
  });

  it("does not claim a row on an empty list", () => {
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0 });
  });

  it("stops at the last row on a partial page", () => {
    expect(pageRange(2, 20, 25)).toEqual({ from: 21, to: 25 });
  });
});

describe("dayRangeVn", () => {
  it("bounds the day in Vietnam, not UTC", () => {
    // Read as UTC midnight this would start at 07:00 local, returning the last
    // seven hours of the 12th and missing the evening of the 13th.
    const range = dayRangeVn("2026-08-13")!;
    expect(range.start.toISOString()).toBe("2026-08-12T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-13T17:00:00.000Z");
  });

  it("refuses a date that does not exist", () => {
    // "2026-02-31" parses without complaint and silently becomes March, which
    // would quietly filter a different day than the one asked for.
    expect(dayRangeVn("2026-02-31")).toBeNull();
    expect(dayRangeVn("2026-13-01")).toBeNull();
    expect(dayRangeVn("13/08/2026")).toBeNull();
    expect(dayRangeVn("")).toBeNull();
  });
});

describe("csvCell", () => {
  it("quotes and escapes", () => {
    expect(csvCell("xin chao")).toBe('"xin chao"');
    expect(csvCell('anh "Ba"')).toBe('"anh ""Ba"""');
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(1250000)).toBe('"1250000"');
  });

  it("defuses a cell a spreadsheet would run", () => {
    // A customer who names themselves =HYPERLINK(...) gets that executed on
    // the shop's machine when the export is opened.
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(csvCell("+1")).toBe("\"'+1\"");
    expect(csvCell("-1+2")).toBe("\"'-1+2\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });

  it("leaves ordinary text alone", () => {
    expect(csvCell("Nguyễn Văn A")).toBe('"Nguyễn Văn A"');
    expect(csvCell("VLR2030")).toBe('"VLR2030"');
  });
});

describe("toCsv", () => {
  it("writes a header and CRLF rows", () => {
    expect(toCsv(["Mã", "Tiền"], [["A1", 1000]])).toBe(
      '"Mã","Tiền"\r\n"A1","1000"',
    );
  });
});

describe("exportFilename", () => {
  it("is dated in the shop's timezone", () => {
    // 01:30 on the 13th in Vietnam is still the 12th in UTC; the file should
    // carry the date the shop would call it.
    expect(exportFilename(new Date("2026-08-12T18:30:00Z"))).toBe(
      "don-hang-20260813-0130.csv",
    );
  });
});

describe("searchNeedsSync", () => {
  it("does nothing when the box already matches the URL", () => {
    // This is the state on every page click, and the case that broke paging:
    // the debounce fired anyway and stripped ?page, bouncing the admin back to
    // page 1 a third of a second after they arrived.
    expect(searchNeedsSync("", null)).toBe(false);
    expect(searchNeedsSync("", "")).toBe(false);
    expect(searchNeedsSync("minh", "minh")).toBe(false);
  });

  it("syncs once the term actually changes", () => {
    expect(searchNeedsSync("minh", null)).toBe(true);
    expect(searchNeedsSync("minh", "min")).toBe(true);
    // Clearing the box is a change too, or the old term sticks in the URL.
    expect(searchNeedsSync("", "minh")).toBe(true);
  });

  it("walks the sequence that broke", () => {
    // What the toolbar does, step by step, with the search box untouched.
    const apply = (typed: string, url: URLSearchParams) => {
      if (!searchNeedsSync(typed, url.get("q"))) return url;
      const next = new URLSearchParams(url.toString());
      if (typed) next.set("q", typed);
      else next.delete("q");
      next.delete("page");
      return next;
    };

    // Land on the list, click page 4. The debounce fires because the query
    // string changed — and must leave the page alone.
    let url = new URLSearchParams("page=4");
    expect(apply("", url).get("page")).toBe("4");

    // Same while a search is already active: paging through results must not
    // throw away the page either.
    url = new URLSearchParams("q=minh&page=3");
    expect(apply("minh", url).get("page")).toBe("3");

    // Now actually type. The page goes, which is the point of clearing it.
    url = new URLSearchParams("q=minh&page=3");
    const searched = apply("minhh", url);
    expect(searched.get("q")).toBe("minhh");
    expect(searched.get("page")).toBeNull();
  });
});

describe("pageStrip", () => {
  it("keeps the first and last page reachable", () => {
    // Without them, page 30 of 65 has no way to reach 65 except by clicking
    // through, and "go to the end" is one of the two jumps anybody wants.
    expect(pageStrip(30, 65)).toEqual([1, GAP, 28, 29, 30, 31, 32, GAP, 65]);
  });

  it("draws a gap only where it hides something", () => {
    // A strip reading "1 … 2" lies about what is between them.
    expect(pageStrip(1, 65)).toEqual([1, 2, 3, 4, 5, GAP, 65]);
    // The window starts at 2 here, so 1 sits right beside it — a gap between
    // them would claim to hide a page that does not exist.
    expect(pageStrip(4, 8)).toEqual([1, 2, 3, 4, 5, 6, GAP, 8]);
    expect(pageStrip(65, 65)).toEqual([1, GAP, 61, 62, 63, 64, 65]);
    // …and the same at the far end: 7 beside 8, no gap.
    expect(pageStrip(5, 8)).toEqual([1, GAP, 3, 4, 5, 6, 7, 8]);
  });

  it("is just the pages on a short list", () => {
    expect(pageStrip(1, 3)).toEqual([1, 2, 3]);
    expect(pageStrip(1, 1)).toEqual([1]);
  });

  it("never repeats a page", () => {
    // The ends are pinned separately from the window, so an off-by-one there
    // draws "1 1 2 3" or two buttons both going to the last page.
    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const nums = pageStrip(page, total).filter((n): n is number => n !== GAP);
        expect(new Set(nums).size).toBe(nums.length);
        expect([...nums].sort((a, b) => a - b)).toEqual(nums);
      }
    }
  });
});
