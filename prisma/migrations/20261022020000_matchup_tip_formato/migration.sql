-- New tip format (summary + short actions); old answers don't fit it
DELETE FROM "matchup_tips";
ALTER TABLE "matchup_tips" RENAME COLUMN "rows" TO "tip";
