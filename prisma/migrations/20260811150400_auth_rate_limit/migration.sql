-- CreateEnum
CREATE TYPE "AuthAttemptKind" AS ENUM ('LOGIN', 'REGISTER');

-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" TEXT NOT NULL,
    "kind" "AuthAttemptKind" NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_attempts_kind_identifier_createdAt_idx" ON "auth_attempts"("kind", "identifier", "createdAt");

-- CreateIndex
CREATE INDEX "auth_attempts_kind_ip_createdAt_idx" ON "auth_attempts"("kind", "ip", "createdAt");
