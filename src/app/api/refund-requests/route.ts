import { NextResponse } from "next/server";

/**
 * Where buyers used to ask for their money back.
 *
 * Retired on 01/10/2026: a buyer reports the order for warranty and follows
 * the ticket, and the shop refunds from the ticket when it cannot fix it
 * ("khách không cần gửi yêu cầu hoàn tiền mà tự tui chuyển nó sang case hoàn
 * tiền"). Answers 410 with where to go instead, so an old page or a stale tab
 * that still posts here gets a sentence rather than a silent failure.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Hoàn tiền giờ do shop xử lý qua yêu cầu bảo hành — bạn gửi yêu cầu bảo hành cho đơn này nhé.",
    },
    { status: 410 },
  );
}
