/**
 * RankBadge Component
 * Displays rank tier and league points
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface RankBadgeProps {
  tier: string;
  rank: string;
  leaguePoints: number;
  className?: string;
}

export function RankBadge({
  tier,
  rank,
  leaguePoints,
  className,
}: RankBadgeProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-end gap-2', className)}>
      <div
        className={cn(
          'rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground'
        )}
      >
        {tier} {rank}
      </div>
      <div className="text-xs text-muted-foreground">
        {leaguePoints} <span className="text-foreground/70">PDL</span>
      </div>
    </div>
  );
}
