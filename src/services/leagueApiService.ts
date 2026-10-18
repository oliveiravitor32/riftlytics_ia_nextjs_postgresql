/**
 * League of Legends API Service
 * Handles all interactions with Riot Games API
 * Singleton pattern with built-in retry logic and error handling
 */

import { config } from '@/src/lib/config';
import { logger } from '@/src/lib/logger';
import {
  RiotApiError,
  RateLimitError,
  NotFoundError,
  ExternalServiceError,
} from '@/src/lib/errors';
import {
  SummonerSchema,
  LeagueEntrySchema,
  MatchIdListSchema,
  MatchSchema,
  type Summoner,
  type LeagueEntry,
  type MatchIdList,
  type Match,
} from '@/src/lib/validators';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import { buildGameResumeMatch } from '@/src/lib/match-transformers';
import { riotLimiter } from '@/src/lib/riot-limiter';
import { cached, invalidate } from '@/src/lib/cache';
import type { GameResumeMatch } from '@/src/components/game-resume-card';

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  multiplier: number;
}

const RANKED_QUEUES: string[] = [
  RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO,
  RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR,
];

/**
 * League API Service - Singleton
 */
class LeagueApiService {
  private readonly apiKey: string;
  private readonly regionalBaseUrl: string;
  private readonly requestTimeout: number;
  private readonly retryConfig: RetryConfig;
  private requestCount: number = 0;

  constructor() {
    this.apiKey = config.riotApi.apiKey;
    this.regionalBaseUrl = config.riotApi.baseUrl;
    this.requestTimeout = RIOT_API_CONSTANTS.REQUEST_TIMEOUT_MS;
    this.retryConfig = {
      maxAttempts: RIOT_API_CONSTANTS.RETRY.MAX_ATTEMPTS,
      baseDelayMs: RIOT_API_CONSTANTS.RETRY.BACKOFF_MS,
      multiplier: RIOT_API_CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
    };

    // Don't throw at instantiation - API key may not be available on client side
    // Validation will happen when making actual requests
  }

  /**
   * Resolve a Riot ID (gameName#tagLine) to its PUUID, cached forever
   */
  async getPuuidByRiotId(riotId: string): Promise<string> {
    const [gameName, tagLine = ''] = riotId.split('#');
    const url = `${this.regionalBaseUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    try {
      const { value } = await cached(
        `puuid:${riotId.toLowerCase()}`,
        RIOT_API_CONSTANTS.CACHE_SECONDS.PUUID,
        async () => (await this.makeRequest<{ puuid: string }>(url)).puuid
      );
      return value;
    } catch (error) {
      this.handleApiError(error, { riotId });
    }
  }

  /**
   * Summoner (level, icon) by PUUID; `riotId` becomes its display name
   */
  async getSummonerByPuuid(
    puuid: string,
    region: string,
    riotId: string
  ): Promise<Summoner> {
    const url = `https://${region}.api.riotgames.com${RIOT_API_CONSTANTS.ENDPOINTS.SUMMONER_BY_PUUID}/${puuid}`;

    try {
      const response = await this.makeRequest<unknown>(url);
      return { ...SummonerSchema.parse(response), name: riotId };
    } catch (error) {
      this.handleApiError(error, { puuid, region });
    }
  }

  /**
   * Get league entries (rank information) for a summoner
   */
  async getLeagueEntries(
    puuid: string,
    region: string
  ): Promise<LeagueEntry[]> {
    // by-summoner was removed by Riot; by-puuid is the current endpoint
    // https://developer.riotgames.com/apis#league-v4
    const platformUrl = `https://${region}.api.riotgames.com`;
    const url = `${platformUrl}${RIOT_API_CONSTANTS.ENDPOINTS.LEAGUE_ENTRIES}/${puuid}`;

    logger.debug('Fetching league entries', { puuid, region, url });

    try {
      const response = await this.makeRequest<unknown>(url);
      const validated = Array.isArray(response)
        ? response
            .filter(
              (entry): entry is Record<string, unknown> =>
                entry != null &&
                typeof entry === 'object' &&
                RANKED_QUEUES.includes(
                  (entry as Record<string, unknown>).queueType as string
                )
            )
            .map((entry) => LeagueEntrySchema.parse(entry))
        : [];

      logger.info('League entries fetched', {
        puuid,
        count: validated.length,
      });
      return validated;
    } catch (error) {
      this.handleApiError(error, { puuid, region });
    }
  }

