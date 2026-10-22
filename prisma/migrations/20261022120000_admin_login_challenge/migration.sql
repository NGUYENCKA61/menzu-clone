-- Admin sign-in, second step (22/10/2026): the code sent after a right password.
CREATE TABLE "admin_login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_login_challenges_userId_createdAt_idx" ON "admin_login_challenges"("userId", "createdAt");

ALTER TABLE "admin_login_challenges" ADD CONSTRAINT "admin_login_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
