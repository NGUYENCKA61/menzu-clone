/**
 * Moving money in and out of a wallet.
 *
 * The arithmetic belongs to the database, not to Node. Reading a balance and
 * writing `read − price` a few statements later is a race: two purchases that
 * both read 100.000đ each write "100.000 − price", and one of the two debits
 * disappears. Wrapping them in a transaction does not help by itself — inside
 * a Postgres transaction at READ COMMITTED the earlier read holds no lock, so
 * both readers still see the same figure.
 *
 * So every mover here writes with `increment`/`decrement`, and the debit's
 * guard rides on the same statement as the write: only a row that still holds
 * enough is matched, which means an overdraft cannot be written even when two
 * debits land at the same instant. The figure read back afterwards is the
 * balance as written — the row is locked by our own update until the
 * transaction ends — and that is what the ledger has to record.
 */

import type { Prisma } from "@prisma/client";

/** The part of a Prisma client a transaction hands its callback. */
type Tx = Prisma.TransactionClient;

/** The balance after the write, or null when the wallet was short. */
export async function debitWallet(
  tx: Tx,
  userId: string,
  amount: bigint,
): Promise<bigint | null> {
  if (amount < 0n) throw new Error("debitWallet: amount must not be negative");

  const moved = await tx.user.updateMany({
    // The guard and the subtraction are one statement, so nothing can slip
    // between "there is enough" and "take it".
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (moved.count === 0) return null;

  return balanceOf(tx, userId);
}

/** The balance after the credit. */
export async function creditWallet(
  tx: Tx,
  userId: string,
  amount: bigint,
): Promise<bigint> {
  if (amount < 0n) throw new Error("creditWallet: amount must not be negative");

  const after = await tx.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
    select: { balance: true },
  });
  return after.balance;
}

/**
 * An admin's signed adjustment. Null means the change would have taken the
 * wallet below zero, and nothing was written.
 */
export async function adjustWallet(
  tx: Tx,
  userId: string,
  delta: bigint,
): Promise<bigint | null> {
  return delta < 0n
    ? debitWallet(tx, userId, -delta)
    : creditWallet(tx, userId, delta);
}

/** The wallet as it stands, read inside the caller's transaction. */
export async function balanceOf(tx: Tx, userId: string): Promise<bigint> {
  const row = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { balance: true },
  });
  return row.balance;
}
