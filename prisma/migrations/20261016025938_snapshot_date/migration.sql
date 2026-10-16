-- Separates the day key (snapshotDate) from the real capture time (capturedAt).
-- Existing rows get their day from capturedAt, which until now held midnight UTC.

-- DropIndex
DROP INDEX "pdl_snapshots_playerId_queueType_capturedAt_idx";

-- DropIndex
DROP INDEX "pdl_snapshots_playerId_queueType_capturedAt_key";

-- AlterTable: add as nullable, backfill, then require it
ALTER TABLE "pdl_snapshots" ADD COLUMN "snapshotDate" DATE;
UPDATE "pdl_snapshots" SET "snapshotDate" = ("capturedAt" AT TIME ZONE 'UTC')::date;
ALTER TABLE "pdl_snapshots" ALTER COLUMN "snapshotDate" SET NOT NULL;

-- CreateIndex
CREATE INDEX "pdl_snapshots_playerId_queueType_snapshotDate_idx" ON "pdl_snapshots"("playerId", "queueType", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "pdl_snapshots_playerId_queueType_snapshotDate_key" ON "pdl_snapshots"("playerId", "queueType", "snapshotDate");
