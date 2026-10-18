import "server-only";

import { db } from "@/lib/db";
import type { ReviewRow } from "@/lib/queries";
import { productHref } from "@/lib/routes";

/**
 * LAB 2 ONLY: four made-up reviews, each tied to a real tool of the shop,
 * in place of the home page's real ones, so the owner can see every card
 * with a bought tool's name under its stars (18/10/2026: "làm dữ liệu test
 * 4 khách hàng mua đi", "hiện chữ đỏ sản phẩm tui coi", "tên tool màu đỏ
 * ấy"). Display only, nothing is written anywhere. On when
 * LAB_SAMPLE_REVIEWS=1 is set (lab 2's .env.local), never in a production
 * build; with no tool on sale the real reviews stay.
 */
const SAMPLE_REVIEWS =
  process.env.LAB_SAMPLE_REVIEWS === "1" && process.env.NODE_ENV !== "production";

const DAY_MS = 24 * 60 * 60 * 1000;

const SAMPLES: Array<{
  name: string;
  body: string;
  rating: number;
  amount: number;
  anonymous: boolean;
  daysAgo: number;
}> = [
  {
    name: "Minh Tuấn",
    body: "Dùng hơn 2 tuần rồi chưa dính gì, aim mượt, shop cài giúp qua UltraView rất nhanh.",
    rating: 5,
    amount: 250_000,
    anonymous: false,
    daysAgo: 1,
  },
  {
    name: "Hoàng Long",
    body: "Key giao ngay sau khi thanh toán, có hướng dẫn chi tiết, leo rank thoải mái.",
    rating: 5,
    amount: 180_000,
    anonymous: false,
    daysAgo: 3,
  },
  {
    name: "Khách hàng ẩn danh",
    body: "Lần đầu mua hack, admin hỗ trợ tận tình tới khi chạy được mới thôi.",
    rating: 5,
    amount: 120_000,
    anonymous: true,
    daysAgo: 5,
  },
  {
    name: "Thanh Hà",
    body: "Giá hợp lý, menu dễ dùng, có vấn đề nhắn Zalo là được trả lời liền. Sẽ ủng hộ tiếp.",
    rating: 4,
    amount: 350_000,
    anonymous: false,
    daysAgo: 8,
  },
];

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
    select: { name: true, code: true, slug: true, category: { select: { name: true, slug: true } } },
  });
  if (tools.length === 0) return rows;
  const now = Date.now();
  return SAMPLES.map((sample, index) => {
    const tool = tools[index % tools.length];
    return {
      name: sample.name,
      body: sample.body,
      avatarUrl: null,
      amount: sample.amount,
      rating: sample.rating,
      service: "",
      imageUrl: null,
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
  });
}
