# Riftlytics Project Documentation

> **AI-powered League of Legends friend group analytics and duo compatibility platform**

---

## 🎯 Project Vision & Goals

### Primary Objectives

1. **Social Profile Comparison**: View and compare multiple friends' LoL stats side-by-side
2. **Personal Analytics**: Track individual performance metrics, trends, and insights
3. **Duo Compatibility Analysis** (Future): AI-powered assessment of player synergy and team composition compatibility

### Success Metrics

- Load player profiles in <2s
- Support 5-10 active users with smooth updates
- Real-time stat comparison with <30s refresh intervals
- High-quality AI analysis generation in <10s

---

## 🏗️ Tech Stack & Architecture

### Core Stack (Current)

- **Frontend**: Next.js 15+ (App Router), React, TypeScript
- **Data Fetching**: TanStack Query for client-side caching
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Prisma ORM + Supabase PostgreSQL
- **League API**: Direct fetching (no OAuth needed for MVP)

### Recommended Additions (After MVP)

- **Caching Layer**: Upstash Redis (serverless, rate limit protection)
- **Background Jobs**: Inngest (periodic PDL snapshots)
- **Validation**: Zod (type-safe API responses)
- **Authentication**: NextAuth.js or simple API key (for future phases)
- **AI Integration**: OpenAI/Claude API (Phase 3)

### Architecture Decision: Why These Choices

| Component       | Choice        | Rationale                                                                          |
| --------------- | ------------- | ---------------------------------------------------------------------------------- |
| **API Caching** | Upstash Redis | Riot API has strict rate limits; prevents hitting ceiling with multiple users      |
| **Job Queue**   | Inngest       | Serverless (no infrastructure), scales automatically, integrates well with Next.js |
| **Storage**     | Supabase      | Postgres reliability, good for relational data (players, matches, comparisons)     |
| **AI Layer**    | Claude API    | Better contextual understanding of LoL meta than GPT for analysis                  |

---

## 📐 Project Phases

### Phase 1: MVP (2-3 weeks)

**Goal**: Display preset profiles (op.gg-like interface) with profile data, match history, and performance analysis

- [x] Tracked players stored in the DB (`players` table, seeded)
- [x] Create `/api/profile/[summonerName]` endpoint (summoner + Solo/Flex rank, no matches)
- [x] Create `/api/matches/[summonerName]` endpoint (paginated match history)
- [x] Create `/api/rank/[summonerName]` endpoint (ranking page, 5-min server cache)
- [x] Design database schema for PDL snapshots (not full match history)
- [x] Build UI components (ProfileCard, RankingBoard, Header, PlayerAvatar)
- [x] Implement TanStack Query hooks for profile/rank/match data
- [ ] Profile page (match history, champions, roles)
- [ ] Side-by-side comparison
- [ ] Deploy to production with basic monitoring

**Deliverables**:

- Home page displaying your profile + 3-5 friend profiles
- Individual profile view (rank, LP, main champions, role distribution)
- Recent match history (last 20 matches from API)
- Performance metrics display (KDA, CS, gold, etc.)
- Side-by-side stat comparison

### Phase 2: Analytics & Tracking (3-4 weeks)

**Goal**: Historical PDL tracking + trend analysis

- [ ] Implement daily PDL snapshot collection (background job)
- [ ] Add caching layer (Upstash Redis)
- [ ] Create background job system (Inngest for periodic PDL snapshots)
- [ ] Build analytics dashboard with trend charts
- [ ] Add champion pool analysis
- [ ] Performance optimization with Redis caching

**Deliverables**:

- Trend analysis charts (LP progression over 7/30 days)
- Champion pool insights (most played, best/worst winrate)
- Shared champion pool comparison
- Rank/tier history
- Performance alerts (ranked up/demoted)

### Phase 3: AI Duo Analysis (4-6 weeks)

**Goal**: AI-powered duo compatibility rating

- [ ] Integrate Claude API
- [ ] Design LoL meta knowledge prompt
- [ ] Create analysis prompt chain
- [ ] Store analysis results in Prisma
- [ ] Build UI for results display
- [ ] Add analysis history/comparison

**Deliverables**:

- Duo compatibility scoring (1-10)
- Strengths & weaknesses analysis
- Recommended team compositions
- Counter-pick suggestions

---

## ⚡ Key Technical Challenges & Solutions

### 1. **Riot API Rate Limits**

- **Problem**: 20 requests/1s per API key, 100/2m burst
- **Solution**:
  - Cache player data with Upstash Redis (TTL: 1 hour for profiles, 30m for live games)
  - Use background jobs (Inngest) to refresh data asynchronously
  - Implement request queuing

### 2. **Real-time Stats vs API Refresh**

- **Problem**: Stats don't update in real-time; refreshing too often hits rate limits
- **Solution**:
  - Set TanStack Query stale time to 5 minutes
  - Manual "refresh" button with debounce
  - Background jobs refresh every 30-60 minutes
  - Never auto-refresh more than once per minute

