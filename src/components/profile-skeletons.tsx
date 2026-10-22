/**
 * Loading placeholders of the profile page. Each one has the shape and size
 * of the component that replaces it, so the page doesn't jump when data
 * arrives, and is announced to screen readers as loading.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

const sectionTitle =
  'text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground';

function Loading({
  label,
  className,
  style,
  as: Tag = 'div',
  children,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'ul';
  children: React.ReactNode;
}) {
  return (
    <Tag
      role="status"
      aria-label={label}
      aria-busy="true"
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/** "Nível 123 · BR1" line under the Riot ID */
export function SummonerLevelSkeleton() {
  return (
    <Loading label="Carregando nível" className="py-0.5">
      <Skeleton className="h-4 w-28" />
    </Loading>
  );
}

/** Same frame as the profile's QueueCard */
export function QueueCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="gap-2 px-4 py-3">
      <h2 className={sectionTitle}>{title}</h2>
      <Loading label={`Carregando ${title}`} className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-md" />
      </Loading>
    </Card>
  );
}

export function PdlChartSkeleton({ height = 112 }: { height?: number }) {
  return (
    <Loading
      label="Carregando histórico de PDL"
      className="flex items-end gap-1.5 pt-2"
      style={{ height }}
    >
      {/* Bars of varying height hint at a chart */}
      {[40, 55, 45, 70, 60, 80, 65, 75, 50, 85, 70, 90].map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-md"
          style={{ height: `${h}%` }}
        />
      ))}
    </Loading>
  );
}

/** "Campeões mais jogados" and "Distribuição de rotas" cards */
export function MatchStatsSkeleton() {
  return (
    <Loading
      label="Carregando estatísticas"
      className="grid gap-3 sm:grid-cols-2"
    >
      <Card className="gap-2 px-4 py-3">
        <h2 className={sectionTitle}>Campeões mais jogados</h2>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="gap-2 px-4 py-3">
        <h2 className={sectionTitle}>Distribuição de rotas</h2>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-44" />
      </Card>
    </Loading>
  );
}

/** Same frame as GameResumeCard */
export function GameResumeCardSkeleton() {
  return (
    <Card className="max-w-150 w-full justify-center gap-0 py-3">
      <CardHeader className="pb-0">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="m-0 p-0">
        <div className="grid gap-3 p-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 rounded-md" />
              <Skeleton className="size-11 rounded-md" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
              <div className="mx-2 flex gap-1.5">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="size-6 rounded-md" />
                ))}
              </div>
            </div>
            <div className="flex gap-2 p-1.5">
              <Skeleton className="size-8" />
              <Skeleton className="size-8" />
            </div>
          </div>
          <div className="flex gap-2">
            {[0, 1].map((side) => (
              <div key={side} className="min-w-32 space-y-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-6" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading as="ul" label="Carregando partidas" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <GameResumeCardSkeleton />
        </li>
      ))}
    </Loading>
  );
}
