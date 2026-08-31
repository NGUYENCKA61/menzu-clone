import { describe, expect, it } from "vitest";

import { adjustWallet, creditWallet, debitWallet } from "@/lib/wallet";

/**
 * A stand-in for the transaction client that records what was asked of the
 * database. The point of these tests is the SHAPE of the statements: the
 * subtraction has to be the database's (`decrement`) and it has to carry its
 * own guard, because that pairing is the whole reason a concurrent purchase
 * cannot erase another one's debit.
 */
function fakeTx(options: { updated?: number; balance?: bigint } = {}) {
  const calls: { method: string; args: Record<string, unknown> }[] = [];
  const balance = options.balance ?? 0n;
  return {
    calls,
    user: {
      updateMany(args: Record<string, unknown>) {
        calls.push({ method: "updateMany", args });
        return Promise.resolve({ count: options.updated ?? 1 });
      },
      update(args: Record<string, unknown>) {
        calls.push({ method: "update", args });
        return Promise.resolve({ balance });
      },
      findUniqueOrThrow(args: Record<string, unknown>) {
        calls.push({ method: "findUniqueOrThrow", args });
        return Promise.resolve({ balance });
      },
    },
  };
}

// The helpers only ever touch tx.user, so a stub of that one model is a
// faithful stand-in; the cast keeps the test honest about that.
const asTx = (tx: ReturnType<typeof fakeTx>) =>
  tx as unknown as Parameters<typeof debitWallet>[0];

describe("debitWallet", () => {
  it("subtracts in the database, guarded by the balance it needs", async () => {
    const tx = fakeTx({ updated: 1, balance: 50_000n });
    const after = await debitWallet(asTx(tx), "u1", 30_000n);

    expect(after).toBe(50_000n);
    const write = tx.calls[0]!;
    expect(write.method).toBe("updateMany");
    expect(write.args).toEqual({
      where: { id: "u1", balance: { gte: 30_000n } },
      data: { balance: { decrement: 30_000n } },
    });
  });

  it("reports a short wallet without writing anything else", async () => {
    const tx = fakeTx({ updated: 0 });
    expect(await debitWallet(asTx(tx), "u1", 30_000n)).toBeNull();
    // One statement, and it changed nothing: no read-back, no second write.
    expect(tx.calls).toHaveLength(1);
  });

  it("takes a zero charge — a fully discounted order still goes through", async () => {
    const tx = fakeTx({ updated: 1, balance: 0n });
    expect(await debitWallet(asTx(tx), "u1", 0n)).toBe(0n);
  });

  it("refuses a negative charge rather than quietly crediting", async () => {
    await expect(debitWallet(asTx(fakeTx()), "u1", -1n)).rejects.toThrow();
  });
});

describe("creditWallet", () => {
  it("adds in the database and answers with the balance as written", async () => {
    const tx = fakeTx({ balance: 150_000n });
    expect(await creditWallet(asTx(tx), "u1", 50_000n)).toBe(150_000n);
    expect(tx.calls[0]!.args).toEqual({
      where: { id: "u1" },
      data: { balance: { increment: 50_000n } },
      select: { balance: true },
    });
  });

  it("refuses a negative credit", async () => {
    await expect(creditWallet(asTx(fakeTx()), "u1", -1n)).rejects.toThrow();
  });
});

describe("adjustWallet", () => {
  it("credits a positive adjustment", async () => {
    const tx = fakeTx({ balance: 10n });
    await adjustWallet(asTx(tx), "u1", 10n);
    expect(tx.calls[0]!.args).toMatchObject({ data: { balance: { increment: 10n } } });
  });

  it("debits a negative one by its size", async () => {
    const tx = fakeTx({ updated: 1, balance: 0n });
    await adjustWallet(asTx(tx), "u1", -10n);
    expect(tx.calls[0]!.args).toEqual({
      where: { id: "u1", balance: { gte: 10n } },
      data: { balance: { decrement: 10n } },
    });
  });

  it("refuses to take a wallet below zero", async () => {
    const tx = fakeTx({ updated: 0 });
    expect(await adjustWallet(asTx(tx), "u1", -10n)).toBeNull();
  });
});
