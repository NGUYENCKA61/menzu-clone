import { describe, expect, it } from "vitest";

import {
  ANSWER_MAX,
  DETAIL_KEYS_ARE_DISTINCT,
  DETAIL_QUESTIONS,
  detailsComplete,
  missingDetails,
  questionFor,
  readDetails,
  wantsPhoto,
  type DetailAnswer,
} from "@/lib/warrantyDetails";

/** A full round for a kind, so a test can take one thing away from it. */
function fullRound(kind: "software" | "account"): DetailAnswer[] {
  return DETAIL_QUESTIONS[kind].map((q) => {
    const value = q.options.length > 0 ? q.options[0].value : "Windows 11 24H2";
    return {
      key: q.key,
      value,
      imageUrl: wantsPhoto(q, value) ? "/uploads/warranty/x.webp" : null,
    };
  });
}

describe("warranty details, the second round", () => {
  it("asks about the machine for a tool and the sign-in for an account", () => {
    const software = DETAIL_QUESTIONS.software.map((q) => q.key);
    expect(software).toContain("SECURE_BOOT");
    expect(software).toContain("CORE_ISOLATION");
    expect(software).toContain("DISPLAY_MODE");
    expect(DETAIL_QUESTIONS.account.map((q) => q.key)).toContain("LOGIN_ERROR");
    // Nothing is asked twice, and no key clashes with a fault's.
    for (const kind of ["software", "account"] as const) {
      const keys = DETAIL_QUESTIONS[kind].map((q) => q.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(DETAIL_KEYS_ARE_DISTINCT).toBe(true);
  });

  it("counts a round complete only when every answer and picture is there", () => {
    const round = fullRound("software");
    expect(missingDetails("software", round)).toHaveLength(0);
    expect(detailsComplete("software", round)).toBe(true);

    const noPicture = round.map((a) =>
      a.key === "SECURE_BOOT" ? { ...a, imageUrl: null } : a,
    );
    expect(detailsComplete("software", noPicture)).toBe(false);
    expect(missingDetails("software", noPicture).map((q) => q.key)).toEqual(["SECURE_BOOT"]);

    const short = round.filter((a) => a.key !== "ANTIVIRUS");
    expect(missingDetails("software", short).map((q) => q.key)).toEqual(["ANTIVIRUS"]);
  });

  it("refuses an answer that is not one of the choices", () => {
    const round = fullRound("software").map((a) =>
      a.key === "ANTIVIRUS" ? { ...a, value: "có lẽ vậy" } : a,
    );
    expect(detailsComplete("software", round)).toBe(false);
  });

  it("takes a typed answer where no choices are offered", () => {
    const login = questionFor("account", "LOGIN_ERROR");
    expect(login?.options).toHaveLength(0);
    expect(login?.photo).toBe(true);
    // Nothing to choose, so the picture is always due.
    expect(wantsPhoto(login!, "Sai mật khẩu")).toBe(true);
  });

  it("offers four versions of Windows, and wants the picture either way", () => {
    const winver = questionFor("software", "WINVER");
    expect(winver?.options.map((o) => o.value)).toEqual([
      "Tôi dùng Windows 11",
      "Tôi dùng Windows 10",
      "Tôi dùng bản cũ hơn",
      "Tôi không rõ bản nào",
    ]);
    expect(wantsPhoto(winver!, "Tôi dùng Windows 11")).toBe(true);
    expect(wantsPhoto(winver!, "Tôi không rõ bản nào")).toBe(true);
  });

  it("asks for a picture only on the answer that says it was done", () => {
    const secureBoot = questionFor("software", "SECURE_BOOT");
    expect(secureBoot?.options).toHaveLength(4);
    // The answers read as sentences, not as the word "Rồi" (the owner).
    const [done, notYet] = secureBoot!.options;
    expect(done.value).toBe("Tôi đã tắt Secure Boot rồi");
    expect(wantsPhoto(secureBoot!, done.value)).toBe(true);
    expect(wantsPhoto(secureBoot!, notYet.value)).toBe(false);
    // So "chưa tắt" with no picture is a complete answer.
    const round = fullRound("software").map((a) =>
      a.key === "SECURE_BOOT" ? { key: a.key, value: notYet.value, imageUrl: null } : a,
    );
    expect(detailsComplete("software", round)).toBe(true);
  });

  it("reads back what was stored and shrugs off anything else", () => {
    expect(readDetails(null)).toEqual([]);
    expect(readDetails("not json")).toEqual([]);
    expect(readDetails('{"key":"X"}')).toEqual([]);
    expect(
      readDetails(
        JSON.stringify([
          { key: "ANTIVIRUS", value: " Rồi ", imageUrl: "" },
          { key: "WINVER", value: "", imageUrl: "/a.webp" },
          { nope: true },
        ]),
      ),
    ).toEqual([{ key: "ANTIVIRUS", value: "Rồi", imageUrl: null }]);
  });

  it("cuts an answer at its limit rather than storing an essay", () => {
    const long = "x".repeat(ANSWER_MAX + 50);
    const [row] = readDetails(JSON.stringify([{ key: "WINVER", value: long }]));
    expect(row.value).toHaveLength(ANSWER_MAX);
  });
});
