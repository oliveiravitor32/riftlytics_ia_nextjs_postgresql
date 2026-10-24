import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { configureRiotForTests } from './jest/riot-env';
import { withGeminiMock } from './jest/gemini-mock/server';
import { withRiotMock } from './jest/riot-mock/server';
import {
  SUPABASE_TEST_URL,
  withSupabaseMock,
} from './jest/supabase-mock/server';

// Next.js skips .env.local when NODE_ENV=test, so load it explicitly
config({ path: '.env.local', quiet: true });

// Keep the output readable; only real problems are logged
process.env.LOG_LEVEL = 'error';

// Namespace set once per run by jest/global-setup.ts; this fallback
// only applies if a file is run some other way (never the production prefix)
process.env.CACHE_PREFIX ??= `test:${randomUUID().slice(0, 8)}:`;

configureRiotForTests();
// Never the real key: a test can't spend the free Gemini quota
process.env.GEMINI_API_KEY = 'mock';
// Riot and Gemini answers come from fakes (jest/riot-mock, jest/gemini-mock)
// Sign-in goes to a fake Supabase Auth (jest/supabase-mock), never the real one
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_TEST_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock';
globalThis.fetch = withSupabaseMock(
  withGeminiMock(withRiotMock(globalThis.fetch))
);
