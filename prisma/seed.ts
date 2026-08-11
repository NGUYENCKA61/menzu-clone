/**
 * Seeds the database with the real data captured from menzu.lol.
 *
 * Nothing here is invented: every product, price, rank, tier count, category
 * and review was read off the live site during the clone. Where a value was
 * never exposed by the site (per-skin icons, for instance) it is left empty
 * rather than filled with plausible-looking noise.
 *
 *   npx prisma migrate dev     # runs this afterwards
 *   npx tsx prisma/seed.ts     # or run it directly
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  ContentTier,
  PrismaClient,
  SkinKind,
  type Prisma,
} from "@prisma/client";

import { CATEGORY_PRODUCTS } from "../src/components/sites/menzu-lol-f7ae197a/shared/productData";
import { FLASH_SALE_ITEMS } from "../src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/flashSaleData";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your Postgres password.",
  );
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Category slugs and display names, taken from the live nav + listing links. */
const CATEGORIES: { slug: string; name: string }[] = [
  { slug: "account-valorant-tu-chon", name: "ACCOUNT VALORANT TỰ CHỌN" },
  { slug: "random-valorant-20k-oi-thong-tin", name: "RANDOM VALORANT 20K | ĐỔI THÔNG TIN" },
  { slug: "random-smuft-ban-rank-oi-thong-tin", name: "RANDOM SMUFT BẮN RANK | ĐỔI THÔNG TIN" },
  { slug: "random-valorant-tren-lv-20-oi-thong-tin", name: "RANDOM VALORANT TRÊN LV 20 | ĐỔI THÔNG TIN" },
  { slug: "random-valorant-tren-lv-20-nfa", name: "RANDOM VALORANT TRÊN LV 20 | NFA" },
  { slug: "random-acc-tft", name: "RANDOM ACC TFT" },
  { slug: "acc-tft-pet-tim", name: "ACC TFT PET TÍM" },
  { slug: "acc-tft-san-tim", name: "ACC TFT SÀN TÍM" },
  { slug: "acc-tft-hang-hieu", name: "ACC TFT HÀNG HIỆU" },
];

/** Services behind /services/* — names, price labels and completed counts are live values. */
const SERVICES: { slug: string; name: string; priceLabel: string; doneCount: number }[] = [
  { slug: "riotgames", name: "Dịch Vụ Riot Games", priceLabel: "200K ~ 800K", doneCount: 96 },
  { slug: "valorantpoint-vn", name: "Nạp Valorant Point VN", priceLabel: "109K ~ 2.2M", doneCount: 213 },
  { slug: "valorantpoint-ph", name: "Nạp Valorant Point PH", priceLabel: "199K ~ 1.9M", doneCount: 64 },
  { slug: "rutvts", name: "Rút Ví Trả Sau", priceLabel: "Liên hệ", doneCount: 300 },
  { slug: "ytb", name: "Youtube Premium Cá Nhân", priceLabel: "50K ~ 550K", doneCount: 8 },
  { slug: "dvfb", name: "Dịch Vụ Mở Khóa Facebook", priceLabel: "Liên hệ", doneCount: 43 },
];

/** The five reviews shown on the homepage, verbatim. */
const FEEDBACK: { name: string; body: string; amount: number; avatar: string }[] = [
  { name: "Duy Anh", body: "+1 uy tín đã giao dịch 4 lần", amount: 5_250_000, avatar: "fb-avatar-3c833108-c1b0-4492-8a30-78a3db774db5.webp" },
  { name: "Quang Lâm", body: "Ut vs tận tâm nha ae", amount: 2_100_000, avatar: "fb-avatar-57655c36-1580-45c7-a1af-e8d5e65d3c7d.webp" },
  { name: "Phạm Thế Cường", body: "Tuy mua trả góp nhg UT!", amount: 2_480_000, avatar: "fb-avatar-5a6a7b1c-bb9f-4d15-b22c-6e1537d86b83.webp" },
  { name: "Nguyễn Tuấn Hùng", body: "+1 legit giao dịch nhanh gọn", amount: 2_400_000, avatar: "fb-avatar-d8dfdbc4-4045-4ff7-ac86-f4d450a99ffb.webp" },
  { name: "Nguyễn Thành Xuyên", body: "+1 legit nha", amount: 2_000_000, avatar: "fb-avatar-2d4a2ff1-693f-4a6a-b222-57f910f9866c.webp" },
];

const IMAGES = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images";

const TIER_BY_COLOR: Record<string, ContentTier> = {
  yellow: ContentTier.ULTRA,
  orange: ContentTier.EXCLUSIVE,
  pink: ContentTier.PREMIUM,
  cyan: ContentTier.DELUXE,
  blue: ContentTier.SELECT,
};

/**
 * Expands a card's tier counters into individual ProductSkin rows.
 * The live site only exposes counts per tier in the listing, never the skin
 * names, so each row is a numbered placeholder that the real inventory can
 * replace later. Kind is WEAPON_SKIN because the card headline counts only
 * weapon skins — the other four inventory types are separate totals.
 */
