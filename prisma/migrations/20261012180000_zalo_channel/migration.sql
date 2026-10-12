-- The Zalo channel (the owner, 12/10/2026): a spare personal Zalo account,
-- run by a bot on the VPS, sends each customer their notices (warranty
-- standing, orders, top-ups) once they have linked it from Bao mat with a
-- short code. The web writes what to send into an outbox; the bot sends.
CREATE TYPE "ZaloOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "users" ADD COLUMN "zaloId" TEXT;
ALTER TABLE "users" ADD COLUMN "zaloName" TEXT;
CREATE UNIQUE INDEX "users_zaloId_key" ON "users"("zaloId");

CREATE TABLE "zalo_link_codes" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zalo_link_codes_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "zalo_link_codes_userId_idx" ON "zalo_link_codes"("userId");
ALTER TABLE "zalo_link_codes" ADD CONSTRAINT "zalo_link_codes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "zalo_outbox" (
    "id" TEXT NOT NULL,
    "zaloId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ZaloOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "zalo_outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zalo_outbox_status_createdAt_idx" ON "zalo_outbox"("status", "createdAt");
