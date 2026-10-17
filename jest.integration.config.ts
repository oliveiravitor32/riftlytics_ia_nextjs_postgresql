import type { Config } from 'jest';
import { integrationProject } from './jest/projects';

/**
 * Integration tests: hit the REAL Riot API and Supabase through our routes,
 * services and pages. Needs .env.local; local only (not in GitHub CI).
 */
const integrationConfig = async (): Promise<Config> => integrationProject();

export default integrationConfig;
