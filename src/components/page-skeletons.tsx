/**
 * Page placeholders shown by each route's loading.tsx while the server
 * renders it: the click changes the screen at once instead of freezing on
 * the old page. Shapes follow the real layouts so nothing jumps.
 */

import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import {
  MatchListSkeleton,
  MatchStatsSkeleton,
  PdlChartSkeleton,
  QueueCardSkeleton,
} from './profile-skeletons';

function PageShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto max-w-5xl space-y-6 px-4 py-8"
    >
      {children}
    </div>
  );
}

function TitleSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** A player card of the home page */
function PlayerCardSkeleton() {
  return (
    <Card className="gap-0 divide-y divide-border py-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="flex items-center gap-6 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
        <Skeleton className="h-2 flex-1" />
      </div>
      <div className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
    </Card>
  );
}

export function HomeSkeleton() {
  return (
    <PageShell label="Carregando jogadores">
      <TitleSkeleton />
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <PlayerCardSkeleton key={i} />
        ))}
      </div>
    </PageShell>
  );
}

export function RankingSkeleton() {
  return (
    <PageShell label="Carregando ranking">
      <TitleSkeleton />
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-border px-4 py-4"
          >
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function MatchupsSkeleton() {
  return (
    <PageShell label="Carregando matchups">
      <TitleSkeleton />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {[0, 1].map((i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <Skeleton className="h-12 w-28" />
      </div>
    </PageShell>
  );
}

export function ProfileSkeleton() {
  return (
    <PageShell label="Carregando perfil">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <QueueCardSkeleton title="Solo/Duo" />
        <QueueCardSkeleton title="Ranqueada Flex" />
      </div>
      <Card className="p-4">
        <PdlChartSkeleton />
      </Card>
      <MatchStatsSkeleton />
      <MatchListSkeleton />
    </PageShell>
  );
}
