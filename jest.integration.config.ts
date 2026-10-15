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

// Prisma 7 loads its query compiler as ESM (.mjs) at query time, so it must
// be transformed; next/jest ignores all of node_modules by default.
export default async () => {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: (resolved.transformIgnorePatterns ?? []).map(
      (pattern) =>
        pattern.startsWith('/node_modules/')
          ? '/node_modules/(?!(\\.pnpm|@prisma)/)'
          : pattern
    ),
  };
};
