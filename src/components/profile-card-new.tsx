/**
 * ProfileCard Component
 * Displays a player's profile with rank, stats, and champions
 */

'use client';

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useProfileQuery } from '@/src/queries/useProfileQuery';
import { isRateLimitError } from '@/src/queries/useRankQuery';
import { RankBadge } from './rank-badge';
import { StatItem } from './stat-item';
import { WinRateBar } from './win-rate-bar';
import { Card } from './ui/card';

interface ProfileCardProps {
  gameName: string;
  tagLine: string;
  displayName: string;
  region?: string;
  pdlHistory?: PdlHistoryPoint[];
}

type PdlHistoryPoint = {
  capturedAt: string;
  leaguePoints: number;
};

function formatChartLabel(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
  });
}

export function ProfileCard({
  gameName,
  tagLine,
  displayName,
  region = 'na1',
  pdlHistory: presetPdlHistory = [],
}: ProfileCardProps): React.ReactElement {
  // Construct the full summoner ID (gameName#tagLine)
  const summonerId = `${gameName}#${tagLine}`;
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useProfileQuery(summonerId, { region });

  if (isLoading) {
    return (
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-center h-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            <p className="text-muted-foreground">Carregando {displayName}...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center h-40 gap-4">
          <AlertCircle className="h-8 w-8 text-foreground" />
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {isRateLimitError(error)
                ? 'Muitas consultas seguidas'
                : 'Falha ao carregar o perfil'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRateLimitError(error)
                ? `A Riot limitou nossas requisições por um instante. Recarregue a página em ${error.retryAfter ?? 60}s.`
                : error instanceof Error
                  ? error.message
                  : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground">Sem dados de perfil</p>
      </Card>
    );
  }

  const rankInfo = profile.rankInfo;
  const pdlHistory: PdlHistoryPoint[] =
    profile.pdlHistory && profile.pdlHistory.length > 0
      ? profile.pdlHistory
      : presetPdlHistory;
  return (
    <Card className="gap-0 overflow-hidden border-border bg-card py-0 shadow-sm transition-colors duration-200 hover:border-foreground/20">
      <article className="divide-y divide-border">
        {/* Row 1: identity + rank */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {profile.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Nível {profile.summonerLevel}
            </p>
          </div>
          {rankInfo ? (
            <RankBadge
              tier={rankInfo.tier}
              rank={rankInfo.rank}
              leaguePoints={rankInfo.leaguePoints}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda sem ranque no Solo/Duo
            </p>
          )}
        </header>

        {/* Row 2: record + win rate bar */}
        {rankInfo && (
          <section
            aria-label="Desempenho no Solo/Duo"
            className="grid grid-cols-3 gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)] sm:items-center"
          >
            <StatItem
              label="Partidas"
              value={rankInfo.wins + rankInfo.losses}
              highlight
            />
            <StatItem label="Vitórias" value={rankInfo.wins} />
            <StatItem label="Derrotas" value={rankInfo.losses} />
            <WinRateBar
              wins={rankInfo.wins}
              losses={rankInfo.losses}
              className="col-span-3 sm:col-span-1"
            />
          </section>
        )}

        {/* Row 3: PDL history */}
        <section aria-label="Histórico de PDL" className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Histórico de PDL
            </p>
            <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {pdlHistory.length} pts
            </span>
          </div>

          <div className="h-28 w-full">
            {pdlHistory.length > 1 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={112}
              >
                <LineChart data={pdlHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="capturedAt"
                    tickFormatter={formatChartLabel}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      color: 'var(--foreground)',
                    }}
                    labelFormatter={(label) => formatChartLabel(String(label))}
                    formatter={(value) => [`${value} PDL`, 'Pontos de liga']}
                  />
                  <Line
                    type="monotone"
                    dataKey="leaguePoints"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: 'var(--background)',
                      stroke: 'var(--primary)',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Ainda não há registros de PDL suficientes
              </div>
            )}
          </div>
        </section>
      </article>
    </Card>
  );
}
