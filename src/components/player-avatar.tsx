/**
 * PlayerAvatar Component
 * Shows the player's photo when `src` is set (will come from the DB),
 * otherwise a neutral user icon. Falls back to the icon if the image fails.
 */

'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function PlayerAvatar({
  name,
  src,
  className,
}: PlayerAvatarProps): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-muted-foreground',
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external DB URLs, domain not known yet
        <img
          src={src!}
          alt={`Foto de ${name}`}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <User className="size-1/2" aria-hidden="true" />
      )}
    </span>
  );
}
