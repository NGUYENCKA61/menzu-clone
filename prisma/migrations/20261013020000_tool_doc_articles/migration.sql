-- A wiki article may belong to one tool (the owner, 12/10/2026: "tai lieu
-- nhu lmarket"): then it is a page of that tool's documentation, open for
-- as long as the buyer's key, and off the public wiki lists.
ALTER TABLE "doc_articles" ADD COLUMN "productId" TEXT;
CREATE INDEX "doc_articles_productId_sortOrder_idx" ON "doc_articles"("productId", "sortOrder");
ALTER TABLE "doc_articles" ADD CONSTRAINT "doc_articles_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
