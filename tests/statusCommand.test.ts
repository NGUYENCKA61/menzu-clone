import { describe, expect, it } from "vitest";

import { parseStatusCommand } from "@/lib/statusCommand";

describe("parseStatusCommand", () => {
  it("reads a code, a state and the rest as a note", () => {
    expect(parseStatusCommand("VALTOOL01 detected Đang vá, chờ 24h")).toEqual({
      productCode: "VALTOOL01",
      status: "DETECTED",
      note: "Đang vá, chờ 24h",
    });
  });

  it("takes the code as a chat tag", () => {
    expect(parseStatusCommand("#valtool01 die")).toEqual({
      productCode: "VALTOOL01",
      status: "DETECTED",
      note: "",
    });
  });

  it("understands the words the shop actually types, accents and all", () => {
    const state = (text: string) => parseStatusCommand(text)?.status;
    expect(state("X1 ngon")).toBe("UNDETECTED");
    expect(state("X1 an toàn")).toBe("UNDETECTED");
    expect(state("X1 dính")).toBe("DETECTED");
    expect(state("X1 bảo trì")).toBe("UPDATING");
    expect(state("X1 ĐANG CẬP NHẬT")).toBe("UPDATING");
  });

  it("leaves ordinary conversation alone", () => {
    // The channel is a channel; most of what is posted is not an instruction,
    // and guessing here would change what every customer sees.
    expect(parseStatusCommand("anh em ơi tool die rồi")).toBeNull();
    expect(parseStatusCommand("VALTOOL01")).toBeNull();
    expect(parseStatusCommand("chào mọi người")).toBeNull();
    expect(parseStatusCommand("")).toBeNull();
    expect(parseStatusCommand(null)).toBeNull();
  });

  it("refuses a first word that cannot be a product code", () => {
    expect(parseStatusCommand("!!!! detected")).toBeNull();
    expect(parseStatusCommand("a detected")).toBeNull();
  });
});
