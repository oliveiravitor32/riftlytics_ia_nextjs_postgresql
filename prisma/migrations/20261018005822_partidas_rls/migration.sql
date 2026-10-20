-- Supabase exposes public tables through its REST API: keep them closed.
-- Prisma connects as the owner and is not affected.
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_matches" ENABLE ROW LEVEL SECURITY;
