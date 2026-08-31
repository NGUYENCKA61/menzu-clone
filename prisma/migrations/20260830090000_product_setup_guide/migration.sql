-- "Hướng dẫn thiết lập & sử dụng", per product: what to do once the tool is
-- installed — sign in with the key, which switches to set, how to play with
-- it. Written in the same rich editor as the install guide and kept beside
-- it in its own column, because the two are read at different moments.
--
-- Nullable with no backfill: NULL prints one default sentence under the
-- heading, so nothing on the storefront changes until a shop writes one.
ALTER TABLE "products" ADD COLUMN "setupGuide" TEXT;
