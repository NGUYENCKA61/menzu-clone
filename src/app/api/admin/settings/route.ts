import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { normalizeSettings, validateSettings, type ShopSettings } from "@/lib/settings";
import { getShopSettings, saveShopSettings } from "@/lib/settingsStore";

/** The current settings, for anything that wants them without a page load. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  return NextResponse.json(await getShopSettings());
}

/**
 * Replace the settings.
 *
 * The whole object is sent rather than a patch: the form edits every field on
 * one screen, and a partial write would let two admins saving different tabs
 * silently overwrite each other's fields.
 */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as Partial<ShopSettings> | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const settings = normalizeSettings(body);

  const invalid = validateSettings(settings);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  await saveShopSettings(settings);
  return NextResponse.json(settings);
}
