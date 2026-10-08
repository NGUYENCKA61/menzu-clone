import "server-only";

import type { Prisma } from "@prisma/client";

import {
  currentOrderIdOf,
  hasLoginToTake,
  loginHandover,
  type LoginHandover,
} from "@/lib/accountLogin";
import { db } from "@/lib/db";

/**
 * "Lấy thông tin": a buyer who has confirmed they are recording the screen
 * takes their account's sign-in (the owner, 08/10/2026, after menzu's "Nhận
 * thông tin đăng nhập"). One door for the receipt's route and the Telegram
 * bot's button, so both stamp the same moment under the same rule.
 */

/** What an account order's sign-in state is read from. */
export const LOGIN_ORDER_SELECT = {
  id: true,
  code: true,
  status: true,
  loginRevealedAt: true,
  licenseKeys: { orderBy: { deliveredAt: "asc" }, select: { value: true } },
  product: {
    select: {
      name: true,
      code: true,
      productType: true,
      accountPool: true,
      loginUsername: true,
      loginPassword: true,
      loginNote: true,
      orders: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  },
} satisfies Prisma.OrderSelect;

export type LoginOrder = Prisma.OrderGetPayload<{ select: typeof LOGIN_ORDER_SELECT }>;

/**
 * Where an order's sign-in stands for its buyer: the handover before gating,
 * whether there is anything to take at all, and whether it still waits
 * behind "Lấy thông tin".
 */
export function loginStanding(order: LoginOrder): {
  handover: LoginHandover;
  toTake: boolean;
  locked: boolean;
} {
  const handover = loginHandover(order, {
    ...order.product,
    currentOrderId: currentOrderIdOf(order.product),
  });
  const toTake = hasLoginToTake(order, order.product, order.licenseKeys.length, handover);
  return { handover, toTake, locked: toTake && order.loginRevealedAt === null };
}

/**
 * What stands between an account order and a warranty report: a sign-in not
 * taken yet ("locked"), one the shop has not typed yet ("pending"), or
 * nothing (null), which is also every tool's answer.
 */
export function signInHold(order: LoginOrder): "locked" | "pending" | null {
  const standing = loginStanding(order);
  if (standing.locked) return "locked";
  if (standing.handover.state === "pending") return "pending";
  return null;
}

/** The buyer's own order, by code, with what its sign-in state needs. */
export function findLoginOrder(userId: string, code: string): Promise<LoginOrder | null> {
  return db.order.findFirst({ where: { code, userId }, select: LOGIN_ORDER_SELECT });
}

export type TakeLogin =
  | { ok: true; order: LoginOrder; revealedAt: Date }
  | { ok: false; status: 404 | 409; error: string };

/**
 * Take the sign-in of the buyer's own paid account order. Stamps the moment
 * the first time, which the shop reads on a warranty claim; a second take,
 * or two at once, keeps the earlier stamp.
 */
export async function takeLogin(userId: string, code: string): Promise<TakeLogin> {
  const order = await findLoginOrder(userId, code);
  if (!order) return { ok: false, status: 404, error: "Không tìm thấy đơn" };
  if (!loginStanding(order).toTake) {
    return { ok: false, status: 409, error: "Đơn này không có thông tin đăng nhập để nhận" };
  }
  if (order.loginRevealedAt === null) {
    await db.order.updateMany({
      where: { id: order.id, loginRevealedAt: null },
      data: { loginRevealedAt: new Date() },
    });
  }
  const after = await db.order.findUnique({
    where: { id: order.id },
    select: { loginRevealedAt: true },
  });
  const revealedAt = after?.loginRevealedAt ?? new Date();
  return { ok: true, order: { ...order, loginRevealedAt: revealedAt }, revealedAt };
}
