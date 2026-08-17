import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * A listing is only as good as its list, and a long one is where a shop loses
 * patience — so the cap is generous enough never to be met in practice and low
 * enough that a paste accident cannot write thousands of rows.
 */
const MAX_NAMES = 200;
const MAX_NAME_LENGTH = 80;

/**
 * Replace an account's weapon-skin list.
 *
 * The whole list is sent and the whole list is written, rather than offering
 * add and remove separately: the shop edits this as a block of text — one
 * weapon per line — and diffing that against rows is this route's job, not the
 * admin's.
 *
 * Tiers survive the rewrite. The scraped accounts carry a tier, an icon and a
 * weapon on each row, and those drive the coloured counters the card prints;
 * deleting and recreating naively would blank them the first time anyone opened
 * the editor and pressed save. So the old rows are read first and their extra
 * facts carried across by name — a skin that stayed in the list keeps
 * everything known about it, and only the ones actually removed lose it.
 *
 * Rows are recreated in the order given even when they already existed, because
 * the order is the shop's editorial choice: the card shows the first few names,
 * so putting the best weapon on the first line has to be what puts it on the
 * card.
 */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    names?: unknown;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  if (!Array.isArray(body?.names)) {
    return NextResponse.json({ error: "Danh sách súng không hợp lệ" }, { status: 400 });
  }

  // Blank lines and stray whitespace come with typing a list by hand, and a
  // name repeated twice is a slip rather than two skins — none of the three is
  // worth an error message, so all three are cleaned up silently.
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of body.names) {
    if (typeof raw !== "string") continue;
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Tên súng quá dài (tối đa ${MAX_NAME_LENGTH} ký tự): ${name.slice(0, 40)}…` },
        { status: 400 },
      );
    }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  if (names.length > MAX_NAMES) {
    return NextResponse.json(
      { error: `Tối đa ${MAX_NAMES} súng một tài khoản. Danh sách này ${names.length}.` },
      { status: 400 },
    );
  }

  const product = await db.product.findUnique({
    where: { code },
    select: { id: true, productType: true, deletedAt: true },
  });
  if (!product || product.deletedAt) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  }
  if (product.productType !== "ACCOUNT_GAME") {
    // Software has no inventory to list; saying so is more use than silently
    // writing rows nothing will ever read.
    return NextResponse.json(
      { error: "Chỉ tài khoản game mới có danh sách súng" },
      { status: 400 },
    );
  }

  const existing = await db.productSkin.findMany({
    where: { productId: product.id, kind: "WEAPON_SKIN" },
    select: { name: true, tier: true, iconUrl: true, weapon: true },
  });
  const known = new Map(existing.map((s) => [s.name.toLowerCase(), s]));

  await db.$transaction([
    db.productSkin.deleteMany({
      // Only the weapons. Buddies, agents, cards and sprays live in this table
      // too and this screen knows nothing about them.
      where: { productId: product.id, kind: "WEAPON_SKIN" },
    }),
    db.productSkin.createMany({
      data: names.map((name) => {
        const old = known.get(name.toLowerCase());
        return {
          productId: product.id,
          kind: "WEAPON_SKIN" as const,
          name,
          tier: old?.tier ?? null,
          iconUrl: old?.iconUrl ?? null,
          weapon: old?.weapon ?? null,
        };
      }),
    }),
  ]);

  return NextResponse.json({ ok: true, count: names.length });
}
