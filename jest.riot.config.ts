import type { Config } from 'jest';
import { integrationProject } from './jest/projects';

/**
 * `npm run test:riot`: contract check against the REAL Riot API. The other
 * suites answer Riot with mocks, so this is what catches Riot changing the
 * shape of its answers.
 */
process.env.RIOT_MODE = 'live';

const riotConfig = async (): Promise<Config> => ({
  ...(await integrationProject()),
  testMatch: ['<rootDir>/src/__integration__/*.live.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/jest/global-setup.ts',
  globalTeardown: '<rootDir>/jest/redis-global-teardown.ts',
});

export default riotConfig;
