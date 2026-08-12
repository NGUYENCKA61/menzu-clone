-- CreateEnum
CREATE TYPE "TradeMode" AS ENUM ('SELL', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "TradeMailType" AS ENUM ('DROP', 'DEAD');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'DONE');

-- CreateTable
CREATE TABLE "trade_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "TradeMode" NOT NULL,
    "mailType" "TradeMailType" NOT NULL,
    "hasWelcomeMail" BOOLEAN NOT NULL DEFAULT false,
    "screenshotUrl" TEXT,
    "zalo" TEXT NOT NULL,
    "note" TEXT,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "quotedAmount" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trade_requests_code_key" ON "trade_requests"("code");

-- CreateIndex
CREATE INDEX "trade_requests_userId_createdAt_idx" ON "trade_requests"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "trade_requests" ADD CONSTRAINT "trade_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
