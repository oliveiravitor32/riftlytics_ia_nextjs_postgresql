/**
 * The signed-in account and whether it may post (/api/me). Asked again when
 * the window regains focus, so a release shows up without signing in again.
 */

import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { SessionUser } from '@/src/services/authService';
import { getJson } from './api-client';

export interface Me {
  user: SessionUser;
  canPost: boolean;
}

export function useMeQuery(session: Session | null | undefined) {
  return useQuery({
    // By account, not token: a token refresh doesn't ask again
    queryKey: ['me', session?.user.id],
    queryFn: () => getJson<Me>('/api/me', session!.access_token),
    enabled: Boolean(session),
    staleTime: 60_000,
    retry: false,
  });
}
