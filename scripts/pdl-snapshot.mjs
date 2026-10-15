// Triggers the daily PDL snapshot on a running server (default: local dev).
// Usage: npm run pdl:snapshot [-- https://your-deploy.vercel.app]
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/cron/pdl-snapshot`, {
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
});

console.log(response.status, await response.json());
process.exit(response.ok ? 0 : 1);
