import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { hashPassword, validateCredentials } from "@/lib/auth";
import { db } from "@/lib/db";

function makeCode(prefix: string): string {
  return `${prefix}${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Admin actions on a customer account: block, grant or revoke admin, adjust
 * the balance, or delete.
 *
 * Every branch refuses to act on the caller's own account. Admin is granted
 * only from the server side, so an admin who blocks, demotes or deletes
 * themselves locks everyone out of this screen with no way back through the
 * UI.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    action?: string;
    blocked?: boolean;
    reason?: string;
    role?: string;
    /** Signed: negative subtracts. */
    delta?: number;
    note?: string;
    email?: string;
    password?: string;
    tier?: string;
  } | null;

  const username = body?.username?.trim();
  if (!username) return NextResponse.json({ error: "Thiếu tên đăng nhập" }, { status: 400 });

  const target = await db.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  if (target.id === admin.id) {
    return NextResponse.json(
      { error: "Không thể tự thao tác trên tài khoản của mình" },
      { status: 400 },
    );
  }

  const action = body?.action ?? "block";

  // --- grant / revoke admin ------------------------------------------------
  if (action === "role") {
    const role = body?.role === "ADMIN" ? "ADMIN" : "MEMBER";
    if (role === "ADMIN" && target.blockedAt) {
      return NextResponse.json(
        { error: "Mở khóa tài khoản trước khi cấp quyền quản trị" },
        { status: 400 },
      );
    }
    const updated = await db.user.update({
      where: { id: target.id },
      data: { role },
    });
    return NextResponse.json({ username: updated.username, role: updated.role });
  }

  // --- member tier ---------------------------------------------------------
  if (action === "tier") {
    const allowed = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;
    type Tier = (typeof allowed)[number];
    if (!allowed.includes(body?.tier as Tier)) {
      return NextResponse.json({ error: "Hạng không hợp lệ" }, { status: 400 });
    }
    // Set by hand. What earns a tier is the shop's own rule and has not been
    // stated, so nothing here promotes anyone automatically.
    const updated = await db.user.update({
      where: { id: target.id },
      data: { tier: body?.tier as Tier },
    });
    return NextResponse.json({ username: updated.username, tier: updated.tier });
  }

  // --- edit profile: email -------------------------------------------------
  if (action === "email") {
    const email = body?.email?.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
    }
    if (email) {
      const clash = await db.user.findFirst({ where: { email, NOT: { id: target.id } } });
      if (clash) {
        return NextResponse.json({ error: "Email đã được tài khoản khác dùng" }, { status: 409 });
      }
    }
    const updated = await db.user.update({ where: { id: target.id }, data: { email } });
    return NextResponse.json({ username: updated.username, email: updated.email });
  }

  // --- reset password ------------------------------------------------------
  if (action === "password") {
    const password = body?.password ?? "";
    const invalid = validateCredentials(target.username, password);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    await db.user.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(password) },
    });
    // Every session dies with the old password. Leaving them alive would
    // mean a reset prompted by a suspected takeover changes nothing for
    // whoever is already signed in.
    await db.session.deleteMany({ where: { userId: target.id } });
    return NextResponse.json({ username: target.username, passwordReset: true });
  }

  // --- adjust balance ------------------------------------------------------
  if (action === "balance") {
    const raw = Number(body?.delta ?? 0);
    if (!Number.isFinite(raw) || raw === 0) {
      return NextResponse.json({ error: "Số tiền điều chỉnh không hợp lệ" }, { status: 400 });
    }
    const delta = BigInt(Math.trunc(raw));

    // The balance and its ledger row are written together. Moving money
    // without the matching Transaction is the one thing the purchase path was
    // built to prevent, and an admin tool is no reason to make an exception.
    const result = await db.$transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id: target.id } });
      const balanceAfter = current.balance + delta;
      if (balanceAfter < 0n) throw new Error("NEGATIVE");

      await tx.user.update({ where: { id: target.id }, data: { balance: balanceAfter } });
      await tx.transaction.create({
        data: {
          code: makeCode("AD"),
          userId: target.id,
          kind: "ADJUSTMENT",
          status: "SUCCESS",
          delta,
          balanceAfter,
          // Named so the customer sees why their balance moved, not a silent
          // change they cannot account for.
          description: body?.note?.trim() || "Điều chỉnh số dư bởi quản trị viên",
          method: `Admin: ${admin.username}`,
        },
      });
      return balanceAfter;
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "NEGATIVE") return null;
      throw error;
    });

    if (result === null) {
      return NextResponse.json({ error: "Số dư không thể xuống dưới 0" }, { status: 400 });
    }
    return NextResponse.json({ username: target.username, balance: Number(result) });
  }

  // --- delete --------------------------------------------------------------
  if (action === "delete") {
    // Orders, transactions, top-ups and service orders do not cascade, and
    // that is deliberate: they are the shop's own sales records. Deleting the
    // customer would take the history of what was sold with them.
    const [orders, transactions, topUps, serviceOrders] = await Promise.all([
      db.order.count({ where: { userId: target.id } }),
      db.transaction.count({ where: { userId: target.id } }),
      db.topUp.count({ where: { userId: target.id } }),
      db.serviceOrder.count({ where: { userId: target.id } }),
    ]);
    const history = orders + transactions + topUps + serviceOrders;

    if (history > 0) {
      return NextResponse.json(
        {
          error:
            `Tài khoản có ${orders} đơn hàng, ${transactions} giao dịch, ` +
            `${topUps} lượt nạp và ${serviceOrders} đơn dịch vụ. Xóa sẽ mất lịch sử ` +
            `bán hàng của shop — hãy khóa tài khoản thay vì xóa.`,
        },
        { status: 409 },
      );
    }

    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Không thể xóa tài khoản quản trị" }, { status: 400 });
    }

    await db.user.delete({ where: { id: target.id } });
    return NextResponse.json({ deleted: target.username });
  }

  // --- block / unblock (default) -------------------------------------------
  if (target.role === "ADMIN" && body?.blocked) {
    return NextResponse.json({ error: "Không thể khóa tài khoản quản trị" }, { status: 400 });
  }

  const blocked = Boolean(body?.blocked);
  const updated = await db.user.update({
    where: { id: target.id },
    data: {
      blockedAt: blocked ? new Date() : null,
      blockedReason: blocked ? (body?.reason?.trim() || null) : null,
    },
  });

  if (blocked) {
    await db.session.deleteMany({ where: { userId: target.id } });
  }

  return NextResponse.json({
    username: updated.username,
    blocked: updated.blockedAt !== null,
  });
}
