-- A verified address can only be replaced after the old inbox answers a
-- code (the owner, 21/10/2026). This is until when that answer holds.
ALTER TABLE "users" ADD COLUMN "emailChangeUnlockedUntil" TIMESTAMP(3);
