import { NextResponse } from "next/server";

import { theSieuReEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { applyTsrResult, sameSign } from "@/lib/theSieuRe";
import { callbackSign, readTsrResult } from "@/lib/theSieuReRules";

/**
 * Where TheSieuRe reports a card it finished with: the same JSON shape as
 * its replies, sent as a form, as JSON or in the query, signed with
 * md5(partner_key . code . serial). The address goes into the Merchant area
 * at TheSieuRe as the callback: https://<shop>/api/wallet/card-callback.
 *
 * Server to server, so the proxy's origin guard does not see a browser here
 * and lets it through; the signature is the whole authentication.
 */
async function readParams(request: Request): Promise<Record<string, unknown>> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  if (request.method === "GET") return query;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return { ...query, ...(body ?? {}) };
  }
  const text = await request.text().catch(() => "");
  return { ...query, ...Object.fromEntries(new URLSearchParams(text)) };
}

async function handle(request: Request) {
  const settings = await getShopSettings();
  if (!theSieuReEnabled(settings)) {
    return NextResponse.json({ error: "Chưa bật TheSieuRe" }, { status: 404 });
  }
  const params = await readParams(request);
  const result = readTsrResult(params);
  if (!result || !result.requestId) {
    return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
  }
  const expected = callbackSign(settings.topUpCardPartnerKey.trim(), result.code, result.serial);
  if (!result.callbackSign || !sameSign(result.callbackSign, expected)) {
    return NextResponse.json({ error: "Sai chữ ký" }, { status: 403 });
  }
  const outcome = await applyTsrResult(result.requestId, result);
  return NextResponse.json({ ok: true, outcome });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
