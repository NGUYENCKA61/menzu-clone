import { describe, expect, it } from "vitest";
import { THEME_BOOT_SCRIPT } from "@/components/sites/menzu-lol-f7ae197a/shared/ThemeToggle";

/** Runs the boot script against a fake <html>, address and storage. */
function boot(search: string, stored: string | null, opts: { blocked?: boolean; attrs?: Record<string, string> } = {}) {
  const attrs = new Map<string, string>(Object.entries(opts.attrs ?? {}));
  const store = new Map<string, string>(stored === null ? [] : [["ttt-theme", stored]]);
  const documentElement = {
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.blocked) throw new Error("SecurityError");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (opts.blocked) throw new Error("SecurityError");
      store.set(key, value);
    },
  };
  new Function("document", "location", "localStorage", THEME_BOOT_SCRIPT)({ documentElement }, { search }, localStorage);
  return { theme: attrs.get("data-theme") ?? null, variant: attrs.get("data-variant") ?? null, stored: store.get("ttt-theme") ?? null };
}

describe("THEME_BOOT_SCRIPT", () => {
  it("keeps the dark site when nothing is chosen", () => {
    expect(boot("", null)).toEqual({ theme: null, variant: null, stored: null });
  });

  it("?giao-dien=sang stores light and sets the light dress only", () => {
    expect(boot("?giao-dien=sang", null)).toEqual({ theme: "light", variant: null, stored: "light" });
  });

  it("?giao-dien=nike stores nike and sets the light dress with the Nike variant", () => {
    expect(boot("?giao-dien=nike", null)).toEqual({ theme: "light", variant: "nike", stored: "nike" });
  });

  it("applies a stored nike choice on the next visit", () => {
    expect(boot("", "nike")).toEqual({ theme: "light", variant: "nike", stored: "nike" });
  });

  it("?giao-dien=sang clears the variant", () => {
    expect(boot("?giao-dien=sang", "nike", { attrs: { "data-theme": "light", "data-variant": "nike" } })).toEqual({
      theme: "light",
      variant: null,
      stored: "light",
    });
  });

  it("?giao-dien=toi clears both", () => {
    expect(boot("?giao-dien=toi", "nike", { attrs: { "data-theme": "light", "data-variant": "nike" } })).toEqual({
      theme: null,
      variant: null,
      stored: "dark",
    });
  });

  it("still applies a query for the page when storage is blocked", () => {
    expect(boot("?giao-dien=nike", null, { blocked: true })).toEqual({ theme: "light", variant: "nike", stored: null });
    expect(boot("", null, { blocked: true })).toEqual({ theme: null, variant: null, stored: null });
  });

  it("ignores an unknown value", () => {
    expect(boot("?giao-dien=xanh", "light")).toEqual({ theme: "light", variant: null, stored: "light" });
  });
});
