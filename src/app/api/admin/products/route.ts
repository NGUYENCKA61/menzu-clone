import { NextResponse } from "next/server";

import { parseLoginInput } from "@/lib/accountLogin";
import { ensurePoolPackage } from "@/lib/accountPool";
import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { docHtmlIsEmpty, isHtmlBody, sanitizeDocHtml } from "@/lib/docHtml";
import { uniqueProductSlug } from "@/lib/routes";

/** Create a product. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    categorySlug?: string;
    rank?: string;
    /** Optional display name; the card falls back to rank/skins without one. */
    name?: string;
    price?: number;
    oldPrice?: number;
    level?: number;
    imageUrl?: string;
    /** Optional write-up typed at creation; sanitised like every rich body. */
    description?: string;
    /** The account's sign-in, if the shop has it to hand already. Both or
     *  neither; it can equally be typed later on the account's own page. */
    loginUsername?: string;
    loginPassword?: string;
    loginNote?: string;
  } | null;

  const code = body?.code?.trim().toUpperCase();
  const categorySlug = body?.categorySlug?.trim();
  const price = Number(body?.price ?? 0);
  const oldPrice = Number(body?.oldPrice ?? price);

  if (!code) return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  if (!categorySlug) {
    return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Giá bán không hợp lệ" }, { status: 400 });
  }
  if (oldPrice < price) {
    return NextResponse.json(
      { error: "Giá gốc phải lớn hơn hoặc bằng giá bán" },
      { status: 400 },
    );
  }

  const login = parseLoginInput(body);
  if (login.kind === "invalid") {
    return NextResponse.json({ error: login.error }, { status: 400 });
  }
  // Untouched and cleared land the same three nulls on a new row.
  const loginColumns = login.kind === "set" ? login.value : {};

  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    return NextResponse.json({ error: "Danh mục không tồn tại" }, { status: 404 });
  }

  const clash = await db.product.findUnique({ where: { code } });
  if (clash && !clash.deletedAt) {
    return NextResponse.json({ error: "Mã tài khoản đã tồn tại" }, { status: 409 });
  }
  if (clash?.deletedAt) {
    // The code is held by a removed product the admin cannot see, so refusing
    // here would be a dead end: the screen shows no such account, yet the code
    // is refused as taken. Re-adding it brings that row back carrying the
    // values just typed, which keeps its order history attached.
    const revived = await db.product.update({
      where: { code },
      data: {
        deletedAt: null,
        categoryId: category.id,
        rank: body?.rank?.trim() || "",
        name: body?.name?.trim() || null,
        price: BigInt(Math.floor(price)),
        oldPrice: BigInt(Math.floor(oldPrice)),
        status: "AVAILABLE",
        // The old row's sign-in is what its last buyer was handed. Whatever
        // was typed now replaces it, and typing nothing clears it: an account
        // coming back on the shelf must not carry the credentials it left with.
        loginUsername: null,
        loginPassword: null,
        loginNote: null,
        ...loginColumns,
      },
    });
    return NextResponse.json({ code: revived.code, revived: true });
  }

  // An account has no name, but its address should still say what it is:
  // "acc-gold-1-vlr9999" tells a search engine and a customer something,
  // where the bare lowercased code told neither anything. No rank typed
  // stores a blank - every screen simply leaves the stat out - and the
  // address falls back to "acc-{code}" until a real rank upgrades it.
  const rankValue = body?.rank?.trim() || "";
  const nameValue = body?.name?.trim() || null;

  // Same cage the PATCH runs it through; a blank stays null.
  let createDescription: string | null = null;
  if (body?.description?.trim()) {
    const value = body.description.trim();
    if (!isHtmlBody(value)) createDescription = value;
    else {
      const clean = sanitizeDocHtml(value);
      createDescription = docHtmlIsEmpty(clean) ? null : clean;
    }
  }

  const taken = await db.product.findMany({ select: { slug: true } });
  const product = await db.product.create({
    data: {
      code,
      slug: uniqueProductSlug(
        // A named account is addressed by its name; a nameless one by rank
        // and code, as before.
        (nameValue ? `${nameValue} ${code}` : `Acc ${rankValue} ${code}`).replace(
          /\s+/g,
          " ",
        ),
        code,
        taken.map((p) => p.slug),
      ),
      name: nameValue,
      categoryId: category.id,
      rank: rankValue,
      description: createDescription,
      level: Number(body?.level ?? 0) || 0,
      price: BigInt(Math.floor(price)),
      oldPrice: BigInt(Math.floor(oldPrice)),
      imageUrl:
        body?.imageUrl?.trim() ||
        `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${code}.webp`,
      ...loginColumns,
    },
  });

  return NextResponse.json({ code: product.code });
}

