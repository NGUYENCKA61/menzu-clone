-- Which email addresses a provider actually vouched for.
--
-- Left NULL for every existing row on purpose: nobody can tell now which of
-- the addresses already stored were confirmed by Google or Discord and which
-- were typed, and guessing in the permissive direction is exactly the hole
-- this column closes. Existing customers keep signing in the way they do
-- today; linking a second provider by address alone starts working again once
-- an address is verified.
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
