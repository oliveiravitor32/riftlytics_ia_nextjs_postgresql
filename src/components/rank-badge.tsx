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
          'rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground'
        )}
      >
        {formatTier(tier, rank)}
      </div>
      <div className="text-xs text-muted-foreground">
        {leaguePoints} <span className="text-foreground/70">PDL</span>
      </div>
    </div>
  );
}
