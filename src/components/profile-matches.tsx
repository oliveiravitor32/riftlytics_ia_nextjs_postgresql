/**
 * ProfileMatches Component
 * Paginated match history of a profile (stats are in MatchStatsCards)
 */

'use client';

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useMatchHistoryQuery } from '@/src/queries/useMatchHistoryQuery';
import GameResumeCard from './game-resume-card';
import { Button } from './ui/button';
import { MatchListSkeleton } from './profile-skeletons';

const PAGE_SIZE = 10;

export function ProfileMatches({
  riotId,
  region,
}: {
  riotId: string;
  region: string;
}): React.ReactElement {
  const query = useMatchHistoryQuery(riotId, region, PAGE_SIZE);
  const matches = useMemo(
    () => query.data?.pages.flatMap((p) => p.matches) ?? [],
    [query.data]
  );

  if (query.isLoading) return <MatchListSkeleton />;

  if (query.isError) {
    return (
      <p role="alert" className="max-w-prose text-muted-foreground">
        Não foi possível carregar as partidas:{' '}
        {query.error instanceof Error ? query.error.message : 'erro'}
      </p>
    );
  }

  return (
    <>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
          Nenhuma partida recente encontrada.
        </p>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <li key={match.matchId ?? `${match.champion}-${match.duration}`}>
              <GameResumeCard match={match} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full rounded-full"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Carregando...
            </>
          ) : (
            'Carregar mais partidas'
          )}
        </Button>
      )}
    </>
  );
}
