import { cn } from '@/lib/utils';
import { formatTier, rankEmblem } from '@/src/lib/rank-labels';

/**
 * The tier's crest, to read the rank at a glance. The emblem picture is 16:9
 * with the crest in a square near its middle (same spot for every tier,
 * measured on the files), so it's zoomed in and centered on that square.
 */
export function RankEmblem({
  tier,
  rank = '',
  className,
}: {
  tier: string | null;
  rank?: string;
  /** Size, e.g. "size-12" */
  className?: string;
}) {
  const { src, cropped } = rankEmblem(tier);
  const label = tier ? formatTier(tier, rank) : 'Sem ranque';

  return (
    <span
      className={cn(
        'relative inline-block size-12 shrink-0 overflow-hidden',
        className
      )}
      title={label}
    >
      <img
        src={src}
        alt={`Emblema ${label}`}
        className={cn(
          'absolute',
          cropped
            ? 'left-1/2 top-1/2 h-[197%] w-auto max-w-none -translate-x-[50.25%] -translate-y-[48.5%]'
            : 'inset-[15%] size-[70%] opacity-70'
        )}
      />
    </span>
  );
}
