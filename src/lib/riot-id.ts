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

/** Parses what the user typed in the search ("Name#TAG") */
export function parseRiotIdInput(
  input: string
): { gameName: string; tagLine: string } | null {
  const [gameName, tagLine] = input.trim().split('#');
  if (!gameName?.trim() || !tagLine?.trim()) return null;
  return { gameName: gameName.trim(), tagLine: tagLine.trim() };
}

export function profileHref(
  region: string,
  gameName: string,
  tagLine: string
): string {
  return `/perfil/${region}/${toRiotSlug(gameName, tagLine)}`;
}
