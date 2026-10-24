-- AlterTable
ALTER TABLE "posting_allowlist" ADD COLUMN "admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "resenha_authors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resenha_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resenha_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenha_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resenha_posts_createdAt_id_idx" ON "resenha_posts"("createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "resenha_posts" ADD CONSTRAINT "resenha_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "resenha_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "resenha_authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resenha_posts" ENABLE ROW LEVEL SECURITY;
