-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "gameCreation" TIMESTAMP(3) NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_matches" (
    "playerId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "queueId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "win" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,

    CONSTRAINT "player_matches_pkey" PRIMARY KEY ("playerId","matchId")
);

-- CreateIndex
CREATE INDEX "player_matches_playerId_playedAt_idx" ON "player_matches"("playerId", "playedAt" DESC);

-- AddForeignKey
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
