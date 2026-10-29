-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('WEB', 'ZALO', 'FACEBOOK', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "ChatThreadStatus" AS ENUM ('BOT', 'NEED_ADMIN', 'DONE');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('CUSTOMER', 'BOT', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "crmNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "crmTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'WEB',
    "userId" TEXT,
    "guestKey" TEXT,
    "status" "ChatThreadStatus" NOT NULL DEFAULT 'BOT',
    "needReason" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_threads_status_lastMessageAt_idx" ON "chat_threads"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_threads_userId_lastMessageAt_idx" ON "chat_threads"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_threads_guestKey_lastMessageAt_idx" ON "chat_threads"("guestKey", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_messages_threadId_createdAt_idx" ON "chat_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
