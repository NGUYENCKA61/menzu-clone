import { describe, expect, it } from "vitest";

import {
  ANSWER_MAX,
  DETAIL_KEYS_ARE_DISTINCT,
  DETAIL_QUESTIONS,
  answerShort,
  detailsComplete,
  hasSecondRound,
  IMAGES_PER_ANSWER,
  missingDetails,
  parseQuestionSet,
  questionFor,
  QUESTIONS_MAX,
  readDetails,
  resolveQuestions,
  wantsPhoto,
  type DetailAnswer,
} from "@/lib/warrantyDetails";

const SOFTWARE = DETAIL_QUESTIONS.software;
const ACCOUNT = DETAIL_QUESTIONS.account;

/** A full round for a kind, so a test can take one thing away from it. */
function fullRound(kind: "software" | "account"): DetailAnswer[] {
  return DETAIL_QUESTIONS[kind].map((q) => {
    const value = q.options.length > 0 ? q.options[0].value : "Windows 11 24H2";
    return {
      key: q.key,
      value,
      imageUrls: wantsPhoto(q, value) ? ["/uploads/warranty/x.webp"] : [],
    };
  });
}

describe("warranty details, the second round", () => {
  it("asks about the machine for a tool and nothing of an account", () => {
    const software = SOFTWARE.map((q) => q.key);
    expect(software).toContain("SECURE_BOOT");
    expect(software).toContain("CORE_ISOLATION");
    expect(software).toContain("DISPLAY_MODE");
    // An account's report has no second round at all (the owner, 12/10/2026:
    // "bảo hành đối với tài khoản không cần phải bổ sung thêm thông tin đợt 2").
    expect(hasSecondRound("software")).toBe(true);
    expect(hasSecondRound("account")).toBe(false);
    expect(ACCOUNT).toEqual([]);
    // Nothing is asked twice, and no key clashes with a fault's.
    for (const kind of ["software", "account"] as const) {
      const keys = DETAIL_QUESTIONS[kind].map((q) => q.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(DETAIL_KEYS_ARE_DISTINCT).toBe(true);
  });

  it("counts a round complete only when every answer and picture is there", () => {
    const round = fullRound("software");
    expect(missingDetails(SOFTWARE, round)).toHaveLength(0);
    expect(detailsComplete(SOFTWARE, round)).toBe(true);

    const noPicture = round.map((a) =>
      a.key === "SECURE_BOOT" ? { ...a, imageUrls: [] } : a,
    );
    expect(detailsComplete(SOFTWARE, noPicture)).toBe(false);
    expect(missingDetails(SOFTWARE, noPicture).map((q) => q.key)).toEqual([
      "SECURE_BOOT",
    ]);

    const short = round.filter((a) => a.key !== "ANTIVIRUS");
    expect(missingDetails(SOFTWARE, short).map((q) => q.key)).toEqual([
      "ANTIVIRUS",
    ]);
  });

  it("refuses an answer that is not one of the choices", () => {
    const round = fullRound("software").map((a) =>
      a.key === "ANTIVIRUS" ? { ...a, value: "có lẽ vậy" } : a,
    );
    expect(detailsComplete(SOFTWARE, round)).toBe(false);
  });

  it("takes a typed answer where no choices are offered", () => {
    // A set the shop writes can leave the choices out: the buyer types.
    const [typed] = parseQuestionSet([
      { key: "FREE", label: "Màn hình báo gì", options: [], photo: true },
    ])!;
    expect(typed.options).toHaveLength(0);
    expect(typed.photo).toBe(true);
    // Nothing to choose, so the picture is always due…
    expect(wantsPhoto(typed, "Sai mật khẩu")).toBe(true);
    // …once something is typed: blank is no answer, no uploader.
    expect(wantsPhoto(typed, "  ")).toBe(false);
  });

  it("offers four versions of Windows, and wants the picture either way", () => {
    const winver = questionFor(SOFTWARE, "WINVER");
    expect(winver?.options.map((o) => o.value)).toEqual([
      "Tôi dùng Windows 11",
      "Tôi dùng Windows 10",
      "Tôi dùng bản cũ hơn",
      "Tôi không rõ bản nào",
    ]);
    expect(wantsPhoto(winver!, "Tôi dùng Windows 11")).toBe(true);
    expect(wantsPhoto(winver!, "Tôi không rõ bản nào")).toBe(true);
    // …but only once one of them is pressed: no answer, no uploader.
    expect(wantsPhoto(winver!, "")).toBe(false);
  });

  it("asks for a picture only on the answer that says it was done", () => {
    const secureBoot = questionFor(SOFTWARE, "SECURE_BOOT");
    expect(secureBoot?.options).toHaveLength(4);
    // The answers read as sentences, not as the word "Rồi" (the owner).
    const [done, notYet] = secureBoot!.options;
    expect(done.value).toBe("Tôi đã tắt Secure Boot rồi");
    expect(wantsPhoto(secureBoot!, done.value)).toBe(true);
    expect(wantsPhoto(secureBoot!, notYet.value)).toBe(false);
    // So "chưa tắt" with no picture is a complete answer.
    const round = fullRound("software").map((a) =>
      a.key === "SECURE_BOOT"
        ? { key: a.key, value: notYet.value, imageUrls: [] }
        : a,
    );
    expect(detailsComplete(SOFTWARE, round)).toBe(true);
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
    ).toEqual([{ key: "ANTIVIRUS", value: "Rồi", imageUrls: [] }]);
  });

  it("takes several pictures on one answer, and the old single one as a list", () => {
    const [many, legacy, junk] = readDetails(
      JSON.stringify([
        {
          key: "WINVER",
          value: "Tôi dùng Windows 11",
          imageUrls: ["/a.webp", "/b.webp"],
        },
        { key: "ANTIVIRUS", value: "Rồi", imageUrl: "/old.webp" },
        {
          key: "SECURE_BOOT",
          value: "Rồi",
          imageUrls: [
            "/1.webp",
            7,
            "",
            "/2.webp",
            "/3.webp",
            "/4.webp",
            "/5.webp",
            "/6.webp",
          ],
        },
      ]),
    );
    expect(many.imageUrls).toEqual(["/a.webp", "/b.webp"]);
    expect(legacy.imageUrls).toEqual(["/old.webp"]);
    // Not strings are dropped, and the list stops at the limit.
    expect(junk.imageUrls).toEqual([
      "/1.webp",
      "/2.webp",
      "/3.webp",
      "/4.webp",
      "/5.webp",
    ]);
    expect(junk.imageUrls).toHaveLength(IMAGES_PER_ANSWER);
  });

  it("cuts an answer at its limit rather than storing an essay", () => {
    const long = "x".repeat(ANSWER_MAX + 50);
    const [row] = readDetails(JSON.stringify([{ key: "WINVER", value: long }]));
    expect(row.value).toHaveLength(ANSWER_MAX);
  });

  it("lists an answer under the words it was asked with, even once the set has changed", () => {
    const [kept, bare] = readDetails(
      JSON.stringify([
        {
          key: "OLD_Q",
          value: "Có",
          label: "Đã cắm tay cầm chưa",
          short: "Tay cầm",
        },
        { key: "GONE", value: "Có" },
      ]),
    );
    // Its own words first, since the shop may have rewritten the set since.
    expect(answerShort(kept, SOFTWARE)).toBe("Tay cầm");
    // Nothing stored and nothing in the set: the key is all there is.
    expect(answerShort(bare, SOFTWARE)).toBe("GONE");
    // A default-set answer without stored words still reads from the set.
    expect(
      answerShort({ key: "ANTIVIRUS", value: "x", imageUrls: [] }, SOFTWARE),
    ).toBe("Diệt virus");
  });
});

describe("a question set the shop writes", () => {
  const valorant = [
    {
      key: "vanguard",
      label: "Vanguard đang bật hay tắt",
      hint: "Biểu tượng Vanguard ở khay hệ thống.",
      options: [
        { value: "Đang bật", hint: "Có biểu tượng ở khay." },
        { value: "Đã tắt", hint: "Không thấy biểu tượng." },
      ],
      photo: true,
      photoWhen: "Đang bật",
    },
    {
      key: "WINVER",
      label: "Phiên bản Windows",
      short: "Windows",
      options: [],
      photo: true,
    },
  ];

  it("reads a set back with its keys upper-cased and its words trimmed", () => {
    const set = parseQuestionSet(valorant);
    expect(set?.map((q) => q.key)).toEqual(["VANGUARD", "WINVER"]);
    expect(set?.[0].short).toBe("Vanguard đang bật hay tắt");
    expect(set?.[0].photoWhen).toBe("Đang bật");
    expect(wantsPhoto(set![0], "Đã tắt")).toBe(false);
    // Typed, with the picture due whatever is written.
    expect(set?.[1].options).toEqual([]);
    expect(wantsPhoto(set![1], "11")).toBe(true);
  });

  it("reads as inherit when the set is not usable", () => {
    expect(parseQuestionSet(null)).toBeNull();
    expect(parseQuestionSet([])).toBeNull();
    expect(parseQuestionSet("x")).toBeNull();
    // A question with one answer is no choice.
    expect(
      parseQuestionSet([
        { key: "A", label: "x", options: [{ value: "only" }] },
      ]),
    ).toBeNull();
    // Two answers the same, a blank label, a key used twice, a fault's key.
    expect(
      parseQuestionSet([
        { key: "A", label: "x", options: [{ value: "a" }, { value: "a" }] },
      ]),
    ).toBeNull();
    expect(
      parseQuestionSet([{ key: "A", label: " ", options: [] }]),
    ).toBeNull();
    expect(
      parseQuestionSet([
        { key: "A", label: "x", options: [] },
        { key: "a", label: "y", options: [] },
      ]),
    ).toBeNull();
    expect(
      parseQuestionSet([{ key: "KEY_INVALID", label: "x", options: [] }]),
    ).toBeNull();
    // Too many.
    const many = Array.from({ length: QUESTIONS_MAX + 1 }, (_, i) => ({
      key: `Q${i}`,
      label: "x",
      options: [],
    }));
    expect(parseQuestionSet(many)).toBeNull();
  });

  it("drops a photoWhen that names no answer, which means whichever is picked", () => {
    const [q] = parseQuestionSet([
      {
        key: "A",
        label: "x",
        options: [{ value: "a" }, { value: "b" }],
        photo: true,
        photoWhen: "zzz",
      },
    ])!;
    expect(q.photoWhen).toBeUndefined();
    expect(wantsPhoto(q, "b")).toBe(true);
  });

  it("asks the product's set, then the game's, then the default", () => {
    expect(resolveQuestions("software", null, null)).toBe(SOFTWARE);
    expect(resolveQuestions("account", undefined, "junk")).toBe(ACCOUNT);
    // An account asks nothing even where its game or it has a set written.
    expect(
      resolveQuestions(
        "account",
        [{ key: "ONLY", label: "x", options: [] }],
        valorant,
      ),
    ).toEqual([]);
    const game = resolveQuestions("software", null, valorant);
    expect(game.map((q) => q.key)).toEqual(["VANGUARD", "WINVER"]);
    const own = resolveQuestions(
      "software",
      [{ key: "ONLY", label: "x", options: [] }],
      valorant,
    );
    expect(own.map((q) => q.key)).toEqual(["ONLY"]);
  });
});
