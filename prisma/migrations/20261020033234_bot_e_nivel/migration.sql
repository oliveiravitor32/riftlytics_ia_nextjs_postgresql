-- CreateTable
CREATE TABLE "level_snapshots" (
    "playerId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "summonerLevel" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_snapshots_pkey" PRIMARY KEY ("playerId","snapshotDate")
);

-- CreateTable
CREATE TABLE "bot_session" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_session_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "level_snapshots" ADD CONSTRAINT "level_snapshots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "level_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bot_session" ENABLE ROW LEVEL SECURITY;
