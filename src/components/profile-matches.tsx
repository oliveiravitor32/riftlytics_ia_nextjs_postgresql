/**
 * ProfileMatches Component
 * Champion and role stats over every stored match (computed on the server)
 * plus the paginated match history.
 */

'use client';

import React, { useMemo } from 'react';
import type { MatchStats } from '@/src/services/matchService';
import { Loader2 } from 'lucide-react';
import { useMatchHistoryQuery } from '@/src/queries/useMatchHistoryQuery';
import GameResumeCard from './game-resume-card';
import { Button } from './ui/button';
import { Card } from './ui/card';

const PAGE_SIZE = 10;

export function ProfileMatches({
  riotId,
  region,
  stats,
}: {
  riotId: string;
  region: string;
  stats: MatchStats;
}): React.ReactElement {
  const query = useMatchHistoryQuery(riotId, region, PAGE_SIZE);
  const matches = useMemo(
    () => query.data?.pages.flatMap((p) => p.matches) ?? [],
    [query.data]
  );
  const { champions, roles, total } = stats;

  if (query.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Carregando partidas...
      </p>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Não foi possível carregar as partidas:{' '}
        {query.error instanceof Error ? query.error.message : 'erro'}
      </p>
    );
  }

  return (
    <>
      {total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="gap-3 px-4 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Campeões mais jogados
            </h2>
            <ul className="space-y-2">
              {champions.map((c) => (
                <li key={c.champion} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Data Dragon CDN */}
                  <img
                    src={c.image}
                    alt=""
                    className="size-8 rounded-md border border-border"
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {c.champion}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.games} {c.games === 1 ? 'partida' : 'partidas'} ·{' '}
                    {Math.round((c.wins / c.games) * 100)}% ·{' '}
                    {((c.kills + c.assists) / Math.max(1, c.deaths)).toFixed(2)}{' '}
                    AMA
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-3 px-4 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Distribuição de rotas
            </h2>
            <ul className="space-y-2">
              {roles.map(({ role, games }) => {
                const pct = Math.round((games / total) * 100);
                return (
                  <li key={role} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{role}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              Com base nas {total} partidas guardadas
            </p>
          </Card>
        </div>
      )}

      <section aria-labelledby="titulo-partidas" className="space-y-3">
        <h2
          id="titulo-partidas"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Partidas recentes
        </h2>
        {matches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
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
      </section>
    </>
  );
}
