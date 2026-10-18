import "server-only";

import { db } from "@/lib/db";
import type { ReviewRow } from "@/lib/queries";
import { productHref } from "@/lib/routes";

/**
 * LAB 2 ONLY: four made-up reviews, each tied to a real tool of the shop,
 * ahead of the home page's real ones, so the owner can see every card
 * with a bought tool's name under its stars (18/10/2026: "làm dữ liệu test
 * 4 khách hàng mua đi", "hiện chữ đỏ sản phẩm tui coi", "tên tool màu đỏ
 * ấy"). They stood in place of the real ones until the strip got its
 * arrows ("thêm nút di chuyển coi đánh giá"): four cards alone gave the
 * arrows nothing to move on a desktop. /feedback lists them too, with six
 * more that carry photos (FEEDBACK_SAMPLES). Display only, nothing is written
 * anywhere. On when LAB_SAMPLE_REVIEWS=1 is set (lab 2's .env.local), never
 * in a production build; with no tool on sale the real reviews stay alone.
 *
 * The three named buyers wear game agent icons as photos, the kind menzu.lol
 * gives its reviewers (the owner, 18/10/2026: "thêm vài avatar lấy từ menzu
 * để tui coi test hợp lý không"); menzu's buyers' own Facebook pictures were
 * left alone, being real people. The icons sit, untracked, in lab 2's
 * public/lab-samples/avatars; missing, the card shows the initial.
 */
const SAMPLE_REVIEWS =
  process.env.LAB_SAMPLE_REVIEWS === "1" && process.env.NODE_ENV !== "production";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Sample {
  name: string;
  body: string;
  rating: number;
  amount: number;
  anonymous: boolean;
  daysAgo: number;
  avatarUrl: string | null;
}

const SAMPLES: Sample[] = [
  {
    name: "Minh Tuấn",
    body: "Dùng hơn 2 tuần rồi chưa dính gì, aim mượt, shop cài giúp qua UltraView rất nhanh.",
    rating: 5,
    amount: 250_000,
    anonymous: false,
    daysAgo: 1,
    avatarUrl: "/lab-samples/avatars/agent-1.webp",
  },
  {
    name: "Hoàng Long",
    body: "Key giao ngay sau khi thanh toán, có hướng dẫn chi tiết, leo rank thoải mái.",
    rating: 5,
    amount: 180_000,
    anonymous: false,
    daysAgo: 3,
    avatarUrl: "/lab-samples/avatars/agent-2.webp",
  },
  {
    name: "Khách hàng ẩn danh",
    body: "Lần đầu mua hack, admin hỗ trợ tận tình tới khi chạy được mới thôi.",
    rating: 5,
    amount: 120_000,
    anonymous: true,
    daysAgo: 5,
    avatarUrl: null,
  },
  {
    name: "Thanh Hà",
    body: "Giá hợp lý, menu dễ dùng, có vấn đề nhắn Zalo là được trả lời liền. Sẽ ủng hộ tiếp.",
    rating: 4,
    amount: 350_000,
    anonymous: false,
    daysAgo: 8,
    avatarUrl: "/lab-samples/avatars/agent-3.webp",
  },
];

/**
 * /feedback's six more, each with the photo a buyer would attach (the owner,
 * 18/10/2026: "trang /feedback thêm vài dữ liệu test đi", "có hình"). The
 * photo is the bought tool's own in-game screenshot, so the picture and the
 * "Đã mua" line always name the same game: a sample goes to whichever tool
 * wears its picture and drops out when none does. Picked from the shop's
 * plain screenshots, not its posters with words over them, and none shows a
 * person. Among them a 3-star, a second anonymous buyer and a photo with no
 * words, so every state of the card and the star filter has something to show.
 */
