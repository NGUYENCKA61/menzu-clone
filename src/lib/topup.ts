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
/** Where the different providers keep the list of transactions. */
const LIST_KEYS = ["data", "transactions", "tranList", "items", "result", "records"];

/** …and what they call the sender's message, the amount, and their own id. */
const DESCRIPTION_KEYS = ["description", "content", "comment", "detail", "addDescription"];
const AMOUNT_KEYS = ["amount", "transferAmount", "creditAmount", "amountIn", "money"];
const REFERENCE_KEYS = ["tid", "transactionID", "transactionId", "referenceCode", "refNo", "id"];

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  // Case-insensitive: some providers capitalise ("Description", "Amount").
  const lower = new Map(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const key of keys) {
    const value = lower.get(key.toLowerCase());
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * An amount can arrive as 200000, "200000", "200,000", "200.000" or "+200000".
 * Everything but the digits and a leading sign is separator noise.
 */
function readAmount(raw: unknown): number {
  if (typeof raw === "number") return Math.floor(raw);
  if (typeof raw !== "string") return Number.NaN;
  const cleaned = raw.replace(/[^\d-]/g, "");
  return cleaned ? Math.floor(Number(cleaned)) : Number.NaN;
}

export function readTransfers(payload: unknown): IncomingTransfer[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as Record<string, unknown>;

  if (Array.isArray(payload)) {
    return (payload as unknown[])
      .map((row) => readOne(row as Record<string, unknown>))
      .filter((row): row is IncomingTransfer => row !== null);
  }

  for (const key of LIST_KEYS) {
    const list = pick(body, [key]);
    if (Array.isArray(list)) {
      return list
        .map((row) => readOne(row as Record<string, unknown>))
        .filter((row): row is IncomingTransfer => row !== null);
    }
  }

  const single = readOne(body);
  return single ? [single] : [];
}

function readOne(row: Record<string, unknown> | null): IncomingTransfer | null {
  if (!row || typeof row !== "object") return null;

  const description = String(pick(row, DESCRIPTION_KEYS) ?? "");
  const amount = readAmount(pick(row, AMOUNT_KEYS));
  const reference = String(pick(row, REFERENCE_KEYS) ?? "");

  // Money out is not money in. SePay says so explicitly, Casso uses a negative
  // amount, and the polled APIs tend to carry a "IN"/"OUT" or "+"/"-" marker.
  // Any of them must stop a debit from crediting a wallet.
  const direction = String(pick(row, ["transferType", "type", "creditDebitIndicator"]) ?? "");
  if (direction && !/^(in|credit|c|\+)$/i.test(direction)) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { description, amount, reference };
}

/**
 * What an unrecognised payload actually looks like, for the "kiểm tra kết nối"
 * button. Keys only — the values are somebody's bank statement.
 */
export function describeShape(payload: unknown): {
  topLevel: string[];
  listKey: string | null;
  itemKeys: string[];
} {
  if (!payload || typeof payload !== "object") {
    return { topLevel: [], listKey: null, itemKeys: [] };
  }
  const body = payload as Record<string, unknown>;
  const topLevel = Array.isArray(payload) ? ["(mảng)"] : Object.keys(body);

  let list: unknown[] | null = Array.isArray(payload) ? (payload as unknown[]) : null;
  let listKey: string | null = list ? "(mảng gốc)" : null;
  if (!list) {
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        list = value;
        listKey = key;
        break;
      }
    }
  }

  const first = list?.[0];
  const itemKeys = first && typeof first === "object" ? Object.keys(first) : [];
  return { topLevel, listKey, itemKeys };
}