### 3. **No Authentication in MVP**

- **Problem**: OAuth setup adds complexity; MVP doesn't need it
- **Solution**:
  - Use public League API endpoints (no token required for basic data)
  - Hardcode summoner names in a config file
  - Add authentication only when adding user accounts (Phase 2+)

### 4. **Historical Data Storage**

- **Problem**: League API only keeps last 20 matches; doesn't track historical rank/LP changes
- **Solution**:
  - Store daily PDL snapshots (rank, LP, win rate)
  - Store the group's finished matches in the DB (they never change; Riot keeps ~2 years)
  - Use Redis to cache current profiles and match-id pages

### 5. **AI Analysis Cost & Latency**

- **Problem**: Claude API calls add latency and cost
- **Solution**:
  - Cache analysis results (rerun only if stats change >10%)
  - Queue analysis requests (batch process at off-peak times)
  - Show loading state; don't block profile view
  - Set max 1 analysis/day per duo (cost control)

---

## 📊 Database Schema (Prisma)

Source of truth: `prisma/schema.prisma` (Prisma 7). Summary:

- **Player** (`players`): `gameName` + `tagLine` (unique pair), `region`, `displayName`, `avatarUrl?` (photo; icon fallback), `puuid?` (unique, filled on first lookup), `active` (hide without deleting).
- **PDLSnapshot** (`pdl_snapshots`): one row per player, queue (`RANKED_SOLO_5x5` / `RANKED_FLEX_SR`) and day (`snapshotDate`, unique key, calendar day in **Brasília**); `capturedAt` holds the exact time of the last capture that day. Fields: `tier`, `rank`, `leaguePoints`, `wins`, `losses`. Updated on every fresh Riot read of a group player (cache miss or forced reload) and finally by the daily close `/api/cron/fechamento` at 23h Brasília (Vercel Cron, `CRON_SECRET`).
- **Match** (`matches`): one row per finished match (`id` = Riot match id), with the validated match-v5 payload in `data` (JSON). Fetched from Riot once, read from the DB forever after.
- **PlayerMatch** (`player_matches`): a group member's line in a match (`playedAt`, `queueId`, `championName`, `position`, `win`, K/D/A); every group member in a stored match gets one. Profile lists and stats read from here.
- **DuoAnalysis** (`duo_analyses`): Phase 3; `player1`/`player2` relations, score and AI text, `cachedUntil`.

### Database Approach

- **Prisma 7 specifics**: the generator is `prisma-client` with output in `src/generated/prisma` (gitignored, created by `postinstall`). Connection URLs are not in the schema: migrations use `DIRECT_URL` via `prisma.config.ts`; runtime uses `DATABASE_URL` (Supabase transaction pooler) via the `@prisma/adapter-pg` driver in `src/lib/db.ts`.
- **Server only**: `src/lib/db.ts` and `src/services/playerService.ts` import `server-only`; client components receive data as props.
- **Cache (Upstash Redis)**: `src/lib/cache.ts` (`cached`, `invalidate`, `acquireLock`), keys prefixed by `CACHE_PREFIX` (`riftlytics:` in prod, `test:<id>:` per test file). TTLs in `RIOT_API_CONSTANTS.CACHE_SECONDS`: profile + rank 10 min, match-id pages 10 min, PUUID 30 days, forced-reload lock 2 min per player.
- **Match data** (`src/services/matchService.ts`): stored in the DB. New matches come in when a profile opens (its 20 newest ids, 10-min cache), on "Atualizar" and in the daily close (up to 100 back, stopping at the first stored one). Profile pages after the first and the champion/role stats read the DB; only past the stored history does it continue from Riot. Matches are stored oldest first so an interrupted run never leaves a gap. First load: `npm run fechamento -- http://localhost:<port>` against the local dev server (~15 min).
- **Profiles**: only tracked players have a profile page (`/perfil/[region]/[Name-TAG]`); searching other players is out of scope for now.
- **RLS** is enabled on Supabase tables; Prisma connects as the owner and is not affected.

---

## 🚀 Development Workflow

### Environment Setup - MVP

```bash
# Required .env.local variables (MVP)
RIOT_API_KEY=                     # From Riot Developer Portal (dev keys expire every 24h)

DATABASE_URL=                     # Supabase pooler (port 6543, ?pgbouncer=true), used by the app
DIRECT_URL=                       # Supabase session/direct (port 5432), used by migrations

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional for Phase 2+
UPSTASH_REDIS_REST_URL=          # Shared cache + refresh locks (required)
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=                     # Protects /api/cron/*

INNGEST_EVENT_KEY=               # For background jobs (Phase 2)
INNGEST_SIGNING_KEY=

OPENAI_API_KEY=                   # For Phase 3 (AI analysis)
```

### API Endpoints

