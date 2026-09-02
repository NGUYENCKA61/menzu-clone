-- The reward wheel's prize table, moved out of code so retuning the odds or
-- adding a prize is not a deploy. An empty table means "the shop has never
-- touched this screen" and the code's DEFAULT_PRIZES still spins.
CREATE TABLE "spin_prizes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spin_prizes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "spin_prizes_active_sortOrder_idx" ON "spin_prizes"("active", "sortOrder");