const FEEDBACK_SAMPLES: Array<Sample & { picture: string }> = [
  {
    // Valorant, the skin unlocker: the inventory.
    name: "Bảo Ngọc",
    body: "Mở khóa được hết skin, vào trận vẫn hiện đủ. Chụp kho đồ khoe anh em luôn.",
    rating: 5,
    amount: 150_000,
    anonymous: false,
    daysAgo: 0,
    avatarUrl: null,
    picture: "/uploads/software/2b749ea00544b1299400d71f.png",
  },
  {
    // Delta Force, bản VS full: the menu.
    name: "Trọng Nhân",
    body: "Menu đủ thứ, chỉnh ESP theo ý được. Trừ 1 sao vì lần đầu cài phải nhờ admin vào UltraView.",
    rating: 4,
    amount: 200_000,
    anonymous: false,
    daysAgo: 2,
    avatarUrl: null,
    picture: "/uploads/software/5bdc781fff1469f1c437039d.png",
  },
  {
    // Delta Force, bản AC private: ESP lines in a match.
    name: "Phúc Thịnh",
    body: "Bật ESP lên thấy hết đồ với người, máy nhà chạy mượt, không tụt FPS.",
    rating: 5,
    amount: 300_000,
    anonymous: false,
    daysAgo: 4,
    avatarUrl: null,
    picture: "/uploads/software/898cde1536a98ad0d0895e69.png",
  },
  {
    // CFVN, bản chuyên AI: a match.
    name: "Khách hàng ẩn danh",
    body: "Bắn nhanh thật nhưng thỉnh thoảng bị văng game. Nhắn shop thì được chỉ tắt diệt virus, giờ đỡ hơn rồi.",
    rating: 3,
    amount: 120_000,
    anonymous: true,
    daysAgo: 6,
    avatarUrl: null,
    picture: "/uploads/software/da95e059bab9bbab26d7eb16.png",
  },
  {
    // CFVN, bản Prechair: a match, and no words.
    name: "Văn Khoa",
    body: "",
    rating: 5,
    amount: 180_000,
    anonymous: false,
    daysAgo: 9,
    avatarUrl: null,
    picture: "/uploads/software/8577e33f1069d7c471bc9a3e.png",
  },
  {
    // LOL, bản PV: the Vietnamese menu.
    name: "Tuấn Kiệt",
    body: "Menu tiếng Việt dễ hiểu, né chiêu khá ổn. Máy net phải bypass Vanguard hơi lâu nhưng shop chỉ tận tình.",
    rating: 4,
    amount: 250_000,
    anonymous: false,
    daysAgo: 12,
    avatarUrl: null,
    picture: "/uploads/software/dcd141534e9615a3c7d61bb4.png",
  },
];

const TOOL_SELECT = {
  name: true,
  code: true,
  slug: true,
  category: { select: { name: true, slug: true } },
} as const;

function toRow(
  sample: Sample,
  tool: { name: string | null; code: string; slug: string; category: { name: string; slug: string } },
  imageUrl: string | null,
  now: number,
): ReviewRow {
  return {
    name: sample.name,
    body: sample.body,
    avatarUrl: sample.avatarUrl,
    amount: sample.amount,
    rating: sample.rating,
    service: "MUA KEY",
    imageUrl,
    anonymous: sample.anonymous,
    verified: true,
    createdAt: new Date(now - sample.daysAgo * DAY_MS),
    purchase: {
      product: tool.name ?? tool.code,
      tier: null,
      game: tool.category.name,
      href: productHref(tool.category.slug, tool.slug),
    },
  };
}

export async function withSampleReviews(rows: ReviewRow[]): Promise<ReviewRow[]> {
  if (!SAMPLE_REVIEWS) return rows;
  const tools = await db.product.findMany({
    where: {
      deletedAt: null,
      productType: "SOFTWARE_GAME",
      status: { not: "HIDDEN" },
      name: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: SAMPLES.length,
    select: TOOL_SELECT,
  });
  if (tools.length === 0) return rows;
  const now = Date.now();
  const samples = SAMPLES.map((sample, index) =>
    toRow(sample, tools[index % tools.length], null, now),
  );
  return [...samples, ...rows];
}

/** The home page's four and FEEDBACK_SAMPLES' six, for /feedback. */
export async function withSampleFeedback(rows: ReviewRow[]): Promise<ReviewRow[]> {
  if (!SAMPLE_REVIEWS) return rows;
  const tools = await db.product.findMany({
    where: {
      deletedAt: null,
      productType: "SOFTWARE_GAME",
      status: { not: "HIDDEN" },
      imageUrl: { in: FEEDBACK_SAMPLES.map((sample) => sample.picture) },
    },
    select: { ...TOOL_SELECT, imageUrl: true },
  });
  const now = Date.now();
  const extras = FEEDBACK_SAMPLES.flatMap((sample) => {
    const tool = tools.find((t) => t.imageUrl === sample.picture);
    return tool ? [toRow(sample, tool, sample.picture, now)] : [];
  });
  return [...extras, ...(await withSampleReviews(rows))];
}
