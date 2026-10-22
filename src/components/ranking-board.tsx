/**
 * RankingBoard Component
 * Ranks preset players by queue (Solo/Duo and Flex) using tier, division and LP
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Crown, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrackedPlayer } from '@/src/services/playerService';
import type { TopChampion } from '@/src/services/topChampionsService';
import { TopChampions } from './top-champions';
import { RankEmblem } from './rank-emblem';
import { rankQueryOptions, refreshRank } from '@/src/queries/useRankQuery';
import { isRateLimitError } from '@/src/queries/api-client';
import { Button } from './ui/button';
import { formatTier } from '@/src/lib/rank-labels';
import { compareRank } from '@/src/lib/rank-order';
import { PlayerAvatar } from './player-avatar';
import { profileHref } from '@/src/lib/riot-id';
import Link from 'next/link';
import type { LeagueEntry } from '@/src/lib/validators';

type QueueTab = {
  id: 'solo' | 'flex';
  label: string;
  field: 'rankInfo' | 'flexRankInfo';
};

const TABS: QueueTab[] = [
  { id: 'solo', label: 'Solo/Duo', field: 'rankInfo' },
  { id: 'flex', label: 'Ranqueada Flex', field: 'flexRankInfo' },
];

// Top 3 fade from citrus to peach to warm mist (palette order), 4th+ are neutral
const PODIUM_STYLES = [
  {
    row: 'border-primary/70 bg-linear-to-r from-primary/20 via-card to-card',
    badge: 'border-primary bg-primary text-primary-foreground',
    crown: 'fill-primary text-primary',
  },
  {
    row: 'border-accent/60 bg-linear-to-r from-accent/15 via-card to-card',
    badge: 'border-accent bg-accent text-accent-foreground',
    crown: 'fill-accent text-accent',
  },
  {
    row: 'border-[#d9d4ce]/50 bg-linear-to-r from-[#d9d4ce]/10 via-card to-card',
    badge: 'border-[#d9d4ce] bg-[#d9d4ce] text-[#171513]',
    crown: 'fill-[#d9d4ce] text-[#d9d4ce]',
  },
];

type RankingRow = {
  riotId: string;
  name: string;
  champions: TopChampion[];
  avatarUrl?: string | null;
  gameName: string;
  tagLine: string;
  region: string;
  entry: LeagueEntry | null;
  isLoading: boolean;
  isError: boolean;
  isRateLimited: boolean;
};

export function RankingBoard({
  players,
  topChampions = {},
}: {
  players: TrackedPlayer[];
  /** Top 3 by player id */
  topChampions?: Record<string, TopChampion[]>;
}): React.ReactElement {
  const [activeTab, setActiveTab] = useState<QueueTab['id']>('solo');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const results = useQueries({
    queries: players.map((s) =>
      rankQueryOptions(`${s.gameName}#${s.tagLine}`, s.region)
    ),
  });

  // Rate limit: cooldown ends at the latest "error time + Retry-After"
  const cooldownUntil = Math.max(
    0,
    ...results.map((r) =>
      isRateLimitError(r.error)
        ? r.errorUpdatedAt + (r.error.retryAfter ?? 60) * 1000
        : 0
    )
  );
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isRateLimited = secondsLeft > 0;

  // Ticks the countdown only while the cooldown is active
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const lastUpdated = Math.max(0, ...results.map((r) => r.dataUpdatedAt));

  // Forced reload on the server (drops its 10-minute cache)
  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.allSettled(
      players.map((s) => {
        const riotId = `${s.gameName}#${s.tagLine}`;
        return queryClient.fetchQuery({
          ...rankQueryOptions(riotId, s.region),
          queryFn: () => refreshRank(riotId),
          staleTime: 0,
        });
      })
    );
    setNow(Date.now());
    setIsRefreshing(false);
  }

  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const rows: RankingRow[] = players.map((s, i) => ({
    riotId: `${s.gameName}#${s.tagLine}`,
    champions: topChampions[s.id] ?? [],
    name: results[i].data?.name ?? s.gameName,
    avatarUrl: s.avatarUrl,
    gameName: s.gameName,
    tagLine: s.tagLine,
    region: s.region,
    entry: results[i].data?.[tab.field] ?? null,
    isLoading: results[i].isLoading,
    isError: results[i].isError,
    isRateLimited: isRateLimitError(results[i].error),
  }));

  const ranked = rows
    .filter((r) => r.entry)
    .sort((a, b) => compareRank(a.entry!, b.entry!));
  const unranked = rows.filter((r) => !r.entry);
  const isLoading = results.some((r) => r.isLoading);

  // Arrow-key navigation, following the WAI-ARIA tabs pattern
  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    const next = (index + delta + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      {isRateLimited && (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 opacity-80"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Calma aí, muitas consultas seguidas!
            </p>
            <p>
              Mostramos o que já estava salvo; tente atualizar de novo em{' '}
              <span aria-live="polite">{secondsLeft}s</span>.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Fila ranqueada"
          className="inline-flex gap-1 rounded-md border border-border bg-card/80 p-1"
        >
          {TABS.map((t, i) => {
            const selected = t.id === activeTab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`aba-${t.id}`}
                aria-selected={selected}
                aria-controls={`painel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(t.id)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated > 0 && (
            <p className="text-xs text-muted-foreground">
              Atualizado às{' '}
              <time dateTime={new Date(lastUpdated).toISOString()}>
                {new Date(lastUpdated).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </p>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading || isRateLimited}
            className="rounded-md"
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <section
        role="tabpanel"
        id={`painel-${tab.id}`}
        aria-labelledby={`aba-${tab.id}`}
        aria-busy={isLoading}
        tabIndex={0}
      >
        <h2 className="sr-only">Ranking da {tab.label}</h2>

        {isLoading && (
          <p className="mb-4 flex items-center gap-2 text-muted-foreground">
            <Loader2
              className="size-4 animate-spin opacity-70"
              aria-hidden="true"
            />
            Carregando jogadores...
          </p>
        )}

        <ol className="space-y-6 pt-4">
          {ranked.map((row, i) => {
            const { tier, rank, leaguePoints, wins, losses } = row.entry!;
            const total = wins + losses;
            const winRate = total > 0 ? (wins / total) * 100 : 0;
            const podium = PODIUM_STYLES[i];
            return (
              <li
                key={row.riotId}
                className={cn(
                  'relative flex items-center gap-2 rounded-md border border-border bg-card p-3 shadow-card sm:gap-4 sm:p-4',
                  podium?.row
                )}
              >
                {/* Position on the top-left corner, sticking out of the card;
                    a crown over the top 3 */}
                <span
                  className={cn(
                    'absolute -left-3 -top-3 flex size-8 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold shadow-card',
                    podium?.badge
                  )}
                  aria-label={`${i + 1}º lugar`}
                >
                  {podium ? (
                    <Crown
                      aria-hidden="true"
                      className={cn(
                        'absolute -top-4 left-1/2 size-5 -translate-x-1/2',
                        podium.crown
                      )}
                    />
                  ) : null}
                  {i + 1}
                </span>
                <PlayerAvatar
                  name={row.name}
                  src={row.avatarUrl}
                  className="size-8 sm:size-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    <Link
                      href={profileHref(row.region, row.gameName, row.tagLine)}
                      className="hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {wins}V {losses}D · {winRate.toFixed(1)}%
                    <span className="hidden sm:inline"> de vitórias</span>
                  </p>
                </div>
                <div className="hidden sm:block">
                  <TopChampions champions={row.champions} />
                </div>
                <div className="shrink-0 text-right sm:w-40">
                  <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider sm:text-sm">
                    {formatTier(tier, rank)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leaguePoints} PDL
                  </p>
                </div>
                <RankEmblem
                  tier={tier}
                  rank={rank}
                  className="size-10 sm:size-14"
                />
              </li>
            );
          })}
        </ol>

        {!isLoading && ranked.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-muted-foreground">
            Ninguém está ranqueado na {tab.label} ainda.
          </p>
        )}

        {!isLoading && unranked.length > 0 && (
          <aside className="mt-8" aria-labelledby={`sem-ranque-${tab.id}`}>
            <h3
              id={`sem-ranque-${tab.id}`}
              className="mb-2 text-sm font-semibold text-muted-foreground"
            >
              Sem ranque na {tab.label}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {unranked.map((row) => (
                <li
                  key={row.riotId}
                  className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {row.name}
                  {row.isError &&
                    (row.isRateLimited
                      ? ' (limite de requisições)'
                      : ' (erro ao carregar)')}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </section>
    </div>
  );
}