  /**
   * Get match list for a player (10-min cache; `fresh` skips it)
   */
  async getMatchList(
    puuid: string,
    start = 0,
    count: number = RIOT_API_CONSTANTS.DEFAULTS.MATCHES_PER_PAGE,
    { fresh = false } = {}
  ): Promise<MatchIdList> {
    const url = `${this.regionalBaseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
    const key = `partidas:${puuid}:${start}:${count}`;

    logger.debug('Fetching match list', { puuid, start, count });

    try {
      if (fresh) await invalidate(key);
      const { value } = await cached(
        key,
        RIOT_API_CONSTANTS.CACHE_SECONDS.MATCH_IDS,
        async () =>
          MatchIdListSchema.parse(await this.makeRequest<unknown>(url))
      );
      return value;
    } catch (error) {
      this.handleApiError(error, { puuid, start, count });
    }
  }

  /**
   * Match details straight from Riot (matchService stores them in the DB)
   */
  async getMatchDetails(matchId: string): Promise<Match> {
    const url = `${this.regionalBaseUrl}/lol/match/v5/matches/${matchId}`;

    logger.debug('Fetching match details', { matchId });

    try {
      const response = await this.makeRequest<unknown>(url);
      const validated = MatchSchema.parse(response);

      logger.info('Match details fetched', { matchId });
      return validated;
    } catch (error) {
      this.handleApiError(error, { matchId });
    }
  }

  /**
   * Get transformed match history for display
   */
  async getMatchHistoryByPuuid(
    puuid: string,
    start: number = 0,
    count: number = RIOT_API_CONSTANTS.DEFAULTS.MATCHES_PER_PAGE,
    fallbackPlayerName?: string
  ): Promise<GameResumeMatch[]> {
    const matchIds = await this.getMatchList(puuid, start, count);
    // Fired together; the rate limiter decides how many go out at once
    const matches = await Promise.all(
      matchIds.map((matchId) => this.getMatchDetails(matchId))
    );

    return matches.map((match) =>
      buildGameResumeMatch(match, puuid, fallbackPlayerName)
    );
  }

  /**
   * Make HTTP request with retry logic and rate limit handling
   */
  private async makeRequest<T>(url: string, attempt: number = 1): Promise<T> {
    try {
      return await riotLimiter.schedule(async () => {
        // Validate API key is available
        if (!this.apiKey) {
          throw new RiotApiError(
            'RIOT_API_KEY environment variable is not set',
            500,
            { url, attempt }
          );
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Riot-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.requestTimeout),
        });

        this.requestCount++;

        // Check rate limit headers
        const rateLimitHeaders = this.extractRateLimitInfo(response.headers);
        logger.debug('API request completed', {
          status: response.status,
          rateLimitHeaders,
        });

        if (!response.ok) {
          return await this.handleResponseError(response, url);
        }

        return (await response.json()) as T;
      });
    } catch (error) {
      // Retry logic for transient errors
      if (
        attempt < this.retryConfig.maxAttempts &&
        this.isRetriableError(error)
      ) {
        const delayMs =
          this.retryConfig.baseDelayMs *
          Math.pow(this.retryConfig.multiplier, attempt - 1);

        logger.warn('Retrying request', {
          attempt,
          delayMs,
          url,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.makeRequest<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Extract rate limit info from response headers
   */
  private extractRateLimitInfo(headers: Headers): Record<string, string> {
    return {
      limitCount: headers.get('X-RateLimit-Count') || 'unknown',
      limitLimit: headers.get('X-RateLimit-Limit') || 'unknown',
      limitReset: headers.get('X-RateLimit-Reset') || 'unknown',
    };
  }

  /**
   * Handle error responses from API
   */
  private async handleResponseError(
    response: Response,
    url: string
  ): Promise<never> {
    const statusCode = response.status;
    const context = { statusCode, url, requestCount: this.requestCount };

    logger.error('API error response', context);

    if (statusCode === 404) {
      throw new NotFoundError('Summoner', context);
    }

    if (statusCode === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') || '60',
        10
      );
      // Our buckets were out of sync with Riot's: stop everyone, not just this call
      await riotLimiter.pause(retryAfter * 1000);
      throw new RateLimitError(retryAfter);
    }

    if (statusCode >= 500) {
      throw new ExternalServiceError(
        'Riot API',
        `Server error (${statusCode})`,
        context
      );
    }

    throw new RiotApiError(`API error: ${statusCode}`, statusCode, context);
  }

  /**
   * Determine if error should be retried
   */
  private isRetriableError(error: unknown): boolean {
    // Not retried: Retry-After is usually much longer than our backoff,
    // so retrying would only burn more of the quota
    if (error instanceof RateLimitError) return false;
    if (error instanceof ExternalServiceError) return true;
    // AbortSignal.timeout() rejects with a TimeoutError DOMException, which
    // fetch creates in another realm (instanceof Error fails): check the name
    const name = (error as { name?: unknown } | null)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') return true;

    return false;
  }

  /**
   * Handle API errors with logging
   */
  private handleApiError(
    error: unknown,
    context: Record<string, unknown>
  ): never {
    logger.error('League API error', { ...context, error });
    throw error;
  }
}

// Export singleton instance
export const leagueApiService = new LeagueApiService();

export type { Summoner, LeagueEntry, Match, MatchIdList };
