-- AlterTable
ALTER TABLE "resenha_posts" ADD COLUMN "replyToId" TEXT;

-- CreateTable
CREATE TABLE "resenha_reactions" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenha_reactions_pkey" PRIMARY KEY ("postId","userId","emoji")
);

-- AddForeignKey
ALTER TABLE "resenha_posts" ADD CONSTRAINT "resenha_posts_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "resenha_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenha_reactions" ADD CONSTRAINT "resenha_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "resenha_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "resenha_reactions" ENABLE ROW LEVEL SECURITY;
