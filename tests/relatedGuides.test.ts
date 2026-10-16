import { describe, expect, it } from "vitest";

import {
  ACCOUNT_GENERAL_GUIDES,
  ACCOUNT_GUIDES,
  GAME_GUIDES,
  GAME_NAMES,
  GAME_ROW_MAX,
  GAME_WORDS,
  GENERAL_GUIDES,
  JUNK_SLUG,
  JUNK_TITLE,
  pickRelatedGuides,
  type ArticleRow,
} from "@/lib/relatedGuides";

/**
 * The local wiki as it stood on 15/10/2026, cut down to what the picker
 * reads: the shop's own articles, the test rows, the cloned shop's mail
 * articles, and one with no body. The six round-2 targets (for instance
 * hack-cs2-co-bi-vac-ban-khong) are not here on purpose: the map names
 * them and they must not render until they exist.
 */
const article = (slug: string, title: string, body = true): ArticleRow => ({ slug, title, body });

const WIKI: ArticleRow[] = [
  article("2312331", "2312331"),
  article("acc-full-thong-tin-la-gi", "Acc Full thông tin là gì và quy trình nhận"),
  article("acc-nfa-acc-rac-la-gi", "Acc NFA (acc rác) là gì?"),
  article("cai-spoofer-tai-nha", "Cài và chạy spoofer tại nhà"),
  article("chinh-sach-bao-hanh-drop-mail", "Chính Sách Bảo Hành Drop Mail", false),
  article("chinh-sach-bao-hanh-hoan-tien-acc-nfa", "Chính sách bảo hành và hoàn tiền với acc rác NFA"),
  article("chinh-sach-bao-hanh-hoan-tien-phan-mem", "Chính sách bảo hành và hoàn tiền với sản phẩm phần mềm"),
  article("chinh-sach-bao-hanh-menzu-mail", "Chính Sách Bảo Hành Menzu Mail", false),
  article("chinh-sach-ho-tro-doi-may", "Chính sách hỗ trợ đổi máy (reset HWID cho key)"),
  article("config-la-gi", "Config là gì? Setting, save và load config"),
  article("drop-mail-la-gi", "Drop Mail Là Gì ?"),
  article("dsada", "dsada", false),
  article("dsadsa", "dsadsa"),
  article("huong-dan-check-thu-welcome", "Hướng Dẫn Check Thư Welcome"),
  article("hwid-la-gi-reset-hwid", "HWID là gì? Reset HWID khi đổi máy, thay phần cứng"),
  article("menzu-mail-la-gi", "Menzu Mail Là Gì ?"),
  article("mua-tai-khoan-nfa", "Quy trình mua tài khoản NFA trên shop"),
  article("nap-tien-va-mua-tool-lan-dau", "Hướng dẫn người mới: nạp tiền và mua tool lần đầu"),
  article("quy-trinh-bao-hanh", "Quy trình gửi yêu cầu và xử lý bảo hành"),
  article("setup-may-chuan-thich-thi-hack", "Setup máy chuẩn THÍCH THÌ HACK trước khi dùng tool"),
  article("spoofer-la-gi", "Spoofer là gì? Cách chọn spoofer phù hợp"),
  article("tat-secure-boot-va-ao-hoa", "Tắt Secure Boot và bật ảo hoá trong BIOS"),
  article("thu-noi-bat-cai-dat-tool-valorant", "Cài đặt và chạy tool Valorant an toàn"),
  article("thu-phan-trang-04", "Mua nhiều tool cùng lúc bằng giỏ hàng"),
  article("thuat-ngu-chuc-nang-hack", "Thuật ngữ chức năng hack: Aimbot, ESP, Spoofer và các từ hay gặp"),
];

const pick = (categorySlug: string, productArticles: { slug: string; title: string }[] = [], articles = WIKI) =>
  pickRelatedGuides({ categorySlug, productArticles, articles });

