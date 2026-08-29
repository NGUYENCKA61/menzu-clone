import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { fillBackorders, parseKeyBlock } from "@/lib/licenseKeys";

/** How many keys one paste may carry. A batch larger than this is a mistake. */
const MAX_PER_PASTE = 500;

/**
 * Stock a tier, one key per line.
 *
 * Adding keys is also what clears the tier's backlog: whoever paid while the
 * shelf was empty is served in the same transaction, oldest order first, so
 * the shop cannot restock and leave them waiting by forgetting a second step.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    packageId?: string;
    keys?: string;
    note?: string;
  } | null;

  const packageId = body?.packageId?.trim();
  if (!packageId) return NextResponse.json({ error: "Thiếu gói" }, { status: 400 });

  const values = parseKeyBlock(body?.keys ?? "");
  if (values.length === 0) {
    return NextResponse.json({ error: "Chưa nhập key nào" }, { status: 400 });
  }
  if (values.length > MAX_PER_PASTE) {
    return NextResponse.json(
      { error: `Mỗi lần dán tối đa ${MAX_PER_PASTE} key` },
      { status: 400 },
    );
  }

  const pkg = await db.productPackage.findUnique({
    where: { id: packageId },
    select: { id: true },
  });
  if (!pkg) return NextResponse.json({ error: "Không tìm thấy gói" }, { status: 404 });

  const note = body?.note?.trim() || null;

  const result = await db.$transaction(async (tx) => {
    // skipDuplicates leans on the (packageId, value) unique index: a key this
    // tier already holds is a paste that ran twice, not new stock, and the
    // whole batch should not fail because one line was already in.
    const created = await tx.licenseKey.createMany({
      data: values.map((value) => ({ packageId, value, note })),
      skipDuplicates: true,
    });

    const filled = await fillBackorders(tx, packageId);
    return { added: created.count, filled };
  });

  return NextResponse.json({
    added: result.added,
    skipped: values.length - result.added,
    deliveredKeys: result.filled.keys,
    deliveredOrders: result.filled.orders,
  });
}

/**
 * Take a key off the shelf.
 *
 * Only an unsold one. A delivered key is the receipt for what a buyer holds
 * and what it cost them; deleting it would erase the only record of when their
 * access expires. To withdraw a key that has already gone out, the shop revokes
 * it upstream — this table would be lying either way.
 */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const packageId = url.searchParams.get("packageId");

  // Delete by pasted values — the shop holding a list of compromised keys
  // should not have to hunt each one down in the shelf. Same discipline as
  // every other branch: only AVAILABLE rows go, and the answer says what
  // matched, what was already in a customer's hands, and what was never here.
  const body = (await request.json().catch(() => null)) as {
    packageId?: string;
    keys?: string;
  } | null;
  if (body?.packageId && typeof body.keys === "string") {
    const values = [
      ...new Set(
        body.keys
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    ];
    if (values.length === 0) {
      return NextResponse.json({ error: "Chưa nhập key nào" }, { status: 400 });
    }

    const matched = await db.licenseKey.findMany({
      where: { packageId: body.packageId, value: { in: values } },
      select: { value: true, status: true },
    });
    const gone = await db.licenseKey.deleteMany({
      where: {
        packageId: body.packageId,
        value: { in: values },
        status: "AVAILABLE",
      },
    });
    return NextResponse.json({
      ok: true,
      deleted: gone.count,
      // Matched but delivered: refused, and worth telling the shop about —
      // a key it wants gone that a customer is holding is a support case,
      // not a row.
      sold: matched.filter((k) => k.status === "SOLD").length,
      missing: values.length - matched.length,
    });
  }

  // The whole shelf at once. Only what is still AVAILABLE goes — a delivered
  // key is a customer's record, and this filter is what keeps a shelf-clear
  // from ever touching one. Orders left waiting keep waiting, exactly as they
  // do when the shelf simply runs out.
  if (!id && packageId) {
    const gone = await db.licenseKey.deleteMany({
      where: { packageId, status: "AVAILABLE" },
    });
    return NextResponse.json({ ok: true, deleted: gone.count });
  }

  if (!id) return NextResponse.json({ error: "Thiếu key" }, { status: 400 });

  const key = await db.licenseKey.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!key) return NextResponse.json({ error: "Không tìm thấy key" }, { status: 404 });
  if (key.status === "SOLD") {
    return NextResponse.json(
      { error: "Key đã giao cho khách, không xoá được" },
      { status: 409 },
    );
  }

  await db.licenseKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
