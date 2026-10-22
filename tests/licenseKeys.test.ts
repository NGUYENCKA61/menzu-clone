import { describe, expect, it } from "vitest";

import { parseKeyBlock } from "@/lib/licenseKeys";

/**
 * The two pieces of key handling that are pure: what a pasted block turns into
 * and when a delivered key runs out. Delivery itself is a transaction against
 * the database and is tested by running it.
 */
describe("parseKeyBlock", () => {
  it("takes one key per line and drops the blanks", () => {
    expect(parseKeyBlock("A\nB\n\n  \nC")).toEqual(["A", "B", "C"]);
  });

  it("trims the whitespace a paste brings with it", () => {
    // Copied out of a spreadsheet, keys arrive padded and \r\n-terminated.
    expect(parseKeyBlock("  A-1  \r\n\tB-2\t\r\n")).toEqual(["A-1", "B-2"]);
  });

  it("counts a repeated key once", () => {
    // A double-paste is one batch, not two — and the unique index would
    // refuse the second copy anyway, so it is dropped before it is sent.
    expect(parseKeyBlock("DUP\nDUP\nOTHER\nDUP")).toEqual(["DUP", "OTHER"]);
  });

  it("finds nothing in an empty or blank block", () => {
    expect(parseKeyBlock("")).toEqual([]);
    expect(parseKeyBlock("\n\n   \n\t")).toEqual([]);
  });
});
