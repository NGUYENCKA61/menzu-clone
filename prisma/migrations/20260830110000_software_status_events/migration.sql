-- "Thông báo trạng thái hack".
--
-- A tool's detection state used to be one column that overwrote itself, so
-- "when did it go Detected" had no answer. Each change now leaves a row
-- here, which is what the status tab of /thong-bao lists and what a
-- subscriber's bell is fed from.
CREATE TABLE "software_status_events" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "SoftwareStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_status_events_pkey" PRIMARY KEY ("id")
);

-- One tool's history, and everybody's history — both newest first.
CREATE INDEX "software_status_events_productId_createdAt_idx" ON "software_status_events"("productId", "createdAt");
CREATE INDEX "software_status_events_createdAt_idx" ON "software_status_events"("createdAt");

ALTER TABLE "software_status_events" ADD CONSTRAINT "software_status_events_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Who asked to hear about which tool. Nobody is subscribed to anything until
-- they press the button; the bell shows status changes for these rows only.
CREATE TABLE "software_status_subscriptions" (
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_status_subscriptions_pkey" PRIMARY KEY ("userId", "productId")
);

CREATE INDEX "software_status_subscriptions_productId_idx" ON "software_status_subscriptions"("productId");

ALTER TABLE "software_status_subscriptions" ADD CONSTRAINT "software_status_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "software_status_subscriptions" ADD CONSTRAINT "software_status_subscriptions_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one row per live tool from the state it holds today, stamped
-- with the product's last edit — the closest thing to "since when" that
-- exists. Without it the status tab would open empty on a shop that has
-- been running for months.
INSERT INTO "software_status_events" ("id", "productId", "status", "createdAt")
SELECT 'sse_' || substr(md5(random()::text || "id"), 1, 20), "id", "softwareStatus", "updatedAt"
FROM "products"
WHERE "productType" = 'SOFTWARE_GAME' AND "softwareStatus" IS NOT NULL AND "deletedAt" IS NULL;
