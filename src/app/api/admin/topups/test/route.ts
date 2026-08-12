import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { getShopSettings } from "@/lib/settingsStore";
import { describeShape, readTransfers } from "@/lib/topup";

/**
 * Calls the configured provider once and reports whether the shop can read it.
 *
 * Answers with key names and counts, never values: the response is somebody's
 * bank statement, and the URL itself carries the password for providers that
 * put credentials in the path. That is also why the URL is never echoed back.
 */
export async function POST() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const settings = await getShopSettings();
  if (!settings.topUpApiUrl) {
    return NextResponse.json(
      { error: "Chưa điền địa chỉ API đối soát" },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    const response = await fetch(settings.topUpApiUrl, {
      headers: settings.topUpApiKey
        ? { Authorization: `Apikey ${settings.topUpApiKey}` }
        : {},
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Nhà cung cấp trả về mã ${response.status}` },
        { status: 502 },
      );
    }
    payload = await response.json();
  } catch {
    return NextResponse.json(
      { error: "Không gọi được địa chỉ này. Kiểm tra lại URL và token." },
      { status: 502 },
    );
  }

  const transfers = readTransfers(payload);
  const shape = describeShape(payload);

  return NextResponse.json({
    ok: true,
    readable: transfers.length,
    shape,
    // Enough to tell "the reader understands this" from "it fetched something
    // it cannot use", without printing a single transaction.
    hint:
      transfers.length > 0
        ? `Đọc được ${transfers.length} giao dịch. Nạp tự động sẽ chạy.`
        : "Gọi được nhưng chưa đọc ra giao dịch nào — có thể tài khoản chưa có giao dịch, hoặc tên trường khác với dự kiến.",
  });
}
