/**
 * StatItem Component
 * Displays a single stat with label and value
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  className?: string;
}

export function StatItem({
  label,
  value,
  unit = '',
  highlight = false,
  className,
}: StatItemProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'text-base font-semibold tracking-tight',
          highlight ? 'text-foreground' : 'text-foreground/90'
        )}
      >
        {value}
        {unit && <span className="text-sm text-muted-foreground"> {unit}</span>}
      </span>
    </div>
  );
}
