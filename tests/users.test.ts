import { describe, expect, it } from "vitest";

import {
  hasUserFilters,
  parseUserFilters,
  uidFrom,
  USER_QUERY_MAX,
} from "@/lib/users";

describe("parseUserFilters", () => {
  it("keeps values it recognises", () => {
    expect(
      parseUserFilters({ q: "  minh  ", role: "ADMIN", state: "BLOCKED", tier: "GOLD" }),
    ).toEqual({ q: "minh", role: "ADMIN", state: "BLOCKED", tier: "GOLD" });
  });

  it("drops anything it does not", () => {
    // These arrive from a URL somebody may have edited, or a bookmark kept
    // from an older version of the page. Unfiltered beats an empty table.
    const filters = parseUserFilters({
      role: "SUPERADMIN",
      state: "DELETED",
      tier: "MYTHIC",
    });
    expect(filters.role).toBeNull();
    expect(filters.state).toBeNull();
    expect(filters.tier).toBeNull();
  });

  it("accepts every tier the schema declares", () => {
    // This test previously asserted PLATINUM was invalid, which is how the
    // filter came to be missing it: MemberTier has five values and the list
    // had four, so a shop's platinum customers could not be filtered for and
    // their tier rendered as the raw enum name.
    for (const tier of ["CLASSIC", "GOLD", "PLATINUM", "DIAMOND", "ELITE"]) {
      expect(parseUserFilters({ tier }).tier).toBe(tier);
    }
  });

  it("caps the search term", () => {
    expect(parseUserFilters({ q: "x".repeat(500) }).q).toHaveLength(USER_QUERY_MAX);
  });

  it("knows when nothing is narrowing the list", () => {
    expect(hasUserFilters(parseUserFilters({}))).toBe(false);
    expect(hasUserFilters(parseUserFilters({ state: "BLOCKED" }))).toBe(true);
    expect(hasUserFilters(parseUserFilters({ q: "minh" }))).toBe(true);
  });
});

describe("uidFrom", () => {
  it("finds the number an admin typed", () => {
    // Postgres will not do a contains match on an integer column, so a search
    // for "8" has to become an exact uid match or it finds nothing.
    expect(uidFrom("8")).toBe(8);
    expect(uidFrom("#42")).toBe(42);
    expect(uidFrom("uid 42")).toBe(42);
    expect(uidFrom("  1286 ")).toBe(1286);
  });

  it("returns nothing when the term is a name", () => {
    expect(uidFrom("minh")).toBeNull();
    expect(uidFrom("user8")).toBeNull();
    expect(uidFrom("")).toBeNull();
    expect(uidFrom("8.5")).toBeNull();
  });

  it("refuses a number too long to be a uid", () => {
    // Otherwise a pasted phone number becomes an integer Postgres rejects.
    expect(uidFrom("0912345678901234")).toBeNull();
  });
});
