/**
 * ProfileCard Component
 * Displays a player's profile with rank, stats, and champions
 */

'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useProfileQuery } from '@/src/queries/useProfileQuery';
import { isRateLimitError } from '@/src/queries/api-client';
import { RankBadge } from './rank-badge';
import { RankEmblem } from './rank-emblem';
import { PlayerAvatar } from './player-avatar';
import { StatItem } from './stat-item';
import { WinRateBar } from './win-rate-bar';
import { Card } from './ui/card';
import { PdlChart } from './pdl-chart';
import { profileHref } from '@/src/lib/riot-id';
import Link from 'next/link';
import { TopChampions } from './top-champions';
import type { TopChampion } from '@/src/services/topChampionsService';

interface ProfileCardProps {
  gameName: string;
  tagLine: string;
  displayName: string;
  region: string;
  avatarUrl?: string | null;
  topChampions?: TopChampion[];
}

export function ProfileCard({
  gameName,
  tagLine,
  displayName,
  region,
  avatarUrl,
  topChampions = [],
}: ProfileCardProps): React.ReactElement {
  // The chart only mounts once the section is opened (closed by default)
  const [historyOpen, setHistoryOpen] = useState(false);
  // Construct the full summoner ID (gameName#tagLine)
  const summonerId = `${gameName}#${tagLine}`;
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useProfileQuery(summonerId, region);

  if (isError) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center h-40 gap-4">
          <AlertCircle
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {isRateLimitError(error)
                ? 'Muitas consultas seguidas'
                : 'Falha ao carregar o perfil'}
            </p>
            <p className="mt-2 max-w-prose text-muted-foreground">
              {isRateLimitError(error)
                ? `Aguarde um instante e recarregue a página em ${error.retryAfter ?? 60}s.`
                : error instanceof Error
                  ? error.message
                  : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading || !profile) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2
              className="h-8 w-8 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">Carregando {displayName}...</p>
          </div>
        </div>
      </Card>
    );
  }

  const rankInfo = profile.rankInfo;
  const pdlHistory = profile.pdlHistory;
  return (
    <Card className="gap-0 py-0 transition-colors duration-200 hover:border-primary/40">
      <article className="divide-y divide-border">
        {/* Row 1: identity + rank */}
        <header className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <PlayerAvatar
              name={profile.name}
              src={avatarUrl}
              className="size-8 sm:size-10"
            />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                <Link
                  href={profileHref(region, gameName, tagLine)}
                  className="hover:text-primary hover:underline"
                >
                  {profile.name}
                </Link>
              </h3>
              {/* Fixed-width level keeps every card's champions aligned */}
              <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2">
                <p className="w-12 shrink-0 text-[11px] text-muted-foreground sm:w-16 sm:text-xs">
                  Nível {profile.summonerLevel}
                </p>
                <TopChampions champions={topChampions} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {rankInfo ? (
              <RankBadge
                tier={rankInfo.tier}
                rank={rankInfo.rank}
                leaguePoints={rankInfo.leaguePoints}
              />
            ) : (
              <p className="text-xs text-muted-foreground sm:text-sm">
                <span className="sm:hidden">Sem ranque</span>
                <span className="hidden sm:inline">
                  Ainda sem ranque no Solo/Duo
                </span>
              </p>
            )}
            <RankEmblem
              tier={rankInfo?.tier ?? null}
              rank={rankInfo?.rank}
              className="size-10 sm:size-14"
            />
          </div>
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
        <details
          className="group"
          onToggle={(e) => setHistoryOpen(e.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Histórico de PDL
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors group-hover:border-primary group-hover:text-primary">
              <span className="group-open:hidden">Mostrar</span>
              <span className="hidden group-open:inline">Ocultar</span>
              <ChevronDown
                className="size-4 opacity-70 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>

          <div className="w-full px-4 pb-3">
            {historyOpen && <PdlChart data={pdlHistory} />}
          </div>
        </details>
      </article>
    </Card>
  );
}
