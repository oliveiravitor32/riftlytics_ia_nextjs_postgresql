-- AlterTable
ALTER TABLE "resenha_posts" ADD COLUMN "matchId" TEXT,
ADD COLUMN "matchPlayerId" TEXT;

-- CreateIndex
CREATE INDEX "resenha_posts_matchId_idx" ON "resenha_posts"("matchId");

-- AddForeignKey
ALTER TABLE "resenha_posts" ADD CONSTRAINT "resenha_posts_matchPlayerId_matchId_fkey" FOREIGN KEY ("matchPlayerId", "matchId") REFERENCES "player_matches"("playerId", "matchId") ON DELETE SET NULL ON UPDATE CASCADE;
