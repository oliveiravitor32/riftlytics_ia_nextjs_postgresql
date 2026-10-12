/**
 * Rank queries for the ranking page
 * 5-minute cache; 429 responses become ApiRequestError and are never retried
 */

import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { RankResponse } from '@/src/lib/rank-cache';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function isRateLimitError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 429;
}

export async function fetchRank(
  riotId: string,
  region: string,
  refresh = false
): Promise<RankResponse> {
  const params = new URLSearchParams({ region });
  if (refresh) params.set('refresh', '1');

  const response = await fetch(
    `/api/rank/${encodeURIComponent(riotId)}?${params}`
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const retryAfter =
      Number(body.retryAfter ?? response.headers.get('Retry-After')) ||
      undefined;
    throw new ApiRequestError(
      body.error ?? `Falha ao carregar ranque: ${response.status}`,
      response.status,
      retryAfter
    );
  }

  return response.json();
}

export function rankQueryOptions(riotId: string, region: string) {
  return {
    queryKey: ['rank', riotId, region],
    queryFn: () => fetchRank(riotId, region),
    staleTime: RIOT_API_CONSTANTS.CACHE_TTL.RANKING,
    gcTime: RIOT_API_CONSTANTS.CACHE_TTL.RANKING * 2,
    retry: (failureCount: number, error: Error) =>
      !isRateLimitError(error) && failureCount < 2,
  };
}
