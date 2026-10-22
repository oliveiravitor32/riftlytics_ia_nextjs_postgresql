/**
 * RankBadge Component
 * Displays rank tier and league points
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { formatTier } from '@/src/lib/rank-labels';

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
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <div
        className={cn(
          'whitespace-nowrap rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.18em]'
        )}
      >
        {formatTier(tier, rank)}
      </div>
      <div className="text-[11px] text-muted-foreground sm:text-xs">
        {leaguePoints} <span className="text-foreground/70">PDL</span>
      </div>
    </div>
  );
}
