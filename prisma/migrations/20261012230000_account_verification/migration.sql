-- Xac thuc cap 2 (the owner, 12/10/2026): a customer's bid for level 2 (the
-- Facebook they go by, the Zalo already linked through the bot, a phone proved
-- by a code sent to that Zalo, the bank account they pay from), the shop's
-- decision on it, the level on the account, and the flag on a product sold to
-- level 2 only. The Zalo outbox learns to carry a phone code, which the bot
-- sends only after checking the number belongs to the linked Zalo.
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ZaloOutboxKind" AS ENUM ('NOTICE', 'PHONE_OTP');

ALTER TABLE "users" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "verifiedOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "zalo_outbox" ADD COLUMN "kind" "ZaloOutboxKind" NOT NULL DEFAULT 'NOTICE';
ALTER TABLE "zalo_outbox" ADD COLUMN "phone" TEXT;

CREATE TABLE "account_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "facebookUrl" TEXT NOT NULL,
    "facebookName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerifiedAt" TIMESTAMP(3) NOT NULL,
    "zaloId" TEXT,
    "zaloName" TEXT,
    "bankName" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_verifications_userId_createdAt_idx" ON "account_verifications"("userId", "createdAt");
CREATE INDEX "account_verifications_status_createdAt_idx" ON "account_verifications"("status", "createdAt");
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "phone_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "outboxId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "phone_verifications_userId_createdAt_idx" ON "phone_verifications"("userId", "createdAt");
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
