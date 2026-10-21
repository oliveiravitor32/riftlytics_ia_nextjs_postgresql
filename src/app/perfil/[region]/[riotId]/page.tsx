/**
 * Profile page: /perfil/[region]/[Name-TAG]
 * Rank for both queues, real PDL history, champion/role stats over every
 * stored match and the match history. Group players only.
 *
 * The frame (name, avatar, titles) renders at once; every part that needs
 * Riot or the DB streams in on its own (./sections.tsx), with a placeholder
 * of the same shape until then.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findTrackedPlayer } from '@/src/services/playerService';
import { parseRiotSlug } from '@/src/lib/riot-id';
import { PlayerAvatar } from '@/src/components/player-avatar';
import { Card } from '@/src/components/ui/card';
import {
  MatchListSkeleton,
  MatchStatsSkeleton,
  PdlChartSkeleton,
  QueueCardSkeleton,
  SummonerLevelSkeleton,
} from '@/src/components/profile-skeletons';
import {
  PdlHistory,
  ProfileStats,
  QueueCards,
  RecentMatches,
  SummonerLevel,
} from './sections';

type Params = { region: string; riotId: string };

const PDL_CHART_HEIGHT = 110;
const sectionTitle =
  'text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground';

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
  const section = { riotId, region };

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
          <Suspense fallback={<SummonerLevelSkeleton />}>
            <SummonerLevel {...section} />
          </Suspense>
        </div>
      </header>

      <section aria-label="Elo por fila" className="grid gap-3 sm:grid-cols-2">
        <Suspense
          fallback={
            <>
              <QueueCardSkeleton title="Solo/Duo" />
              <QueueCardSkeleton title="Ranqueada Flex" />
            </>
          }
        >
          <QueueCards {...section} />
        </Suspense>
      </section>

      <section aria-labelledby="titulo-pdl">
        <Card className="gap-2 px-4 py-3">
          <h2 id="titulo-pdl" className={sectionTitle}>
            Histórico de PDL · Solo/Duo
          </h2>
          <Suspense fallback={<PdlChartSkeleton height={PDL_CHART_HEIGHT} />}>
            <PdlHistory
              {...section}
              gameName={id.gameName}
              tagLine={id.tagLine}
              height={PDL_CHART_HEIGHT}
            />
          </Suspense>
        </Card>
      </section>

      <Suspense fallback={<MatchStatsSkeleton />}>
        <ProfileStats {...section} />
      </Suspense>

      <section aria-labelledby="titulo-partidas" className="space-y-3">
        <h2 id="titulo-partidas" className={sectionTitle}>
          Partidas recentes
        </h2>
        <Suspense fallback={<MatchListSkeleton />}>
          <RecentMatches {...section} />
        </Suspense>
      </section>
    </div>
  );
}