function skinRowsFor(
  tiers: { color: string; count: number }[],
): Prisma.ProductSkinCreateWithoutProductInput[] {
  const rows: Prisma.ProductSkinCreateWithoutProductInput[] = [];
  for (const { color, count } of tiers) {
    const tier = TIER_BY_COLOR[color];
    if (!tier) continue;
    for (let i = 1; i <= count; i += 1) {
      rows.push({ kind: SkinKind.WEAPON_SKIN, tier, name: `${tier} #${i}` });
    }
  }
  return rows;
}

/** Detail-page stats, read from https://menzu.lol/account/VLR2030. */
const VLR2030_DETAIL = {
  rank: "Unranked",
  lastRank: "DIAMOND 1 (V26 // ACT III)",
  level: 91,
  vp: 301,
  rp: 0,
  kc: 1833,
  mailType: "Mail gốc",
  depositFrom: BigInt(299_000),
  viewers: 6,
};

/**
 * The four non-weapon inventory tabs for VLR2030, read off the live detail
 * page: Buddies 40, Agents 26, Cards 51, Sprays 49. The listing only ever
 * exposes weapon-skin tier counts, so without these the other four tabs would
 * render as empty for the one account whose real numbers we do know.
 * Tier is null — the site does not break these down by content tier.
 */
const VLR2030_EXTRA_INVENTORY: { kind: SkinKind; count: number }[] = [
  { kind: SkinKind.BUDDY, count: 40 },
  { kind: SkinKind.AGENT, count: 26 },
  { kind: SkinKind.CARD, count: 51 },
  { kind: SkinKind.SPRAY, count: 49 },
];

function extraInventoryRows(): Prisma.ProductSkinCreateWithoutProductInput[] {
  const rows: Prisma.ProductSkinCreateWithoutProductInput[] = [];
  for (const { kind, count } of VLR2030_EXTRA_INVENTORY) {
    for (let i = 1; i <= count; i += 1) {
      rows.push({ kind, tier: null, name: `${kind} #${i}` });
    }
  }
  return rows;
}

/** Flash-sale prices are formatted strings ("3.300.000 VND") — parse to VND. */
function parseVnd(value: string | null): bigint | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits ? BigInt(digits) : null;
}

async function main() {
  console.log("Seeding…");

  // Categories -------------------------------------------------------------
  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { slug: c.slug, name: c.name, sortOrder: i },
    });
  }
  const mainCategory = await db.category.findUniqueOrThrow({
    where: { slug: "account-valorant-tu-chon" },
  });
  console.log(`  categories: ${CATEGORIES.length}`);

  // Products from the category listing -------------------------------------
  let productCount = 0;
  for (const p of CATEGORY_PRODUCTS) {
    const detail = p.code === "VLR2030" ? VLR2030_DETAIL : null;
    await db.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        categoryId: mainCategory.id,
        rank: detail?.rank ?? p.rank,
        lastRank: detail?.lastRank ?? null,
        level: detail?.level ?? 0,
        vp: detail?.vp ?? 0,
        rp: detail?.rp ?? 0,
        kc: detail?.kc ?? 0,
        mailType: detail?.mailType ?? null,
        depositFrom: detail?.depositFrom ?? null,
        viewers: detail?.viewers ?? 0,
        oldPrice: BigInt(p.oldPrice),
        price: BigInt(p.price),
        imageUrl: `${IMAGES}/account/${p.code}.png`,
        tags: p.tag ? { create: [{ label: p.tag }] } : undefined,
        skins: {
          create: [
            ...skinRowsFor(p.tiers),
            ...(detail ? extraInventoryRows() : []),
          ],
        },
      },
    });
    productCount += 1;
  }

  // Products from the homepage flash sale ----------------------------------
  for (const item of FLASH_SALE_ITEMS) {
    const existing = await db.product.findUnique({ where: { code: item.code } });
    if (existing) continue;
    const price = parseVnd(item.newPrice);
    if (price === null) continue;
    await db.product.create({
      data: {
        code: item.code,
        categoryId: mainCategory.id,
        rank: "Unranked",
        oldPrice: parseVnd(item.oldPrice) ?? price,
        price,
        imageUrl: `${IMAGES}/account/${item.code}.png`,
        skins: { create: skinRowsFor(item.tiers) },
      },
    });
    productCount += 1;
  }
  console.log(`  products: ${productCount}`);

  // Services ---------------------------------------------------------------
  for (const s of SERVICES) {
    await db.service.upsert({
      where: { slug: s.slug },
      update: { name: s.name, priceLabel: s.priceLabel, doneCount: s.doneCount },
      create: s,
    });
  }
  console.log(`  services: ${SERVICES.length}`);

  // Feedback ---------------------------------------------------------------
  const feedbackCount = await db.feedback.count();
  if (feedbackCount === 0) {
    await db.feedback.createMany({
      data: FEEDBACK.map((f) => ({
        name: f.name,
        body: f.body,
        amount: BigInt(f.amount),
        avatarUrl: `${IMAGES}/feedback/avatar/${f.avatar}`,
      })),
    });
  }
  console.log(`  feedback: ${FEEDBACK.length}`);

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
