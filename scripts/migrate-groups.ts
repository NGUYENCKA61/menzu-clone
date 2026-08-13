/**
 * Moves the home page's category rows out of the settings table and into real
 * groups.
 *
 *   npx tsx --env-file=.env scripts/migrate-groups.ts
 *
 * The rows used to be two comma-separated strings of slugs under
 * home.row.valorant and home.row.tft, with the rows themselves hard-coded.
 * Each becomes a Group, and each slug in it becomes a line in
 * group_categories pointing at the category that already exists.
 *
 * Nothing is created twice and nothing is deleted. Categories are matched by
 * slug and left exactly as they are — that is the point of the join table.
 * The old settings keys are left in place too: they are how this script knows
 * what to rebuild if it has to be run again, and a key nobody reads costs a
 * row in a key-value table.
 *
 * Safe to run more than once. Groups are matched by slug and links by pair,
 * so a second run adds whatever the first could not and changes nothing else.
 */

import { db } from "@/lib/db";
import { getShopSettings } from "@/lib/settingsStore";

interface Seed {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  /** Where the membership comes from; empty means the shop fills it in. */
  from: "valorant" | "tft" | null;
}

const GROUPS: Seed[] = [
  { slug: "hot-trending", name: "Hot trending tháng này", icon: "🔥", sortOrder: 0, from: "valorant" },
  { slug: "danh-sach-game", name: "Danh sách game", icon: "🎮", sortOrder: 1, from: "tft" },
  { slug: "danh-muc-acc-game", name: "Danh mục acc game", icon: "🔐", sortOrder: 2, from: null },
];

/**
 * Puts the new "groups" block where "valorant" used to sit.
 *
 * The two old rows are gone from the block list, so a saved layout would drop
 * them on the next read and take the new block at the end — which would move
 * the shop's product rows below its footer widgets without anyone asking. The
 * raw row is edited here rather than through the settings module, because the
 * module has already discarded the retired ids by the time it hands anything
 * back.
 */
async function rewriteBlockOrder() {
  const row = await db.setting.findUnique({ where: { key: "home.blocks" } });
  // Nothing saved means the defaults apply, and those already read "groups".
  if (!row) {
    console.log("\nBố cục trang chủ: chưa lưu gì, dùng mặc định.");
    return;
  }

  const before = row.value.split(",").map((part) => part.trim()).filter(Boolean);
  if (before.some((id) => id.replace(/^-/, "") === "groups")) {
    console.log("\nBố cục trang chủ: đã có khối nhóm, không đổi.");
    return;
  }

  const after: string[] = [];
  for (const entry of before) {
    const id = entry.replace(/^-/, "");
    // "groups" inherits whether "valorant" was showing; "tft" just goes.
    if (id === "valorant") after.push(entry.startsWith("-") ? "-groups" : "groups");
    else if (id !== "tft") after.push(entry);
  }
  if (!after.some((id) => id.replace(/^-/, "") === "groups")) after.push("groups");

  await db.setting.update({ where: { key: "home.blocks" }, data: { value: after.join(",") } });
  console.log(`\nBố cục trang chủ: khối nhóm đặt ở vị trí ${after.indexOf("groups") + 1}.`);
}

async function main() {
  const settings = await getShopSettings();
  const source: Record<"valorant" | "tft", string[]> = {
    valorant: settings.homeValorantSlugs,
    tft: settings.homeTftSlugs,
  };

  for (const seed of GROUPS) {
    const group = await db.group.upsert({
      where: { slug: seed.slug },
      // Only ever fills in a missing group. A shop that has already renamed
      // one keeps its name.
      create: {
        slug: seed.slug,
        name: seed.name,
        icon: seed.icon,
        sortOrder: seed.sortOrder,
      },
      update: {},
    });

    const slugs = seed.from ? source[seed.from] : [];
    if (slugs.length === 0) {
      console.log(`${seed.icon} ${group.name}: chưa có danh mục nào.`);
      continue;
    }

    const categories = await db.category.findMany({ where: { slug: { in: slugs } } });
    const bySlug = new Map(categories.map((c) => [c.slug, c]));

    let linked = 0;
    const missing: string[] = [];
    for (const [index, slug] of slugs.entries()) {
      const category = bySlug.get(slug);
      // A slug naming a category that no longer exists: exactly the kind of
      // dangling reference a string column allows and a foreign key does not.
      if (!category) {
        missing.push(slug);
        continue;
      }
      await db.groupCategory.upsert({
        where: { groupId_categoryId: { groupId: group.id, categoryId: category.id } },
        create: { groupId: group.id, categoryId: category.id, sortOrder: index },
        update: { sortOrder: index },
      });
      linked += 1;
    }

    console.log(`${seed.icon} ${group.name}: ${linked} danh mục.`);
    if (missing.length > 0) {
      console.log(`   bỏ qua ${missing.length} slug không còn danh mục: ${missing.join(", ")}`);
    }
  }

  await rewriteBlockOrder();

  // The rule this whole table exists to keep.
  const categories = await db.category.count();
  const links = await db.groupCategory.count();
  console.log(`\nTổng: ${categories} danh mục, ${links} liên kết nhóm–danh mục.`);
  console.log("Mỗi danh mục vẫn là một bản ghi duy nhất, dù nằm trong bao nhiêu nhóm.");
}

void main();
