/**
 * Riot ID <-> URL slug, op.gg style: "Pistola Torta#br1" <-> "Pistola Torta-br1"
 * Tags never contain "-", so the LAST dash splits name and tag.
 */

export function toRiotSlug(gameName: string, tagLine: string): string {
  return encodeURIComponent(`${gameName}-${tagLine}`);
}

export function parseRiotSlug(
  slug: string
): { gameName: string; tagLine: string } | null {
  const decoded = decodeURIComponent(slug);
  const dash = decoded.lastIndexOf('-');
  if (dash <= 0 || dash === decoded.length - 1) return null;
  return { gameName: decoded.slice(0, dash), tagLine: decoded.slice(dash + 1) };
}

export function profileHref(
  region: string,
  gameName: string,
  tagLine: string
): string {
  return `/perfil/${region}/${toRiotSlug(gameName, tagLine)}`;
}
