/**
 * Data Dragon (Riot's static images) version, server only.
 * https://developer.riotgames.com/docs/lol#data-dragon_versions
 */

import 'server-only';
import { z } from 'zod';
import { cached } from '@/src/lib/cache';
import { logger } from '@/src/lib/logger';
import { DATA_DRAGON_FALLBACK_VERSION } from '@/src/lib/match-transformers';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
export const DDRAGON_VERSION_KEY = 'ddragon:version';

// Newest first
const versionsSchema = z.array(z.string()).nonempty();

/** Newest Data Dragon version (1-day cache); the fallback if it can't be read */
export async function latestDataDragonVersion(): Promise<string> {
  try {
    const { value } = await cached(
      DDRAGON_VERSION_KEY,
      RIOT_API_CONSTANTS.CACHE_SECONDS.DDRAGON_VERSION,
      async () => {
        const res = await fetch(VERSIONS_URL);
        if (!res.ok) throw new Error(`Data Dragon respondeu ${res.status}`);
        return versionsSchema.parse(await res.json())[0];
      }
    );
    return value;
  } catch (error) {
    logger.warn('Versão do Data Dragon indisponível, usando a padrão', {
      error: String(error),
    });
    return DATA_DRAGON_FALLBACK_VERSION;
  }
}
