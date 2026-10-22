/**
 * Matchup tips (/api/matchup). Never retried: a failed answer may have
 * already spent one of the AI's few free requests.
 */

import { useQuery } from '@tanstack/react-query';
import type { Matchup } from '@/src/services/matchupService';
import { getJson } from './api-client';

export function useMatchupQuery(pair: { a: string; b: string } | null) {
  return useQuery({
    queryKey: ['matchup', pair?.a, pair?.b],
    queryFn: () =>
      getJson<Matchup>(
        `/api/matchup?a=${encodeURIComponent(pair!.a)}&b=${encodeURIComponent(pair!.b)}`
      ),
    enabled: pair !== null,
    // Stored for 2 months on the server; no need to ask again in a session
    staleTime: Infinity,
    // Kept while the app is open, so leaving the tab and coming back shows the
    // answer, or picks up the search still running, instead of asking again
    gcTime: Infinity,
    retry: false,
  });
}
