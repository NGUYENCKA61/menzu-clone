import { describe, expect, it } from "vitest";

import {
  csvCell,
  exportFilename,
  hasOrderFilters,
  pageRange,
  pageWindow,
  parseOrderFilters,
  parsePage,
  QUERY_MAX,
  toCsv,
} from "@/lib/orders";
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
