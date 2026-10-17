/**
 * One Redis namespace for the whole test run (shared by every test file, like
 * production instances share the cache), so the suites don't refetch the same
 * PUUIDs and profiles from Riot file after file.
 */
import { randomUUID } from 'node:crypto';

export default function setup() {
  process.env.CACHE_PREFIX = `test:${randomUUID().slice(0, 8)}:`;
}
