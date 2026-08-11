import { describe, expect, it } from "vitest";

import { checkWelcomeMail, extractAddress, parseHeaders } from "@/lib/welcomeMail";

/** A genuine-looking source: Riot sender, Riot DKIM, all three checks stamped pass. */
const GENUINE = [
  "Delivered-To: player@gmail.com",
  "Authentication-Results: mx.google.com;",
  "       dkim=pass header.i=@riotgames.com header.s=s1;",
  "       spf=pass (google.com: domain of noreply@riotgames.com designates 1.2.3.4);",
  "       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=riotgames.com",
  "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;",
  "       d=riotgames.com; s=s1; t=1719400000;",
  "From: Riot Games <noreply@riotgames.com>",
  "To: player@gmail.com",
  "Subject: Welcome to Riot Games",
  "Date: Thu, 26 Jun 2026 09:00:00 +0000",
  "",
  "Welcome aboard.",
].join("\r\n");

describe("parseHeaders", () => {
  it("rejoins headers that wrap onto continuation lines", () => {
    // Providers wrap Authentication-Results almost every time. A naive
    // line-by-line split loses the spf and dmarc results sitting on the
    // continuation lines, which would fail a genuine mail.
    const auth = parseHeaders(GENUINE).get("authentication-results");
    expect(auth).toContain("dkim=pass");
    expect(auth).toContain("spf=pass");
    expect(auth).toContain("dmarc=pass");
  });

  it("stops at the blank line separating headers from body", () => {
    const headers = parseHeaders("From: a@b.com\r\n\r\nSubject: not-a-header\r\n");
    expect(headers.has("subject")).toBe(false);
  });

  it("joins repeated headers instead of letting the last one win", () => {
    const headers = parseHeaders("Received: from hop1\r\nReceived: from hop2\r\n\r\n");
    expect(headers.get("received")).toBe("from hop1 from hop2");
  });

  it("lowercases header names so lookups do not depend on casing", () => {
    expect(parseHeaders("FROM: a@b.com\r\n\r\n").get("from")).toBe("a@b.com");
  });

  it("handles bare LF, as produced when a source is pasted through an editor", () => {
    expect(parseHeaders("From: a@b.com\nSubject: hi\n\n").get("subject")).toBe("hi");
  });
});

describe("extractAddress", () => {
  it("takes the address out of a display-name form", () => {
    expect(extractAddress("Riot Games <noreply@riotgames.com>")).toBe("noreply@riotgames.com");
  });

  it("accepts a bare address", () => {
    expect(extractAddress("noreply@riotgames.com")).toBe("noreply@riotgames.com");
  });

  it("returns null for a display name with no address", () => {
    expect(extractAddress("Riot Games")).toBeNull();
  });
});

describe("checkWelcomeMail", () => {
  it("accepts a genuine Riot welcome mail", () => {
    const result = checkWelcomeMail(GENUINE);
    expect(result.verdict).toBe("genuine");
    expect(result.from).toBe("noreply@riotgames.com");
    expect(result.to).toBe("player@gmail.com");
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("rejects a lookalike sender domain", () => {
    // riotgames.com.evil.net ends with neither the domain nor ".riotgames.com",
    // so a plain `includes` check would have waved this through.
    const forged = GENUINE.replace("noreply@riotgames.com>", "noreply@riotgames.com.evil.net>");
    expect(checkWelcomeMail(forged).verdict).toBe("suspicious");
  });

  it("rejects mail whose DKIM did not verify", () => {
    expect(checkWelcomeMail(GENUINE.replace("dkim=pass", "dkim=fail")).verdict).toBe("suspicious");
  });

  it("rejects mail with no DKIM signature at all", () => {
    const stripped = GENUINE.split("\r\n")
      .filter((line) => !/^(DKIM-Signature|\s+d=riotgames)/.test(line))
      .join("\r\n");
    expect(checkWelcomeMail(stripped).verdict).toBe("suspicious");
  });

  it("still accepts a forward that lost SPF but kept a verified Riot DKIM", () => {
    // Forwarding legitimately breaks SPF; DKIM survives it. Failing the whole
    // check on SPF alone would reject real mail.
    const forwarded = GENUINE.replace("spf=pass", "spf=softfail");
    const result = checkWelcomeMail(forwarded);
    expect(result.verdict).toBe("genuine");
    expect(result.checks.find((c) => c.label === "SPF hợp lệ")?.passed).toBe(false);
  });

  it("reports plain text as unreadable rather than suspicious", () => {
    expect(checkWelcomeMail("chào bạn, đây không phải email").verdict).toBe("unreadable");
  });
});
