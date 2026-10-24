-- CreateTable
CREATE TABLE "posting_allowlist" (
    "email" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posting_allowlist_pkey" PRIMARY KEY ("email")
);

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "posting_allowlist" ENABLE ROW LEVEL SECURITY;
