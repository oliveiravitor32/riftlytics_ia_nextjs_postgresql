/**
 * Async parts of the profile page. Each one loads its own data and is
 * streamed inside its own Suspense boundary, so whatever arrives first shows
 * first while the rest keeps its placeholder.
 */

import 'server-only';
import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { getRankedProfile } from '@/src/services/profileService';
import { getPdlHistory } from '@/src/services/snapshotService';
import { getMatchStats, syncRecentMatches } from '@/src/services/matchService';
import { NotFoundError, RateLimitError } from '@/src/lib/errors';
import { formatTier } from '@/src/lib/rank-labels';
import type { LeagueEntry } from '@/src/lib/validators';
import { PdlChart } from '@/src/components/pdl-chart';
import { MatchStatsCards } from '@/src/components/match-stats';
import { ProfileMatches } from '@/src/components/profile-matches';
import { Card } from '@/src/components/ui/card';

export type SectionProps = { riotId: string; region: string };

// Shared by the sections of one request: one Riot read, one match sync
const loadProfile = cache(
  async (riotId: string, region: string) =>
    (await getRankedProfile(riotId, region)).profile
);
const syncMatches = cache((riotId: string) => syncRecentMatches(riotId));

export function RateLimitNotice({ retryAfter }: { retryAfter: number }) {
  return (
    <p
      role="alert"
      className="flex max-w-prose gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200"
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 opacity-80"
        aria-hidden="true"
      />
      Muitas consultas seguidas à Riot. Tente recarregar a página em{' '}
      {retryAfter}s.
    </p>
  );
}

/** Known failures become the 404 page or the rate limit notice */
async function guarded(
  render: () => Promise<React.ReactElement>
): Promise<React.ReactElement> {
  try {
    return await render();
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof RateLimitError) {
      return <RateLimitNotice retryAfter={error.retryAfter} />;
    }
    throw error;
  }
}

function QueueCard({
  title,
  entry,
}: {
  title: string;
  entry: LeagueEntry | null;
}) {
  const games = entry ? entry.wins + entry.losses : 0;
  const winRate = games > 0 ? (entry!.wins / games) * 100 : 0;

  return (
    <Card className="gap-2 px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      {entry ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">
              {formatTier(entry.tier, entry.rank)}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                · {entry.leaguePoints} PDL
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {winRate.toFixed(1)}%
              </span>{' '}
              · {entry.wins}V {entry.losses}D
            </p>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Sem ranque nesta fila</p>
      )}
    </Card>
  );
}

export function SummonerLevel({ riotId, region }: SectionProps) {
  return guarded(async () => {
    const profile = await loadProfile(riotId, region);
    return (
      <p className="text-sm text-muted-foreground">
        Nível {profile.summonerLevel} · {region.toUpperCase()}
      </p>
    );
  });
}

export function QueueCards({ riotId, region }: SectionProps) {
  return guarded(async () => {
    const profile = await loadProfile(riotId, region);
    return (
      <>
        <QueueCard title="Solo/Duo" entry={profile.rankInfo} />
        <QueueCard title="Ranqueada Flex" entry={profile.flexRankInfo} />
      </>
    );
  });
}

export function PdlHistory({
  riotId,
  region,
  gameName,
  tagLine,
  height,
}: SectionProps & { gameName: string; tagLine: string; height: number }) {
  return guarded(async () => {
    // After the profile: a cache miss has just updated today's snapshot
    await loadProfile(riotId, region);
    return (
      <PdlChart data={await getPdlHistory(gameName, tagLine)} height={height} />
    );
  });
}

export function ProfileStats({ riotId }: SectionProps) {
  return guarded(async () => {
    // New games first, so the stats include them
    await syncMatches(riotId);
    return <MatchStatsCards stats={await getMatchStats(riotId)} />;
  });
}

export function RecentMatches({ riotId, region }: SectionProps) {
  return guarded(async () => {
    // The list is read from the DB, so it waits for the new games too
    await syncMatches(riotId);
    return <ProfileMatches riotId={riotId} region={region} />;
  });
}
