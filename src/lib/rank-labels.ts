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
