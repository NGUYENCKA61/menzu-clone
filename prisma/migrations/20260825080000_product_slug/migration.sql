-- A product's own URL segment, so an address reads /hack-pubg/hack-pubg-ban-desync
-- instead of /software/HACKPUBG01.
--
-- Added nullable, filled, then made required: the column has to exist before
-- it can be populated, and it has to be populated before it can be NOT NULL.
ALTER TABLE "products" ADD COLUMN "slug" TEXT;

-- A floor, not the final wording. Postgres has no accent folding without an
-- extension, so this strips Vietnamese marks along with everything else that
-- is not a-z0-9 — "Hack PUBG Bản DESYNC" lands as "hack-pubg-b-n-desync". The
-- id suffix is what makes it safe rather than pretty: every row gets a value,
-- no two rows collide, and nothing here can fail on data this migration has
-- not seen. scripts/backfill-product-slugs.mjs rewrites these into the real
-- slugs, in the application's own slugify, and must be run after deploying.
UPDATE "products"
SET "slug" = COALESCE(
    NULLIF(
        TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(COALESCE("name", "code"), '[^a-zA-Z0-9]+', '-', 'g'))),
        ''
    ) || '-' || RIGHT("id", 6),
    'san-pham-' || RIGHT("id", 6)
)
WHERE "slug" IS NULL;

ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;

-- Unique across the shop, not per category: one product, one canonical URL,
-- and a slug is enough on its own to find what an old address meant.
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
