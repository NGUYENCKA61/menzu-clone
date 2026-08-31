-- The usage-manual link, handed over beside the tool download on a software
-- order's receipt. Nullable: null simply hides the button.
ALTER TABLE "products" ADD COLUMN "docsUrl" TEXT;