/**
 * Remove a product.
 *
 * Two removals, and which one runs is decided by the data rather than offered
 * as a choice — an admin should not have to know the shape of the schema to
 * take an account off the shelf.
 *
 * Nothing has ordered it: the row goes, which also frees its code for reuse.
 * Something has: the row is marked removed instead. `Order.productId` is
 * required and the relation restricts, so the database refuses a real delete
 * the moment an account has sold once; and forcing it past that would strip
 * the code, rank and picture off every past order, because the order row keeps
 * only the money and reads the rest back through this join.
 *
 * Either way the product leaves every listing. The difference is only whether
 * it can be brought back.
 */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findUnique({
    where: { code },
    include: { _count: { select: { orders: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  if (product.deletedAt) {
    return NextResponse.json({ error: "Sản phẩm đã bị xoá rồi" }, { status: 409 });
  }

  if (product._count.orders === 0) {
    await db.product.delete({ where: { code } });
    return NextResponse.json({ ok: true, mode: "hard" });
  }

  await db.product.update({ where: { code }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true, mode: "soft", orders: product._count.orders });
}

/** Undo a soft delete, putting the product back exactly as it was. */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findUnique({ where: { code } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!product.deletedAt) {
    return NextResponse.json({ error: "Sản phẩm đang hiển thị" }, { status: 409 });
  }

  // Status is left alone: it is restored to whatever it was when removed, so
  // an account that was hidden comes back hidden rather than back on sale.
  await db.product.update({ where: { code }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
}

/** Update status — the safe way to retire a product that already has orders. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    status?: string;
    price?: number;
    imageUrl?: string;
    tag?: string;
    vip?: number;
    vipIngame?: number;
    /** Rich-editor HTML, caged to the sanctioned tags before it lands. */
    description?: string;
    rank?: string;
    /** Display name; empty clears it and the card falls back to rank/skins. */
    name?: string;
    /** The sign-in handed to the buyer. Both or neither; both empty clears. */
    loginUsername?: string;
    loginPassword?: string;
    loginNote?: string;
    /** "Acc random": sold by the piece from a shelf of sign-ins. */
    accountPool?: boolean;
  } | null;

  const code = body?.code;
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const login = parseLoginInput(body);
  if (login.kind === "invalid") {
    return NextResponse.json({ error: login.error }, { status: 400 });
  }

  const allowed = ["AVAILABLE", "RESERVED", "SOLD", "HIDDEN"] as const;
  type Status = (typeof allowed)[number];
  const status = allowed.includes(body?.status as Status)
    ? (body?.status as Status)
    : undefined;

  const price =
    body?.price !== undefined && Number.isFinite(Number(body.price))
      ? BigInt(Math.floor(Number(body.price)))
      : undefined;

  // Empty string means "back to the default picture": the storefront falls
  // back to the by-code path when this is null, so clearing is a real state
  // and not an error.
  const imageUrl =
    body?.imageUrl !== undefined ? body.imageUrl.trim() || null : undefined;

  // Same shape for the card's corner pill — "DROP MAIL". Empty clears it.
  const tag = body?.tag !== undefined ? body.tag.trim() || null : undefined;
  if (tag && tag.length > 30) {
    return NextResponse.json({ error: "Tag tối đa 30 ký tự" }, { status: 400 });
  }

  // The strip's two labelled numbers, stored in the vip/vipIngame columns. Zero is a
  // real value — it is how the shop takes an entry off the card.
  const readCount = (value: number | undefined) => {
    if (value === undefined) return undefined;
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
  };
  const vip = readCount(body?.vip);
  const vipIngame = readCount(body?.vipIngame);

  // Same cage the software description passes through: HTML is sanitised, an
  // empty document stores as null so the storefront section disappears rather
  // than rendering a blank block.
  let description: string | null | undefined;
  if (body?.description !== undefined) {
    const value = body.description.trim();
    if (!value) description = null;
    else if (!isHtmlBody(value)) description = value;
    else {
      const clean = sanitizeDocHtml(value);
      description = docHtmlIsEmpty(clean) ? null : clean;
    }
  }
  if (vip === null || vipIngame === null) {
    return NextResponse.json({ error: "Chỉ số VIP không hợp lệ" }, { status: 400 });
  }

  if (
    !status &&
    price === undefined &&
    imageUrl === undefined &&
    tag === undefined &&
    vip === undefined &&
    vipIngame === undefined &&
    description === undefined &&
    body?.rank === undefined &&
    body?.name === undefined &&
    body?.accountPool === undefined &&
    login.kind === "untouched"
  ) {
    return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { code } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // A tool hands out keys; the columns exist on its row only because the two
  // types share a table. Writing them there would put a sign-in nothing ever
  // reads on a product, and a "pending" that nothing could ever clear.
  if (login.kind === "set" && product.productType !== "ACCOUNT_GAME") {
    return NextResponse.json(
      { error: "Phần mềm giao key, không có tài khoản đăng nhập" },
      { status: 400 },
    );
  }

  // Rank rides the price-and-status save. When the account still wears the
  // "acc-unknown-…" address it was born with (created before a rank was
  // known), the address is upgraded to carry the real rank — an address
  // nobody has been given yet is not yet a promise. One the shop has edited,
  // or one already carrying a rank, stays put.
  const rank = body?.rank !== undefined ? body.rank.trim() : undefined;
  const name = body?.name !== undefined ? body.name.trim() || null : undefined;
  let slug: string | undefined;
  if (rank && rank !== product.rank) {
    // Three born shapes: blank is today's placeholder, "Unknown" and
    // "Unranked" the ones rows from the two earlier defaults still wear.
    const bornWith = ["", "Unknown", "Unranked"].map((placeholder) =>
      uniqueProductSlug(`Acc ${placeholder} ${product.code}`.replace(/\s+/g, " "), product.code, []),
    );
    if (bornWith.includes(product.slug)) {
      const taken = await db.product.findMany({ select: { slug: true } });
      slug = uniqueProductSlug(
        `Acc ${rank} ${product.code}`,
        product.code,
        taken.filter((p) => p.slug !== product.slug).map((p) => p.slug),
      );
    }
  }

  await db.product.update({
    where: { code },
    data: {
      ...(status ? { status } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(vip !== undefined ? { vip } : {}),
      ...(vipIngame !== undefined ? { vipIngame } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(rank !== undefined ? { rank } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(typeof body?.accountPool === "boolean" ? { accountPool: body.accountPool } : {}),
      ...(login.kind === "set" ? login.value : {}),
    },
  });

  // A random listing's shelf is its one package, made the moment the flag
  // goes on and kept at the listing's price whenever that moves.
  if (body?.accountPool === true || (product.accountPool && price !== undefined)) {
    await ensurePoolPackage(product.id, price ?? product.price);
  }

  // Tags are rows, not a column, and the card only reads the first — so
  // "set the tag" is spelled replace-all: clear what is there, write the one
  // given. Kept outside the update above because a tag-only PATCH is the
  // common call and must not trip the "no change" guard on products.
  if (tag !== undefined) {
    await db.$transaction([
      db.productTag.deleteMany({ where: { productId: product.id } }),
      ...(tag
        ? [db.productTag.create({ data: { productId: product.id, label: tag } })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true });
}
