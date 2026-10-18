/**
 * Profile page: /perfil/[region]/[Name-TAG]
 * Rank for both queues, real PDL history, champion/role stats over every
 * stored match and the match history. Group players only.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { getRankedProfile } from '@/src/services/profileService';
import { findTrackedPlayer } from '@/src/services/playerService';
import { getPdlHistory } from '@/src/services/snapshotService';
import { getMatchStats, syncRecentMatches } from '@/src/services/matchService';
import { NotFoundError, RateLimitError } from '@/src/lib/errors';
import { parseRiotSlug } from '@/src/lib/riot-id';
import { formatTier } from '@/src/lib/rank-labels';
import type { LeagueEntry } from '@/src/lib/validators';
import { PlayerAvatar } from '@/src/components/player-avatar';
import { PdlChart } from '@/src/components/pdl-chart';
import { ProfileMatches } from '@/src/components/profile-matches';
import { Card } from '@/src/components/ui/card';

type Params = { region: string; riotId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const id = parseRiotSlug((await params).riotId);
  return {
    title: id ? `${id.gameName}#${id.tagLine}` : 'Perfil',
    description: 'Elo, histórico de PDL e partidas recentes',
  };
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

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { region, riotId: slug } = await params;
  const id = parseRiotSlug(slug);
  if (!id) notFound();
  // Only the group's players have a profile for now (no search of others)
  const tracked = await findTrackedPlayer(id.gameName, id.tagLine);
  if (!tracked || tracked.region !== region) notFound();

  const riotId = `${id.gameName}#${id.tagLine}`;

  let data;
  try {
    const { profile } = await getRankedProfile(riotId, region);
    // Read after the profile: a cache miss has just updated today's snapshot
    const pdlHistory = await getPdlHistory(id.gameName, id.tagLine);
    // New games first, so the stats include them
    await syncRecentMatches(riotId);
    const stats = await getMatchStats(riotId);
    data = { profile, pdlHistory, stats };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof RateLimitError) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p
            role="alert"
            className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
          >
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            Muitas consultas seguidas à Riot. Tente recarregar a página em{' '}
            {error.retryAfter}s.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { profile, pdlHistory, stats } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <header className="flex items-center gap-4">
        <PlayerAvatar
          name={riotId}
          src={tracked.avatarUrl}
          className="size-16"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {id.gameName}
            <span className="text-muted-foreground">#{id.tagLine}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Nível {profile.summonerLevel} · {region.toUpperCase()}
          </p>
        </div>
      </header>

      <section aria-label="Elo por fila" className="grid gap-3 sm:grid-cols-2">
        <QueueCard title="Solo/Duo" entry={profile.rankInfo} />
        <QueueCard title="Ranqueada Flex" entry={profile.flexRankInfo} />
      </section>

      <section aria-labelledby="titulo-pdl">
        <Card className="gap-2 px-4 py-3">
          <h2
            id="titulo-pdl"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Histórico de PDL · Solo/Duo
          </h2>
          <PdlChart data={pdlHistory} height={110} />
        </Card>
      </section>

      <ProfileMatches riotId={riotId} region={region} stats={stats} />
    </div>
  );
}
