-- CreateTable
CREATE TABLE "summary_sent" (
    "day" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summary_sent_pkey" PRIMARY KEY ("day")
);

-- Supabase exposes public tables through its REST API: keep them closed.
ALTER TABLE "summary_sent" ENABLE ROW LEVEL SECURITY;
