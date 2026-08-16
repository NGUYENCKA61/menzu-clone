/**
 * Starter rows for the "Đối tác uy tín" strip, and the layout fix-up that
 * puts the block where it belongs.
 *
 *   npx tsx --env-file=.env scripts/seed-partners.ts          # add
 *   npx tsx --env-file=.env scripts/seed-partners.ts --clean  # remove them
 *
 * The starters are the six payment marks the footer already shows — real
 * assets this shop already displays, not invented partnerships. They exist so
 * the strip has something to render on day one; the admin replaces them from
 * Marketing → Đối tác uy tín.
 *
 * The layout half: a shop that has saved its own home.blocks order gets the
 * new "partners" id appended at the end by the sanitizer, not slotted under
 * the reviews where it belongs by default — and the retired "ticker" id may
 * still be stored. Both are fixed in place here, once.
 */
import { db } from "@/lib/db";

const IMAGES = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/site/images";

const STARTERS = [
  { name: "ACB", tagline: "Ngân hàng", logoUrl: `${IMAGES}/acb.webp` },
  { name: "MoMo", tagline: "Thanh toán điện tử", logoUrl: `${IMAGES}/momo.webp` },
  { name: "ZaloPay", tagline: "Ví điện tử", logoUrl: `${IMAGES}/zalopay.webp` },
  { name: "VNPay", tagline: "Cổng thanh toán", logoUrl: `${IMAGES}/vnpay.webp` },
  { name: "PayPal", tagline: "Thanh toán quốc tế", logoUrl: `${IMAGES}/paypal.webp` },
  { name: "Crypto", tagline: "Thanh toán tiền mã hóa", logoUrl: `${IMAGES}/crypto.webp` },
];

async function fixStoredLayout() {
  const row = await db.setting.findUnique({ where: { key: "home.blocks" } });
  if (!row) return "khong co layout luu san — dung thu tu mac dinh";

  const ids = row.value.split(",").map((s) => s.trim()).filter(Boolean);
  const cleaned = ids.filter((id) => id.replace(/^-/, "") !== "ticker");
  const withoutPartners = cleaned.filter((id) => id.replace(/^-/, "") !== "partners");

  const reviewsAt = withoutPartners.findIndex((id) => id.replace(/^-/, "") === "reviews");
  const next = [...withoutPartners];
  next.splice(reviewsAt === -1 ? next.length : reviewsAt + 1, 0, "partners");

  await db.setting.update({ where: { key: "home.blocks" }, data: { value: next.join(",") } });
  return `layout luu san da sua: ${next.join(",")}`;
}

async function main() {
  const clean = process.argv.includes("--clean");

  if (clean) {
    const { count } = await db.partner.deleteMany({
      where: { name: { in: STARTERS.map((s) => s.name) } },
    });
    console.log(JSON.stringify({ removed: count }));
    return;
  }

  let order = 1;
  const made: string[] = [];
  for (const starter of STARTERS) {
    const exists = await db.partner.findFirst({ where: { name: starter.name } });
    if (exists) {
      // Already seeded rows pick up a tagline they were created without; one
      // the admin has since written by hand is left alone.
      if (!exists.tagline && starter.tagline) {
        await db.partner.update({
          where: { id: exists.id },
          data: { tagline: starter.tagline },
        });
        made.push(`${starter.name} (+tagline)`);
      }
      continue;
    }
    await db.partner.create({ data: { ...starter, sortOrder: order++ } });
    made.push(starter.name);
  }

  console.log(JSON.stringify({ seeded: made, layout: await fixStoredLayout() }, null, 2));
}

main();
