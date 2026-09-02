import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { readDelivery } from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";

/**
 * What the winner decided about a parcel they won.
 *
 * Two answers, and they are the whole feature: send it, which needs somewhere
 * to send it to, or take points instead, which needs the shop to have said
 * what the thing is worth in points. Neither is offered before the wheel
 * stops — an address collected from every customer to serve the few who win a
 * mousepad is a database of home addresses the shop did not need.
 *
 * A win can only be answered once. Both branches claim the row by its PENDING
 * state inside the transaction, so a double-tap cannot credit the points twice
 * or turn a posted parcel back into points.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    action?: string;
    recipient?: string;
    phone?: string;
    address?: string;
    note?: string;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã lượt trúng" }, { status: 400 });

  // Scoped to this winner: somebody else's win answers 404 rather than
  // confirming it exists.
  const win = await db.spinWin.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true, prizeId: true, label: true },
  });
  if (!win) {
    return NextResponse.json({ error: "Không tìm thấy lượt trúng" }, { status: 404 });
  }
  if (win.status !== "PENDING") {
    return NextResponse.json(
      { error: "Phần quà này đã được xử lý rồi." },
      { status: 400 },
    );
  }

  if (body?.action === "exchange") {
    // Read from the wheel as it stands: the shop sets what its own parcel is
    // worth in points, and a figure invented here would be a promise nobody
    // made. A prize since taken off the wheel simply has no offer.
    const prize = (await listSpinPrizes()).find((p) => p.id === win.prizeId);
    const points = prize?.exchangePoints ?? 0;
    if (points <= 0) {
      return NextResponse.json(
        { error: "Phần quà này không đổi được điểm — shop sẽ gửi tận nơi." },
        { status: 400 },
      );
    }

    await db.$transaction(async (tx) => {
      const claimed = await tx.spinWin.updateMany({
        where: { id: win.id, status: "PENDING" },
        data: { status: "EXCHANGED", pointsBack: points },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");

      // Incremented by the database rather than computed from a figure read a
      // moment ago, so a spin settling at the same instant is not lost.
      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: points } },
      });
    });

    return NextResponse.json({ ok: true, points });
  }

  const read = readDelivery(body);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  // Still PENDING: the shop has an address now, and posting it is what moves
  // it to SENT. Filling the form in is not the same as receiving the parcel.
  const claimed = await db.spinWin.updateMany({
    where: { id: win.id, status: "PENDING" },
    data: read.delivery,
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "Phần quà này vừa được xử lý ở nơi khác." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
