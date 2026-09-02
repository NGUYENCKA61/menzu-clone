import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  MIN_SLICES,
  readExchangePoints,
  readVoucherDays,
  readWheel,
  type Prize,
} from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";

/**
 * Writes the whole table, whatever the caller was changing.
 *
 * The rules worth having are about the table as a whole — how many slices
 * there are, whether two share an id, how wide a label may be given the count
 * — so every write goes through the same check on the same complete list. A
 * per-row route could accept each row on its own and still leave a wheel that
 * cannot be drawn.
 *
 * Rows are replaced rather than merged: a slice the shop deleted has to
 * actually leave, and `SpinWin` keeps its own copy of what was promised, so
 * nothing a customer already won depends on this table still holding the row.
 */
async function writeWheel(
  prizes: (Prize & { exchangePoints?: unknown; voucherDays?: unknown })[],
) {
  await db.$transaction([
    db.spinPrize.deleteMany({}),
    db.spinPrize.createMany({
      data: prizes.map((prize, index) => ({
        id: prize.id,
        label: prize.label,
        short: prize.short,
        description: prize.description ?? null,
        kind: prize.kind,
        amount: prize.amount,
        image: prize.image ?? null,
        weight: prize.weight,
        color: prize.color ?? null,
        exchangePoints: readExchangePoints(prize.exchangePoints, prize.kind),
        voucherDays:
          prize.kind === "VOUCHER" ? readVoucherDays(prize.voucherDays) : null,
        // Wheel order is list order. Stored rather than inferred so the
        // picture does not rearrange itself when a slice is renamed.
        sortOrder: index,
        active: true,
      })),
    }),
  ]);
}

/** The whole wheel at once — reordering, and the first save from the list. */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    prizes?: unknown;
  } | null;

  const read = readWheel(body?.prizes);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  await writeWheel(withOffers(read.prizes, body?.prizes));
  return NextResponse.json({ ok: true });
}

/**
 * Puts each slice's exchange offer back, matched by id.
 *
 * `readWheel` returns only the fields it checks, which is what makes it worth
 * having — but the offer is not one of them, and dropping it here would empty
 * the column on every save.
 */
function withOffers(
  prizes: Prize[],
  sent: unknown,
): (Prize & { exchangePoints?: unknown; voucherDays?: unknown })[] {
  const by = new Map<string, { exchangePoints?: unknown; voucherDays?: unknown }>();
  for (const raw of Array.isArray(sent) ? sent : []) {
    const row = raw as {
      id?: unknown;
      exchangePoints?: unknown;
      voucherDays?: unknown;
    };
    if (typeof row?.id === "string") {
      by.set(row.id.trim().toLowerCase(), {
        exchangePoints: row.exchangePoints,
        voucherDays: row.voucherDays,
      });
    }
  }
  return prizes.map((p) => ({ ...p, ...(by.get(p.id) ?? {}) }));
}

/**
 * One slice, from its own page.
 *
 * The rest of the table comes from the database — or, while the shop is still
 * on the defaults, from the code. Either way the first edit materialises the
 * whole wheel, which is the moment "the shop has set this up" becomes true:
 * saving one slice against a table nobody has stored would leave eight
 * phantom slices with nowhere to live.
 *
 * `was` is the id the page opened, so renaming a slice moves it rather than
 * adding a second one beside the original.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    was?: string;
    prize?: unknown;
  } | null;

  const was = body?.was?.trim();
  if (!was) {
    return NextResponse.json({ error: "Thiếu mã phần quà" }, { status: 400 });
  }

  const current = await listSpinPrizes();
  const at = current.findIndex((p) => p.id === was);
  // Not found means "new": the page adds one by saving an id nothing holds.
  const next =
    at === -1
      ? [...current, body?.prize]
      : current.map((p, i) => (i === at ? body?.prize : p));

  const read = readWheel(next);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  await writeWheel(withOffers(read.prizes, next));
  return NextResponse.json({ ok: true });
}

/**
 * One slice off the wheel, or the whole table back to the code's.
 *
 * No id at all is the reset: emptying the row set is what "not set up" means
 * to the loader, so a shop that has made a mess of its wheel has a way back to
 * the one that worked without retyping nine slices from memory.
 */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();

  if (!id) {
    await db.spinPrize.deleteMany({});
    return NextResponse.json({ ok: true });
  }

  const current = await listSpinPrizes();
  if (!current.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Không tìm thấy phần quà" }, { status: 404 });
  }
  if (current.length <= MIN_SLICES) {
    return NextResponse.json(
      { error: `Vòng quay phải còn ít nhất ${MIN_SLICES} ô.` },
      { status: 400 },
    );
  }

  await writeWheel(current.filter((p) => p.id !== id));
  return NextResponse.json({ ok: true });
}
