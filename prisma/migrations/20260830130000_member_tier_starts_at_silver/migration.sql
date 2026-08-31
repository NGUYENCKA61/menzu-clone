-- Silver is the first rung now. New accounts start there, and every account
-- still on Bronze moves up to it; Bronze stays in the enum (Postgres cannot
-- drop an enum value) but nothing writes it any more.
ALTER TABLE "users" ALTER COLUMN "tier" SET DEFAULT 'SILVER';
UPDATE "users" SET "tier" = 'SILVER' WHERE "tier" = 'BRONZE';
