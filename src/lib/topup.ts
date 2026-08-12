/**
 * Reading an incoming bank transfer.
 *
 * Pure on purpose: matching a transfer to a pending request is the step that
 * decides whether money lands in the right wallet, and it has to be testable
 * without a bank, a webhook or a database.
 */

/** What the shop needs out of a provider's payload, whichever provider it is. */
export interface IncomingTransfer {
  /** Free text the sender typed — where the top-up code lives. */
  description: string;
  /** Amount received, in đồng. */
  amount: number;
  /** The provider's own id for this transfer, for logs. */
  reference: string;
}

/**
 * Pulls "NT8F3K2Q" out of whatever the bank passes along.
 *
 * Banking apps mangle the description: they strip spaces, upper-case it, and
 * bolt on their own prefix, so "NAP NT8F3K2Q" can arrive as
 * "CT DEN:123 NAPNT8F3K2Q" or "napnt8f3k2q-CTLNhanh". Anchoring on the NAP
 * marker and then reading the code that follows survives all of those.
 */
export function extractTopUpCode(description: string): string | null {
  if (!description) return null;
  const match = /NAP\s*(NT[A-Z0-9]{6})/i.exec(description);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Normalises Casso and SePay into one shape.
 *
 * Casso posts `{ error, data: [ … ] }` with `description` and `amount`; SePay
 * posts a single object with `content` and `transferAmount`. Anything else
 * returns nothing rather than guessing at fields.
 */
export function readTransfers(payload: unknown): IncomingTransfer[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as Record<string, unknown>;

  // Casso: a batch under `data`.
  if (Array.isArray(body.data)) {
    return body.data
      .map((row) => readOne(row as Record<string, unknown>))
      .filter((row): row is IncomingTransfer => row !== null);
  }

  const single = readOne(body);
  return single ? [single] : [];
}

function readOne(row: Record<string, unknown> | null): IncomingTransfer | null {
  if (!row || typeof row !== "object") return null;

  const description = String(row.description ?? row.content ?? "");
  const rawAmount = row.amount ?? row.transferAmount;
  const amount = Math.floor(Number(rawAmount));
  const reference = String(row.tid ?? row.referenceCode ?? row.id ?? "");

  // Money out is not money in. SePay says so explicitly; Casso uses a negative
  // amount. Either way a debit must never credit a wallet.
  if (row.transferType !== undefined && row.transferType !== "in") return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { description, amount, reference };
}