```
GET    /api/profile/[summonerName]    - Summoner + Solo/Duo and Flex rank + PDL history (home cards)
GET    /api/rank/[summonerName]       - Rank only (ranking page); same 10-min cache as profile
GET    /api/matches/[summonerName]    - Paginated match history of a group player, from the DB (?start, ?count)
POST   /api/refresh/[summonerName]    - Forced reload of a group player: rank, today's PDL and new matches (1 per player / 2 min, 429 + Retry-After)
GET    /api/cron/fechamento           - Daily close: final PDL snapshot + new matches (Vercel Cron, Bearer CRON_SECRET)
```

All Riot calls go through `leagueApiService` and the Redis-backed limiter in `src/lib/riot-limiter.ts` (`@upstash/ratelimit`, 90% of 20/1s and 100/2min). Its counters live in Redis, so every server instance shares one Riot quota; a Riot 429 pauses all of them for `Retry-After`. Region defaults to `br1` (`RIOT_API_CONSTANTS.DEFAULT_REGION`).

### Useful Commands

```bash
npm run test                # unit tests (offline; what CI runs)
npm run test:integration    # real Riot API + Supabase (local, needs .env.local)
npm run test:ui             # real components/pages through the real routes (local)
npm run test:all            # every suite + the 90% coverage gate (local)
npm run prisma:migrate      # create + apply a migration after editing the schema
npm run prisma:seed         # seed initial players
npm run fechamento          # run the daily close on a server (first run loads 100 matches per player)
npm run prisma:studio       # browse/edit data (e.g. avatarUrl)
```

### Future Endpoints (Phase 2+)

```
POST   /api/pdl/snapshot              - Store daily PDL snapshot (background job)
GET    /api/players                   - List all tracked players
POST   /api/analysis/duo              - Trigger duo compatibility analysis
GET    /api/cache/invalidate          - Admin endpoint
```

### Testing Strategy

TDD, with tests that run the **real application**: nothing of ours is mocked, so a wrong change in the app makes a test fail. Minimum coverage: **90%** (statements, branches, functions, lines), measured over all suites together.

| Suite       | Files                   | What it runs                                                                                            | Where             |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| unit        | `*.test.ts(x)`          | Pure logic (limiter, rank order, Riot ID, labels, errors, logger)                                       | local + GitHub CI |
| integration | `*.integration.test.ts` | Routes, services, cron and DB against the real Riot API + Supabase                                      | local only        |
| ui          | `*.ui.test.tsx`         | Real components/pages; `fetch('/api/...')` is bridged to the real route handlers (`jest/api-bridge.ts`) | local only        |

- Only what is outside our control and can't be triggered safely is faked: Riot's HTTP answer for 429/5xx/timeouts, and the clock in the token-bucket math.
- Expected values come from the app's own helpers/constants (e.g. `compareRank`, `formatTier`), never hardcoded copies.
- Integration and ui tests need `.env.local` (`RIOT_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `UPSTASH_REDIS_REST_*`), write today's PDL snapshots to the real DB (idempotent) and use their own Redis key prefix, deleted at the end of each file.
- GitHub CI runs only lint, Prettier, `tsc`, build and the unit suite (no paid resources).

---

## 📝 Code Style & Standards

- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **API Routes**: RESTful structure, proper status codes
- **Error Handling**: Use Zod for validation, custom error classes
- **Comments**: Document why, not what; include links to Riot API docs

---

## 🎓 Learning Resources

- [Riot API Documentation](https://developer.riotgames.com/docs)
- [League of Legends Wiki](https://leagueoflegends.fandom.com/wiki/League_of_Legends_Wiki)
- [TanStack Query Guide](https://tanstack.com/query/latest)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Inngest Workflows](https://www.inngest.com/docs/guides/nextjs)

---

## 🔐 Security Checklist - MVP

- [ ] Never commit API keys (use .env.local)
- [ ] Validate all Riot API responses with Zod
- [ ] Implement rate limiting on API routes (use Next.js middleware)
- [ ] Track League API rate limit headers
- [ ] Log API errors (not sensitive data)
- [ ] Monitor Supabase connection limits

---

## 📈 Monitoring & Analytics

Add instrumentation for:

- API response times (track rate limit hits)
- Cache hit/miss ratios
- AI analysis latency & costs
- Error rates by endpoint
- User engagement metrics

Tools: Vercel Analytics, Sentry for errors, custom dashboards

---

## 💡 Future Enhancements

1. **Mobile App**: React Native version
2. **Discord Bot**: Query profiles via Discord commands
3. **Team Builder**: AI-powered team comp generator
4. **Patch Notes Integration**: Auto-update context when patches change
5. **Live Game Spectating**: Web interface for watching friend games
6. **Ranked 5v5 Tracker**: Team performance analytics
7. **Betting/Prediction Market**: Predict outcomes of duo games
8. **Community Features**: Leaderboards, player profiles, guides

---

_Last Updated: October 17, 2026_
_Maintainer: Your Team_
