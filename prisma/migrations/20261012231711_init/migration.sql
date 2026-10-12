-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'br1',
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "puuid" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdl_snapshots" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "leaguePoints" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdl_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duo_analyses" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "compatibilityScore" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "cachedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duo_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_puuid_key" ON "players"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "players_gameName_tagLine_key" ON "players"("gameName", "tagLine");

-- CreateIndex
CREATE INDEX "pdl_snapshots_playerId_queueType_capturedAt_idx" ON "pdl_snapshots"("playerId", "queueType", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pdl_snapshots_playerId_queueType_capturedAt_key" ON "pdl_snapshots"("playerId", "queueType", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "duo_analyses_player1Id_player2Id_key" ON "duo_analyses"("player1Id", "player2Id");

-- AddForeignKey
ALTER TABLE "pdl_snapshots" ADD CONSTRAINT "pdl_snapshots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duo_analyses" ADD CONSTRAINT "duo_analyses_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duo_analyses" ADD CONSTRAINT "duo_analyses_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
