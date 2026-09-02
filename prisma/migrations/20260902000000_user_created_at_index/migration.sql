-- The admin user list orders by createdAt and pages through it; at 8k+ rows an
-- unindexed sort scans the whole table on every page.
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
