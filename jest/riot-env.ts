/**
 * Riot settings for the server-side test suites, applied before any app
 * module loads (the limiter and the service read them at import time).
 */

export function configureRiotForTests() {
  if (process.env.RIOT_MODE === 'live') {
    if (!process.env.RIOT_API_KEY) {
      throw new Error(
        'RIOT_API_KEY ausente: RIOT_MODE=live chama a Riot de verdade.'
      );
    }
    return;
  }
  // Mocked Riot answers (jest/riot-mock) cost no quota: no waiting in the
  // shared queue, and counters in this run's own namespace (deleted at the end)
  process.env.RIOT_LIMIT_SCALE = '1000';
  process.env.RIOT_LIMIT_PREFIX = process.env.CACHE_PREFIX;
  // Never sent anywhere when mocked; CI doesn't need a real key
  process.env.RIOT_API_KEY ||= 'mock';
}
