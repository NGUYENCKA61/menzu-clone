import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Enough for a thorough tour of an inventory; low enough that holding the
 * upload button cannot write a hundred rows.
 */
const MAX_GALLERY = 12;

/**
 * Add one extra screenshot to an account.
 *
 * Takes a path, not a file: the picture goes through /api/admin/products/image
 * first — same checks, same folder — and this route only records that the
 * account shows it. Restricting to that uploader's folder is what keeps a
 * pasted remote URL out of the gallery: every slide is a file this server
 * holds, so no card ever depends on someone else's host staying up.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    url?: string;
  } | null;

  const code = body?.code?.trim();
  const url = body?.url?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  if (!url || !url.startsWith("/uploads/accounts/") || url.includes("..")) {
    return NextResponse.json(
      { error: "Ảnh phụ phải được tải lên qua nút Chọn từ máy" },
      { status: 400 },
    );
  }

  const product = await db.product.findUnique({
    where: { code },
    select: { id: true, productType: true, deletedAt: true, _count: { select: { images: true } } },
  });
  if (!product || product.deletedAt || product.productType !== "ACCOUNT_GAME") {
    return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  }
  if (product._count.images >= MAX_GALLERY) {
    return NextResponse.json(
      { error: `Tối đa ${MAX_GALLERY} ảnh phụ một tài khoản` },
      { status: 400 },
    );
  }

  const row = await db.productImage.create({
    data: { productId: product.id, url, sortOrder: product._count.images },
  });
  return NextResponse.json({ id: row.id, url: row.url });
}

/** Take one screenshot off an account. The file stays, as everywhere here. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id ảnh" }, { status: 400 });

  const row = await db.productImage.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });

  await db.productImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
