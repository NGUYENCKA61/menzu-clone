-- A buyer asking for money back on one order. Its own table, not columns on
-- the order: the same order can be argued about twice, and each round keeps
-- its own words, evidence and date.
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refund_requests_userId_createdAt_idx" ON "refund_requests"("userId", "createdAt");
CREATE INDEX "refund_requests_status_createdAt_idx" ON "refund_requests"("status", "createdAt");
CREATE INDEX "refund_requests_orderId_idx" ON "refund_requests"("orderId");

ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
