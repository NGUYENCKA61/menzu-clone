-- How an approved refund was paid, and how much of it. Both null while the
-- request waits and on a rejection: there is no method for money that never
-- moved. Stored rather than recomputed from the product's promised rate, which
-- the shop can change afterwards.
CREATE TYPE "RefundMethod" AS ENUM ('MANUAL', 'WALLET');

ALTER TABLE "refund_requests" ADD COLUMN "method" "RefundMethod";
ALTER TABLE "refund_requests" ADD COLUMN "amount" BIGINT;
