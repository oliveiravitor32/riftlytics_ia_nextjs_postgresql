/**
 * Display helpers for League tiers (pt-BR names, apex tiers without division)
 */

const TIER_LABEL: Record<string, string> = {
  IRON: 'Ferro',
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Mestre',
  GRANDMASTER: 'Grão-Mestre',
  CHALLENGER: 'Desafiante',
};

const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

/** e.g. ("EMERALD", "II") → "Esmeralda II"; ("CHALLENGER", "I") → "Desafiante" */
export function formatTier(tier: string, rank: string): string {
  const label = TIER_LABEL[tier] ?? tier;
  return APEX_TIERS.includes(tier) ? label : `${label} ${rank}`;
}

/**
 * Rank crests from Community Dragon (mirror of the LoL client's own files;
 * Data Dragon doesn't have them). Pinned to a game version so a reshuffle of
 * "latest" can't break the images.
 * https://github.com/communitydragon/docs/blob/master/assets.md
 */
export const RANK_EMBLEM_BASE =
  'https://raw.communitydragon.org/15.21/plugins/rcp-fe-lol-static-assets/global/default/images';

const EMBLEM_TIERS = new Set([
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
]);

/**
 * `cropped`: the full emblem is a 16:9 picture with the crest in the middle,
 * so it must be cropped (RankEmblem does it); the unranked crest is not.
 */
export function rankEmblem(tier: string | null): {
  src: string;
  cropped: boolean;
} {
  if (tier && EMBLEM_TIERS.has(tier)) {
    return {
      src: `${RANK_EMBLEM_BASE}/ranked-emblem/emblem-${tier.toLowerCase()}.png`,
      cropped: true,
    };
  }
  return {
    src: `${RANK_EMBLEM_BASE}/ranked-mini-crests/unranked.svg`,
    cropped: false,
  };
}
