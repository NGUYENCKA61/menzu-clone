import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const STATUSES = ["UNDETECTED", "DETECTED", "UPDATING"] as const;
type SoftwareStatusValue = (typeof STATUSES)[number];

function readStatus(value: unknown): SoftwareStatusValue | undefined {
  return STATUSES.includes(value as SoftwareStatusValue)
    ? (value as SoftwareStatusValue)
    : undefined;
}

/**
 * Create a software product.
 *
 * Separate from the account route because almost nothing they ask for is the
 * same — a tool has a name and a detection state and no rank, and folding both
 * into one endpoint would have meant a body where half the fields are ignored
 * depending on a flag. The row they write is the same row; the forms are not.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    categorySlug?: string;
    name?: string;
    description?: string;
    status?: string;
    price?: number;
    imageUrl?: string;
    downloadUrl?: string;
  } | null;

  const code = body?.code?.trim().toUpperCase();
  const categorySlug = body?.categorySlug?.trim();
  const name = body?.name?.trim();
  const price = Number(body?.price ?? 0);

  if (!code) return NextResponse.json({ error: "Thiếu mã sản phẩm" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Thiếu tên phần mềm" }, { status: 400 });
  if (!categorySlug) return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });
  }

  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    return NextResponse.json({ error: "Danh mục không tồn tại" }, { status: 404 });
  }

  const clash = await db.product.findUnique({ where: { code } });
  if (clash && !clash.deletedAt) {
    return NextResponse.json({ error: "Mã này đã tồn tại" }, { status: 409 });
  }

  const data = {
    categoryId: category.id,
    productType: "SOFTWARE_GAME" as const,
    name,
    description: body?.description?.trim() || null,
    softwareStatus: readStatus(body?.status) ?? "UNDETECTED",
    price: BigInt(Math.floor(price)),
    oldPrice: BigInt(Math.floor(price)),
    status: "AVAILABLE" as const,
    imageUrl: body?.imageUrl?.trim() || null,
    downloadUrl: body?.downloadUrl?.trim() || null,
    // A tool has no rank. The column stays required for the accounts that do,
    // so software writes the empty string rather than a fake value that would
    // show up if anything ever printed it.
    rank: "",
    deletedAt: null,
  };

  if (clash?.deletedAt) {
    const revived = await db.product.update({ where: { code }, data });
    return NextResponse.json({ code: revived.code, revived: true });
  }

  const created = await db.product.create({ data: { code, ...data } });
  return NextResponse.json({ code: created.code });
}

/** Edit the fields that are software's own. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    name?: string;
    description?: string;
    softwareStatus?: string;
    status?: string;
    price?: number;
    downloadUrl?: string;
    videoUrl?: string;
    version?: string;
    platform?: string;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findFirst({
    where: { code, productType: "SOFTWARE_GAME" },
  });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const stockStatus = ["AVAILABLE", "HIDDEN"].includes(body?.status ?? "")
    ? (body!.status as "AVAILABLE" | "HIDDEN")
    : undefined;
  const price =
    body?.price !== undefined && Number.isFinite(Number(body.price)) && Number(body.price) > 0
      ? BigInt(Math.floor(Number(body.price)))
      : undefined;

  await db.product.update({
    where: { code },
    data: {
      ...(body?.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body?.description !== undefined
        ? { description: body.description.trim() || null }
        : {}),
      ...(readStatus(body?.softwareStatus)
        ? { softwareStatus: readStatus(body?.softwareStatus) }
        : {}),
      ...(stockStatus ? { status: stockStatus } : {}),
      ...(price !== undefined ? { price } : {}),
      // Sent as "" to clear it, which is how the admin removes a dead link and
      // takes the button off the card.
      ...(body?.downloadUrl !== undefined
        ? { downloadUrl: body.downloadUrl.trim() || null }
        : {}),
      // Stored as pasted. Validation happens where it renders, so a link that
      // is not YouTube falls the frame back to the picture rather than being
      // silently dropped here and leaving the admin wondering what they typed.
      ...(body?.videoUrl !== undefined ? { videoUrl: body.videoUrl.trim() || null } : {}),
      ...(body?.version !== undefined ? { version: body.version.trim() || null } : {}),
      ...(body?.platform !== undefined ? { platform: body.platform.trim() || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
