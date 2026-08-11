/**
 * Parses the raw source of a Riot "welcome" email and reports whether it is
 * genuine.
 *
 * The point of the check is provenance: a seller can paste any text claiming
 * to be the account's original registration mail, but only a real one carries
 * authentication results that the receiving provider stamped on. Those cannot
 * be forged after the fact without also forging the DKIM signature.
 *
 * Pure and dependency-free so it can run in the browser — the pasted source
 * contains someone's email address and headers, and there is no reason for it
 * to reach a server.
 */

/** Domains Riot signs its mail with. */
const RIOT_DOMAINS = ["riotgames.com", "mail.riotgames.com", "riotgames.net"];

export type Verdict = "genuine" | "suspicious" | "unreadable";

export interface CheckResult {
  verdict: Verdict;
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  /** Individual signals, in display order. */
  checks: { label: string; passed: boolean; detail: string }[];
}

/**
 * Splits raw source into headers.
 *
 * RFC 5322 lets a long header wrap onto continuation lines that begin with
 * whitespace, and providers wrap Authentication-Results and DKIM-Signature
 * almost every time. Joining those back before parsing is the whole reason a
 * naive line-by-line split gets this wrong.
 */
export function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  const body = raw.replace(/\r\n/g, "\n");
  const end = body.indexOf("\n\n");
  const headerBlock = end === -1 ? body : body.slice(0, end);

  let current: string | null = null;

  for (const line of headerBlock.split("\n")) {
    if (/^[ \t]/.test(line) && current) {
      headers.set(current, `${headers.get(current) ?? ""} ${line.trim()}`);
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    // Repeated headers (Received, and often Authentication-Results) are joined
    // rather than overwritten, so a pass recorded by an earlier hop is not
    // lost behind a later one.
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    current = name;
    headers.set(name, headers.has(name) ? `${headers.get(name)} ${value}` : value);
  }

  return headers;
}

/** Pulls the address out of `Display Name <addr@host>` or a bare address. */
export function extractAddress(value: string | undefined): string | null {
  if (!value) return null;
  const angled = value.match(/<([^>]+)>/);
  const address = (angled ? angled[1] : value).trim();
  return /^[^\s@]+@[^\s@]+$/.test(address) ? address.toLowerCase() : null;
}

function domainOf(address: string | null): string | null {
  return address?.split("@")[1] ?? null;
}

function isRiotDomain(domain: string | null): boolean {
  return Boolean(domain && RIOT_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`)));
}

export function checkWelcomeMail(raw: string): CheckResult {
  const headers = parseHeaders(raw);

  if (headers.size === 0) {
    return {
      verdict: "unreadable",
      from: null,
      to: null,
      subject: null,
      date: null,
      checks: [],
    };
  }

  const from = extractAddress(headers.get("from"));
  const to = extractAddress(headers.get("to"));
  const auth = (headers.get("authentication-results") ?? "").toLowerCase();
  const dkimHeader = headers.get("dkim-signature") ?? "";
  const dkimDomain = dkimHeader.match(/[;\s]d=([^;\s]+)/)?.[1]?.toLowerCase() ?? null;

  const checks = [
    {
      label: "Người gửi là Riot Games",
      passed: isRiotDomain(domainOf(from)),
      detail: from ?? "Không tìm thấy header From",
    },
    {
      label: "Chữ ký DKIM của Riot",
      passed: isRiotDomain(dkimDomain),
      detail: dkimDomain ? `d=${dkimDomain}` : "Không có DKIM-Signature",
    },
    {
      label: "DKIM hợp lệ",
      passed: /dkim=pass/.test(auth),
      detail: /dkim=(\w+)/.exec(auth)?.[0] ?? "Không có kết quả xác thực",
    },
    {
      label: "SPF hợp lệ",
      passed: /spf=pass/.test(auth),
      detail: /spf=(\w+)/.exec(auth)?.[0] ?? "Không có kết quả xác thực",
    },
    {
      label: "DMARC hợp lệ",
      passed: /dmarc=pass/.test(auth),
      detail: /dmarc=(\w+)/.exec(auth)?.[0] ?? "Không có kết quả xác thực",
    },
  ];

  // A forwarded or re-saved copy can legitimately lose SPF, but sender domain
  // plus a Riot DKIM signature that the provider verified is hard to fake, so
  // those three carry the verdict.
  const critical = [checks[0]!, checks[1]!, checks[2]!];

  return {
    verdict: critical.every((c) => c.passed) ? "genuine" : "suspicious",
    from,
    to,
    subject: headers.get("subject") ?? null,
    date: headers.get("date") ?? null,
    checks,
  };
}
