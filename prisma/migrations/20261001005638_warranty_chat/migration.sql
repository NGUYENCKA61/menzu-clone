-- AlterTable
ALTER TABLE "warranty_requests" ADD COLUMN     "mailedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "warranty_messages" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromShop" BOOLEAN NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "WarrantyStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warranty_messages_requestId_createdAt_idx" ON "warranty_messages"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "warranty_messages_fromShop_createdAt_idx" ON "warranty_messages"("fromShop", "createdAt");

-- AddForeignKey
ALTER TABLE "warranty_messages" ADD CONSTRAINT "warranty_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "warranty_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_messages" ADD CONSTRAINT "warranty_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Answers written before the conversation existed open their threads, so a
-- thread shows everything the single reply line used to. One per ticket,
-- dated when the ticket closed (or, still open, when it was reported), and
-- tagged with the status the ticket is in, which is the one that note came with.
INSERT INTO "warranty_messages" ("id", "requestId", "fromShop", "body", "status", "createdAt")
SELECT 'wm' || md5(r."id" || ':note'), r."id", true, r."adminNote", r."status", COALESCE(r."resolvedAt", r."createdAt")
FROM "warranty_requests" r
WHERE r."adminNote" IS NOT NULL AND btrim(r."adminNote") <> '';
