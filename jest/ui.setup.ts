import '@testing-library/jest-dom';
import { config } from 'dotenv';

// Same real credentials as the integration suite (.env.local, local only)
config({ path: '.env.local', quiet: true });
if (!process.env.RIOT_API_KEY || !process.env.DATABASE_URL) {
  throw new Error(
    'RIOT_API_KEY e DATABASE_URL são necessários em .env.local para os testes de UI.'
  );
}
process.env.LOG_LEVEL = 'error';

// Imported after the env is loaded: the routes read it at module load
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bridgedFetch, apiCalls } = require('./api-bridge');

// Set at load time too, so beforeAll hooks in tests already use it
globalThis.fetch = bridgedFetch;

beforeEach(() => {
  apiCalls.length = 0;
  globalThis.fetch = bridgedFetch;
});
