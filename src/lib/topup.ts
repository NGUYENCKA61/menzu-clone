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
  const match = new RegExp(`NAP\\s*(NT[A-Z0-9]{${CODE_BODY_LENGTH}})`, "i").exec(description);
  return match ? match[1].toUpperCase() : null;
}

/**
 * How long after opening a request the wallet page keeps watching for payment.
 *
 * Generous next to the 30-minute expiry, because watching costs the shop
 * nothing beyond a rate-limited poll and somebody may still be fighting their
 * banking app. It exists to have an end at all.
 */
export const TOPUP_WATCH_MINUTES = 120;

/**
 * The request the wallet page should watch, or null to stop polling.
 *
 * Two bugs shaped this. Keying on "did this page session open a request" meant
 * a reload stopped the page watching something still unpaid, and the transfer
 * sat matched but uncredited. Then matching on status alone meant a request
 * abandoned last week — still sitting in recent history as EXPIRED — had every
 * later visit to /wallet polling every ten seconds, forever, for money nobody
 * was ever going to send.
 *
 * So: unsettled, and recent. EXPIRED counts while it is recent, because those
 * still credit if the money turns up.
 */
export function watchableTopUpCode(
  rows: { code: string; status: string; createdAt: Date }[],
  now: Date = new Date(),
): string | null {
  const cutoff = now.getTime() - TOPUP_WATCH_MINUTES * 60 * 1000;
  const row = rows.find(
    (r) =>
      (r.status === "PENDING" || r.status === "EXPIRED") &&
      r.createdAt.getTime() >= cutoff,
  );
  return row?.code ?? null;
}

/** How many characters follow the "NT" prefix. */
const CODE_BODY_LENGTH = 6;

/**
 * Mints the code that goes in the transfer description.
 *
 * Lives next to the matcher on purpose: these two have to agree on the shape
 * exactly, and when they lived in different files nothing said so. A code one
 * character too long is silently truncated by the matcher and the transfer
 * looks like it belongs to nobody.
 */
export function makeTopUpCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let body = "";
  for (let i = 0; i < CODE_BODY_LENGTH; i += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NT${body}`;
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
