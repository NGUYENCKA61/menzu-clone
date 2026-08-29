-- The ledger behind the AI assistant's rate limit.
--
-- A row per question asked, holding who asked and when — never what they
-- asked. The shop pays the model per answer, so the endpoint has to be able
-- to say "that is enough for this hour" to one address or one account; that
-- decision needs a count and a timestamp, and nothing else.
--
-- userId is deliberately not a foreign key: the row outlives the account it
-- came from by design (a deleted account must not take its throttle history
-- with it), and it is only ever read as an equality filter.
CREATE TABLE "assistant_hits" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_hits_pkey" PRIMARY KEY ("id")
);

-- Both windows are read as "rows for this key since <time>", which is exactly
-- what these two cover.
CREATE INDEX "assistant_hits_ip_createdAt_idx" ON "assistant_hits"("ip", "createdAt");
CREATE INDEX "assistant_hits_userId_createdAt_idx" ON "assistant_hits"("userId", "createdAt");
