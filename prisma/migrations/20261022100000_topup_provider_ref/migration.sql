-- The feed row that paid a top-up request (the TheSieuRe history, for
-- scratch cards), unique so one credit pays one request and never two.
ALTER TABLE "topups" ADD COLUMN "providerRef" TEXT;
CREATE UNIQUE INDEX "topups_providerRef_key" ON "topups"("providerRef");
