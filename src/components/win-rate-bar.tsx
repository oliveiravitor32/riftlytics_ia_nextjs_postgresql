/**
 * WinRateBar Component
 * Displays win rate as a visual progress bar
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WinRateBarProps {
  wins: number;
  losses: number;
  className?: string;
}

export function WinRateBar({
  wins,
  losses,
  className,
}: WinRateBarProps): React.ReactElement {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">Taxa de vitória</span>
        <span className="font-semibold text-foreground">
          {winRate.toFixed(1)}% ({wins}V {losses}D)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${winRate}%` }}
        />
      </div>
    </div>
  );
}
