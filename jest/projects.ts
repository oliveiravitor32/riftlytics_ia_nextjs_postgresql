/**
 * Jest projects shared by every config:
 *  - unit:        pure logic, offline (CI runs only this)
 *  - integration: routes/services/pages against real Riot + Supabase (local)
 *  - ui:          real components + hooks; fetch('/api') hits the real routes (local)
 * File naming: *.test.ts(x) | *.integration.test.ts(x) | *.ui.test.tsx
 */

import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const shared: Config = {
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};

export const coverageFrom = [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.test.{ts,tsx}',
  // Generated Prisma client and shadcn primitives aren't our code
  '!src/generated/**',
  '!src/components/ui/**',
];

// Prisma 7 loads its query compiler as ESM (.mjs) at query time, so it must
// be transformed; next/jest ignores all of node_modules by default.
function transformPrisma(config: Config): Config {
  return {
    ...config,
    transformIgnorePatterns: (config.transformIgnorePatterns ?? []).map(
      (pattern) =>
        pattern.startsWith('/node_modules/')
          ? '/node_modules/(?!(\\.pnpm|@prisma)/)'
          : pattern
    ),
  };
}

export async function unitProject(): Promise<Config> {
  return createJestConfig({
    ...shared,
    displayName: 'unit',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
    testPathIgnorePatterns: [
      '/node_modules/',
      '\\.integration\\.test\\.',
      '\\.ui\\.test\\.',
    ],
  })();
}

export async function integrationProject(): Promise<Config> {
  return transformPrisma(
    await createJestConfig({
      ...shared,
      displayName: 'integration',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/jest.integration.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest/server.setup.ts'],
      testMatch: ['<rootDir>/src/**/*.integration.test.{ts,tsx}'],
    })()
  );
}

export async function uiProject(): Promise<Config> {
  return transformPrisma(
    await createJestConfig({
      ...shared,
      displayName: 'ui',
      testEnvironment: '<rootDir>/jest/jsdom-node-env.js',
      // Node builds of packages (pg, Prisma) instead of browser stubs
      testEnvironmentOptions: { customExportConditions: ['node', 'default'] },
      // ui.setup loads .env.local first; server.setup then opens the DB pool
      setupFilesAfterEnv: [
        '<rootDir>/jest/ui.setup.ts',
        '<rootDir>/jest/server.setup.ts',
      ],
      testMatch: ['<rootDir>/src/**/*.ui.test.tsx'],
    })()
  );
}
