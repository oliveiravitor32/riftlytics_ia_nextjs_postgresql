/**
 * UI waits that depend on Riot: the shared quota (90 requests per 2 minutes)
 * may make a request wait for the window to roll over during a full run.
 */
export const RIOT_WAIT_MS = 150_000;
