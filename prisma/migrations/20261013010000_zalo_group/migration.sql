-- The shop's Zalo group, minded by the notice bot (the owner, 12/10/2026):
-- a log of what the bot did there (approved or refused a join, warned,
-- removed, posted), which also counts a member's warnings, and a third kind
-- of outbox row that goes to the group instead of one person.
CREATE TYPE "ZaloGroupEventKind" AS ENUM ('JOIN_APPROVED', 'JOIN_REFUSED', 'WARNED', 'REMOVED', 'POSTED');
ALTER TYPE "ZaloOutboxKind" ADD VALUE 'GROUP_POST';

CREATE TABLE "zalo_group_events" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "kind" "ZaloGroupEventKind" NOT NULL,
    "zaloId" TEXT,
    "name" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zalo_group_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zalo_group_events_groupId_createdAt_idx" ON "zalo_group_events"("groupId", "createdAt");
CREATE INDEX "zalo_group_events_zaloId_kind_createdAt_idx" ON "zalo_group_events"("zaloId", "kind", "createdAt");
