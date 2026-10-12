import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import {
  decideVerification,
  verificationFailure,
  type VerificationDecision,
} from "@/lib/verification";

const DECISIONS = new Set<VerificationDecision>([
  "approve",
  "reject",
  "revoke",
]);

/**
 * The desk's word on a bid for "xác thực cấp 2" (/admin/verifications):
 * approve, reject with a reason, or revoke an approval already given.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    action?: unknown;
    note?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const action = body?.action;
  if (
    !id ||
    typeof action !== "string" ||
    !DECISIONS.has(action as VerificationDecision)
  ) {
    return NextResponse.json(
      { error: "Thiếu hồ sơ hoặc hành động" },
      { status: 400 },
    );
  }
  try {
    const result = await decideVerification(
      admin,
      id,
      action as VerificationDecision,
      body?.note,
    );
    return NextResponse.json(result);
  } catch (error) {
    const failure = verificationFailure(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
