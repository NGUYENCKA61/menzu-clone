-- A wide picture for the top of a category's own page.
--
-- The header over each category page used the home tile's picture, which is
-- small (640x360 is common) and loses its top and bottom, and its sharpness,
-- when stretched across a desktop window. The shop can now give a category a
-- proper banner; NULL keeps the tile picture as the fallback.
ALTER TABLE "categories" ADD COLUMN "bannerUrl" TEXT;
