import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';

// Next.js skips .env.local when NODE_ENV=test, so load it explicitly
config({ path: '.env.local', quiet: true });

if (!process.env.RIOT_API_KEY) {
  throw new Error(
    'RIOT_API_KEY ausente: coloque uma chave válida em .env.local para rodar os testes de integração.'
  );
}

// Keep the output readable; only real problems are logged
process.env.LOG_LEVEL = 'error';

// Namespace set once per run by jest/redis-global-setup.ts; this fallback
// only applies if a file is run some other way (never the production prefix)
process.env.CACHE_PREFIX ??= `test:${randomUUID().slice(0, 8)}:`;
