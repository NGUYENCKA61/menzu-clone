import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { getShopSettings } from "@/lib/settingsStore";
import { describeShape, readTransfers } from "@/lib/topup";

/**
 * Calls every configured feed once and reports whether the shop can read them.
 *
 * Answers with bank names, key names and counts — never values, and never the
 * URL. That URL carries the account's token, and the response is somebody's
 * bank statement.
 */
export async function POST() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const settings = await getShopSettings();
  const feeds = settings.bankAccounts.filter((account) => account.apiUrl);
  if (feeds.length === 0) {
    return NextResponse.json(
      { error: "Chưa tài khoản nào có địa chỉ API đối soát" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    feeds.map(async (account) => {
      const label = account.name || account.code;
      try {
        const response = await fetch(account.apiUrl, {
          headers: settings.topUpApiKey
            ? { Authorization: `Apikey ${settings.topUpApiKey}` }
            : {},
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          return { bank: label, ok: false, message: `trả về mã ${response.status}` };
        }

        const payload = await response.json();
        const transfers = readTransfers(payload);
        const shape = describeShape(payload);

        return {
          bank: label,
          ok: true,
          readable: transfers.length,
          itemKeys: shape.itemKeys,
          message:
            transfers.length > 0
              ? `đọc được ${transfers.length} giao dịch`
              : "gọi được nhưng chưa đọc ra giao dịch nào — có thể chưa có giao dịch, hoặc tên trường khác dự kiến",
        };
      } catch {
        return { bank: label, ok: false, message: "không gọi được, kiểm tra URL và token" };
      }
    }),
  );

  return NextResponse.json({
    ok: results.every((row) => row.ok),
    results,
    hint: results.map((row) => `${row.bank}: ${row.message}`).join(" · "),
  });
}
