/**
 * Rank ordering: tier, then division, then LP (higher first).
 * Tier/division order comes from RIOT_API_CONSTANTS (declared low → high).
 */

import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';

type RankLike = { tier: string; rank: string; leaguePoints: number };

const TIERS: string[] = Object.values(RIOT_API_CONSTANTS.RANK_TIERS);
// Declared I..IV; a higher division is a lower roman numeral
const DIVISIONS: string[] = Object.values(
  RIOT_API_CONSTANTS.RANK_DIVISIONS
).reverse();

function score(entry: RankLike): number {
  const tier = TIERS.indexOf(entry.tier);
  const division = Math.max(DIVISIONS.indexOf(entry.rank), 0);
  return tier * 10_000 + division * 1_000 + entry.leaguePoints;
}

/** Array.sort comparator: higher rank first */
export function compareRank(a: RankLike, b: RankLike): number {
  return score(b) - score(a);
}
