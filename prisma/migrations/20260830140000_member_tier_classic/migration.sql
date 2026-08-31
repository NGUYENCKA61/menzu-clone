-- The first rung is called Classic now. The enum value itself is renamed, so
-- nothing anywhere prints "SILVER" any more; rows keep their standing.
ALTER TYPE "MemberTier" RENAME VALUE 'SILVER' TO 'CLASSIC';
ALTER TABLE "users" ALTER COLUMN "tier" SET DEFAULT 'CLASSIC';
