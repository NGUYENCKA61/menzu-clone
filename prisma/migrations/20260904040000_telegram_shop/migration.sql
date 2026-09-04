-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegramId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
