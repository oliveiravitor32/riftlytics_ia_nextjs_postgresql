/**
 * RankingBoard Component
 * Ranks preset players by queue (Solo/Duo and Flex) using tier, division and LP
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrackedPlayer } from '@/src/services/playerService';
import {
  fetchRank,
  isRateLimitError,
  rankQueryOptions,
} from '@/src/queries/useRankQuery';
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

// Top 3 fade from citrus to peach to mist (palette order), 4th+ are neutral
const PODIUM_STYLES = [
  {
    row: 'border-primary/70 bg-linear-to-r from-primary/20 via-card to-card',
    badge: 'border-primary bg-primary text-primary-foreground',
  },
  {
    row: 'border-accent/60 bg-linear-to-r from-accent/15 via-card to-card',
    badge: 'border-accent bg-accent text-accent-foreground',
  },
  {
    row: 'border-[#cfd4d7]/50 bg-linear-to-r from-[#cfd4d7]/10 via-card to-card',
    badge: 'border-[#cfd4d7] bg-[#cfd4d7] text-[#111214]',
  },
];

type RankingRow = {
  riotId: string;
  name: string;
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
}: {
  players: TrackedPlayer[];
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

  // Forces a fresh fetch on the server too (bypasses its 5-minute cache)
  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.allSettled(
      players.map((s) => {
        const riotId = `${s.gameName}#${s.tagLine}`;
        return queryClient.fetchQuery({
          ...rankQueryOptions(riotId, s.region),
          queryFn: () => fetchRank(riotId, s.region, true),
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
          className="mb-6 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Calma aí, muitas consultas seguidas!
            </p>
            <p>
              A Riot limitou temporariamente nossas requisições. Mostramos o que
              já estava salvo; tente atualizar de novo em{' '}
              <span aria-live="polite">{secondsLeft}s</span>.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Fila ranqueada"
          className="inline-flex gap-1 rounded-full border border-border bg-card/80 p-1"
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
                  'rounded-full px-5 py-2 text-sm font-medium transition-colors',
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
            className="rounded-full"
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
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Carregando jogadores...
          </p>
        )}

        <ol className="space-y-3">
          {ranked.map((row, i) => {
            const { tier, rank, leaguePoints, wins, losses } = row.entry!;
            const total = wins + losses;
            const winRate = total > 0 ? (wins / total) * 100 : 0;
            const podium = PODIUM_STYLES[i];
            return (
              <li
                key={row.riotId}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm',
                  podium?.row
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold',
                    podium?.badge
                  )}
                  aria-label={`${i + 1}º lugar`}
                >
                  {i + 1}
                </span>
                <PlayerAvatar name={row.name} src={row.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    <Link
                      href={profileHref(row.region, row.gameName, row.tagLine)}
                      className="hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {wins}V {losses}D · {winRate.toFixed(1)}% de vitórias
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold uppercase tracking-wider">
                    {formatTier(tier, rank)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leaguePoints} PDL
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {!isLoading && ranked.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
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
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
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
