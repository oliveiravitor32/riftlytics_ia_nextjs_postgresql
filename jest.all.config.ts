import type { Config } from 'jest';
import {
  coverageFrom,
  integrationProject,
  uiProject,
  unitProject,
} from './jest/projects';

/**
 * `npm run test:all`: every suite (unit + integration + ui) against the real
 * app, with the 90% coverage gate. Local only: needs .env.local.
 */
const allConfig = async (): Promise<Config> => ({
  projects: [
    await unitProject(),
    await integrationProject(),
    await uiProject(),
  ],
  coverageProvider: 'v8',
  collectCoverageFrom: coverageFrom,
  coverageThreshold: {
    global: { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
});

export default allConfig;
