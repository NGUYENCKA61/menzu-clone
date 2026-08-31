-- Member-tier discounts can be fractional (Gold 1.5%), so the percent an
-- order records can no longer be a whole number. Existing values carry
-- over unchanged.
ALTER TABLE "orders" ALTER COLUMN "discountPct" TYPE DOUBLE PRECISION;
