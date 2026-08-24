/**
 * Seeds the software half of the catalogue — the SOFTWARE_GAME side of the
 * Nhóm → Danh mục → Product tree.
 *
 *   npx tsx --env-file=.env scripts/seed-software.ts         # add
 *   npx tsx --env-file=.env scripts/seed-software.ts --clean # remove them
 *
 * Every product here is attached to a category that already exists, picked by
 * slug. Nothing is created if the category is missing: inventing one would put
 * a row on the home page that the shop never asked for.
 *
 * Prices and tier names are the ones on the brief's mockup, not invented.
 */
import { db } from "@/lib/db";

const TIERS = [
  { label: "1 ngày", durationHours: 24, price: 29_000 },
  { label: "7 ngày", durationHours: 168, price: 99_000 },
  { label: "30 ngày", durationHours: 720, price: 249_000 },
];

const IMAGES = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images";

const SEEDS = [
  {
    code: "VALTOOL01",
    name: "Valorant Tool Premium",
    description:
      "Phần mềm Valorant cao cấp, dễ sử dụng, cập nhật thường xuyên và được tối ưu cho trải nghiệm ổn định.",
    softwareStatus: "UNDETECTED" as const,
    categorySlug: "account-valorant-tu-chon",
    // Points at a page that exists in this clone rather than an invented
    // download host, so the button on the card goes somewhere real.
    downloadUrl: "/app/download",
    // The two figures the brief's own sample prints for this product.
    version: "Premium 2.4.1",
    platform: "Windows 10 / 11",
  },
];

async function main() {
  const clean = process.argv.includes("--clean");
  const codes = SEEDS.map((s) => s.code);

  if (clean) {
    // Packages and images cascade from the product; cart lines do too. Orders
    // do not, so a seeded tool that somebody bought refuses to go and says so
    // rather than taking the sale with it.
    const blocked = await db.order.findMany({
      where: { product: { code: { in: codes } } },
      select: { product: { select: { code: true } } },
    });
    const blockedCodes = new Set(blocked.map((o) => o.product.code));

    const removable = codes.filter((c) => !blockedCodes.has(c));
    const { count } = await db.product.deleteMany({ where: { code: { in: removable } } });
    console.log(
      JSON.stringify({
        removed: count,
        keptBecauseTheyHaveOrders: [...blockedCodes],
      }),
    );
    return;
  }

  const made: string[] = [];

  for (const seed of SEEDS) {
    const category = await db.category.findUnique({ where: { slug: seed.categorySlug } });
    if (!category) {
      console.log(`skipped ${seed.code}: no category "${seed.categorySlug}"`);
      continue;
    }

    const product = await db.product.upsert({
      where: { code: seed.code },
      create: {
        code: seed.code,
        categoryId: category.id,
        productType: "SOFTWARE_GAME",
        name: seed.name,
        description: seed.description,
        softwareStatus: seed.softwareStatus,
        downloadUrl: seed.downloadUrl,
        version: seed.version,
        platform: seed.platform,
        // A tool has no rank; the column stays required for the accounts that
        // do have one.
        rank: "",
        price: BigInt(TIERS[1]!.price),
        oldPrice: BigInt(TIERS[1]!.price),
        status: "AVAILABLE",
        imageUrl: `${IMAGES}/upload/bannermung9-7-26.webp`,
      },
      update: {
        productType: "SOFTWARE_GAME",
        name: seed.name,
        description: seed.description,
        softwareStatus: seed.softwareStatus,
        downloadUrl: seed.downloadUrl,
        version: seed.version,
        platform: seed.platform,
        deletedAt: null,
      },
    });

    // Rewritten rather than added to, so running this twice does not leave
    // eight tiers on a product that should have four.
    await db.productPackage.deleteMany({
      where: { productId: product.id, orders: { none: {} } },
    });
    for (const tier of TIERS) {
      const exists = await db.productPackage.findFirst({
        where: { productId: product.id, label: tier.label },
      });
      if (exists) continue;
      await db.productPackage.create({
        data: {
          productId: product.id,
          label: tier.label,
          durationHours: tier.durationHours,
          price: BigInt(tier.price),
          sortOrder: tier.price,
        },
      });
    }

    // Five screenshots, matching the strip on the brief's mockup. The clone
    // ships no tool screenshots, so these reuse assets already downloaded from
    // the target site rather than pointing at files that do not exist.
    const shots = [
      `${IMAGES}/upload/bannermung9-7-26.webp`,
      `${IMAGES}/upload/acctuchon.gif`,
      `${IMAGES}/upload/tfttuchon.webp`,
      `${IMAGES}/upload/petim.webp`,
      `${IMAGES}/upload/packvn.webp`,
    ];
    await db.productImage.deleteMany({ where: { productId: product.id } });
    for (const [index, url] of shots.entries()) {
      await db.productImage.create({
        data: { productId: product.id, url, sortOrder: index },
      });
    }

    made.push(seed.code);
  }

  console.log(JSON.stringify({ seeded: made, tiers: TIERS.length }));
}

main();
