-- Which kind of thing a category sells — "PC", "MOBILE" or "SPOOFER" — so
-- the home page's game list can be narrowed by a chip. Nullable: every
-- category the shop already has starts untagged and shows under "Tất cả"
-- until somebody picks one on its admin page.
ALTER TABLE "categories" ADD COLUMN "platform" TEXT;
