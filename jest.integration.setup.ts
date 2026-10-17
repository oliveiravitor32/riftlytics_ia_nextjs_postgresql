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

// Each test file gets its own Redis namespace, deleted in jest/server.setup.ts
process.env.CACHE_PREFIX = `test:${crypto.randomUUID().slice(0, 8)}:`;
