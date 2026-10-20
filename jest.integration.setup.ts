import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { configureRiotForTests } from './jest/riot-env';
import { withRiotMock } from './jest/riot-mock/server';

// Next.js skips .env.local when NODE_ENV=test, so load it explicitly
config({ path: '.env.local', quiet: true });

// Keep the output readable; only real problems are logged
process.env.LOG_LEVEL = 'error';

// Namespace set once per run by jest/global-setup.ts; this fallback
// only applies if a file is run some other way (never the production prefix)
process.env.CACHE_PREFIX ??= `test:${randomUUID().slice(0, 8)}:`;

configureRiotForTests();
// Riot answers come from the fake world (jest/riot-mock)
globalThis.fetch = withRiotMock(globalThis.fetch);
