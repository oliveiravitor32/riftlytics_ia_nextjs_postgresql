import type { Config } from 'jest';
import { coverageFrom, unitProject } from './jest/projects';

/**
 * `npm test`: offline unit tests only (this is what GitHub CI runs).
 * Real Riot/Supabase suites run locally: npm run test:integration / test:ui,
 * and the 90% coverage gate lives in `npm run test:all` (jest.all.config.ts).
 */
const unitConfig = async (): Promise<Config> => ({
  ...(await unitProject()),
  coverageProvider: 'v8',
  collectCoverageFrom: coverageFrom,
});

export default unitConfig;
