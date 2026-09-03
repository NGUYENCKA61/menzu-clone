import { NextResponse } from "next/server";

import { ensurePoolPackage, parseCredentialBlock } from "@/lib/accountPool";
import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { fillBackorders } from "@/lib/licenseKeys";
import { readKeyStore } from "@/lib/packageKeyStore";

/** One paste at a time; a list longer than this is two pastes. */
const MAX_PER_PASTE = 1000;

/**
 * The shelf of sign-ins behind an "acc random" listing.
 *
 * Same store the software keys live in — the listing's one package and its
 * licence keys — so reading, adding and removing here is the key desk's own
 * code with the words changed. See src/lib/accountPool.ts.
 */

async function poolProduct(code: string) {
  return db.product.findFirst({
    where: { code, deletedAt: null, productType: "ACCOUNT_GAME" },
    select: { id: true, price: true, accountPool: true },
  });
}

/** What is on the shelf, and what has gone out. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });
  const product = await poolProduct(code);
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const pkg = await db.productPackage.findFirst({
    where: { productId: product.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!pkg) return NextResponse.json({ available: 0, sold: 0, shelf: [], recent: [] });
  return NextResponse.json(await readKeyStore(pkg.id));
}

/** Sign-ins pasted in, one per line; duplicates are dropped quietly. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    block?: string;
  } | null;
  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await poolProduct(code);
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!product.accountPool) {
    return NextResponse.json(
      { error: "Bật \"Acc random\" cho sản phẩm này trước khi thêm kho" },
      { status: 400 },
    );
  }

  const values = parseCredentialBlock(body?.block ?? "");
  if (values.length === 0) {
    return NextResponse.json(
      { error: "Không đọc được cặp nào — mỗi dòng một cặp, dạng taikhoan|matkhau" },
      { status: 400 },
    );
  }
  if (values.length > MAX_PER_PASTE) {
    return NextResponse.json(
      { error: `Tối đa ${MAX_PER_PASTE} cặp mỗi lần dán` },
      { status: 400 },
    );
  }

  const packageId = await ensurePoolPackage(product.id, product.price);
  const result = await db.$transaction(async (tx) => {
    const created = await tx.licenseKey.createMany({
      data: values.map((value) => ({ packageId, value })),
      skipDuplicates: true,
    });
    // Orders paid while the shelf was empty are owed their sign-ins; the
    // key desk fills those the moment stock arrives, and so does this.
    const filled = await fillBackorders(tx, packageId);
    return { added: created.count, filled };
  });
  const available = await db.licenseKey.count({ where: { packageId, status: "AVAILABLE" } });

  return NextResponse.json({ ...result, available });
}

/** One sign-in off the shelf — a bad pair, or one given away elsewhere. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    keyId?: string;
  } | null;
  const code = body?.code?.trim();
  const keyId = body?.keyId?.trim();
  if (!code || !keyId) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const product = await poolProduct(code);
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Only an unsold one: a sign-in already handed to a buyer is theirs, and
  // the refund desk is the place that takes it back.
  const removed = await db.licenseKey.deleteMany({
    where: { id: keyId, status: "AVAILABLE", package: { productId: product.id } },
  });
  if (removed.count === 0) {
    return NextResponse.json({ error: "Không xoá được — cặp này đã giao hoặc không tồn tại" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
