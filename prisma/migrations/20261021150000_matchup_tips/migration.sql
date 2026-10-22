-- CreateTable
CREATE TABLE "matchup_tips" (
    "champA" TEXT NOT NULL,
    "champB" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matchup_tips_pkey" PRIMARY KEY ("champA","champB")
);

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "matchup_tips" ENABLE ROW LEVEL SECURITY;
