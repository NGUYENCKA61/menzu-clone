import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { loadWarrantyInbox } from "@/lib/warrantyInboxStore";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The floating warranty inbox's refresh (AdminWarrantyInbox, on every
 * storefront page for an admin): the tickets worth a look, newest activity
 * first, and how many buyers are waiting on the shop for the badge.
 *
 * A 403 tells a tab whose admin has signed out, or lost the role, to put the
 * widget away.
 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403, headers: NO_STORE });
  }
  const inbox = await loadWarrantyInbox();
  return NextResponse.json(inbox, { headers: NO_STORE });
}