describe("pickRelatedGuides", () => {
  it("offers a shelf its map entries in order, dropping the ones not written yet", () => {
    expect(pick("hack-cs2-counter-strike-2").game).toEqual([
      "config-la-gi",
      "chinh-sach-bao-hanh-hoan-tien-phan-mem",
    ]);
    expect(pick("hack-valorant-moi").game).toEqual([
      "tat-secure-boot-va-ao-hoa",
      "spoofer-la-gi",
      "cai-spoofer-tai-nha",
    ]);
  });

  it("puts a tool's own docs first", () => {
    const own = [
      { slug: "hack-cs2-legit-cai-dat", title: "Cài đặt bản legit" },
      { slug: "hack-cs2-legit-loi", title: "Lỗi thường gặp" },
    ];
    expect(pick("hack-cs2-counter-strike-2", own).game).toEqual([
      "hack-cs2-legit-cai-dat",
      "hack-cs2-legit-loi",
      "config-la-gi",
      "chinh-sach-bao-hanh-hoan-tien-phan-mem",
    ]);
  });

  it("adds the wiki articles whose title names the game, without repeats", () => {
    const wiki = [
      ...WIKI,
      article("hack-valorant-loi-van-1067", "Hack Valorant báo lỗi VAN 1067"),
      article("vanguard-chan-driver", "Vanguard chặn driver thì làm gì"),
    ];
    expect(pick("hack-valorant-moi", [], wiki).game).toEqual([
      "tat-secure-boot-va-ao-hoa",
      "spoofer-la-gi",
      "cai-spoofer-tai-nha",
      "hack-valorant-loi-van-1067",
      "vanguard-chan-driver",
    ]);
    // A mapped article that also names the game is listed once.
    const twice = [...WIKI, article("spoofer-valorant-nao", "Spoofer Valorant nào hợp máy bạn")];
    const game = pick("hack-valorant-moi", [], twice).game;
    expect(new Set(game).size).toBe(game.length);
    expect(game).toContain("spoofer-valorant-nao");
  });

  it("skips test rows, the cloned shop's mail articles and bodiless articles", () => {
    // "Cài đặt và chạy tool Valorant an toàn" names the game but is a test row.
    expect(pick("hack-valorant-moi").game).not.toContain("thu-noi-bat-cai-dat-tool-valorant");
    const wiki = [
      ...WIKI,
      article("drop-mail-valorant", "Drop Mail Valorant là gì"),
      article("hack-valorant-ban-moi", "Hack Valorant bản mới", false),
    ];
    const game = pick("hack-valorant-moi", [], wiki).game;
    expect(game).not.toContain("drop-mail-valorant");
    expect(game).not.toContain("hack-valorant-ban-moi");
    expect(JUNK_SLUG.test("thu-phan-trang-04")).toBe(true);
    expect(JUNK_SLUG.test("dsadsa")).toBe(true);
    expect(JUNK_SLUG.test("2312331")).toBe(true);
    expect(JUNK_SLUG.test("spoofer-la-gi")).toBe(false);
    expect(JUNK_TITLE.test("Hướng Dẫn Check Thư Welcome")).toBe(true);
    expect(JUNK_TITLE.test("Spoofer là gì?")).toBe(false);
  });

  it("caps the game row at six", () => {
    const wiki = [
      ...WIKI,
      ...Array.from({ length: 8 }, (_, i) => article(`cs2-bai-${i}`, `Hack CS2 bài ${i}`)),
    ];
    const game = pick("hack-cs2-counter-strike-2", [], wiki).game;
    expect(game).toHaveLength(GAME_ROW_MAX);
    expect(game.slice(0, 2)).toEqual(["config-la-gi", "chinh-sach-bao-hanh-hoan-tien-phan-mem"]);
  });

  it("offers nothing game-wise for a shelf the map does not know", () => {
    expect(pick("hack-naraka-vn").game).toEqual([]);
  });

  it("gives every page the general guides that exist, in order", () => {
    expect(pick("hack-cs2-counter-strike-2").general).toEqual(GENERAL_GUIDES);
    const missing = WIKI.filter((a) => a.slug !== "quy-trinh-bao-hanh");
    expect(pick("hack-cs2-counter-strike-2", [], missing).general).toEqual(
      GENERAL_GUIDES.filter((slug) => slug !== "quy-trinh-bao-hanh"),
    );
  });

  it("builds an account listing's rows from the NFA list", () => {
    const picked = pickRelatedGuides({
      categorySlug: "tool-hack-acc-lien-minh-huyen-thoai-lol",
      productArticles: [],
      articles: WIKI,
      gameGuides: { "tool-hack-acc-lien-minh-huyen-thoai-lol": ACCOUNT_GUIDES },
      generalGuides: ACCOUNT_GENERAL_GUIDES,
    });
    expect(picked.game.slice(0, 4)).toEqual(ACCOUNT_GUIDES);
    expect(picked.general).toEqual(ACCOUNT_GENERAL_GUIDES);
  });
});

describe("the map", () => {
  it("names a heading and title words for every shelf it lists", () => {
    for (const slug of Object.keys(GAME_GUIDES)) {
      expect(GAME_NAMES[slug], slug).toBeTruthy();
      expect(GAME_WORDS[slug], slug).toBeInstanceOf(RegExp);
    }
  });

  it("matches the games by the words a title uses", () => {
    expect(GAME_WORDS["hack-cs2-counter-strike-2"]!.test("Hack CS2 có bị VAC ban không?")).toBe(true);
    expect(GAME_WORDS["hack-cs2-counter-strike-2"]!.test("Counter-Strike 2 legit")).toBe(true);
    expect(GAME_WORDS["hack-dot-kich-cfvn-cf4vn"]!.test("Đột Kích còn hack được không 2026?")).toBe(true);
    expect(GAME_WORDS["tool-hack-acc-lien-minh-huyen-thoai-lol"]!.test("Tool LoL và Vanguard")).toBe(true);
    expect(GAME_WORDS["tool-hack-acc-lien-minh-huyen-thoai-lol"]!.test("Lol, một bài khác")).toBe(true);
    expect(GAME_WORDS["hack-call-of-duty-warzone-black-ops-6"]!.test("Spoofer cho BO6")).toBe(true);
    expect(GAME_WORDS["hack-valorant-moi"]!.test("Hack CS2 có bị VAC ban không?")).toBe(false);
  });
});
