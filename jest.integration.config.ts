import type { Config } from 'jest';
import nextJest from 'next/jest';

/**
 * Integration tests: hit the REAL Riot API through our route handlers.
 * Needs RIOT_API_KEY in .env.local and consumes rate-limit quota,
 * so they run only via `npm run test:integration` (not in `npm test`/CI).
 */
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/jest.integration.setup.ts'],
  testMatch: ['**/*.integration.test.ts'],
  // Real network calls + the token bucket can take a while
  testTimeout: 60_000,
};

export default createJestConfig(config);
