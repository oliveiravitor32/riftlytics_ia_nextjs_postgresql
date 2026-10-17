/**
 * Profile page: /perfil/[region]/[Name-TAG]
 * Rank for both queues, real PDL history and match history with
 * champion/role stats. Works for any Riot ID, not only tracked players.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { getRankedProfile } from '@/src/services/profileService';
import { findTrackedPlayer } from '@/src/services/playerService';
import { getPdlHistory } from '@/src/services/snapshotService';
import { NotFoundError, RateLimitError } from '@/src/lib/errors';
import { parseRiotSlug } from '@/src/lib/riot-id';
import { formatTier } from '@/src/lib/rank-labels';
import type { LeagueEntry } from '@/src/lib/validators';
import { PlayerAvatar } from '@/src/components/player-avatar';
import { StatItem } from '@/src/components/stat-item';
import { WinRateBar } from '@/src/components/win-rate-bar';
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
  return (
    <Card className="gap-3 px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      {entry ? (
        <>
          <p className="text-lg font-semibold">
            {formatTier(entry.tier, entry.rank)}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              · {entry.leaguePoints} PDL
            </span>
          </p>
          <div className="grid grid-cols-3 gap-4">
            <StatItem label="Partidas" value={entry.wins + entry.losses} />
            <StatItem label="Vitórias" value={entry.wins} />
            <StatItem label="Derrotas" value={entry.losses} />
          </div>
          <WinRateBar wins={entry.wins} losses={entry.losses} />
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
    data = { profile, pdlHistory };
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

  const { profile, pdlHistory } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
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

      <section aria-label="Elo por fila" className="grid gap-4 sm:grid-cols-2">
        <QueueCard title="Solo/Duo" entry={profile.rankInfo} />
        <QueueCard title="Ranqueada Flex" entry={profile.flexRankInfo} />
      </section>

      <section aria-labelledby="titulo-pdl">
        <Card className="gap-3 px-4 py-4">
          <h2
            id="titulo-pdl"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Histórico de PDL · Solo/Duo
          </h2>
          <PdlChart data={pdlHistory} height={160} />
        </Card>
      </section>

      <ProfileMatches riotId={riotId} region={region} />
    </div>
  );
}
