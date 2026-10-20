// Runs the daily close (PDL snapshot + new matches) on a running server.
// The first run also loads the last 100 matches of each player (~15 min,
// paced by the Riot limiter), so run it against the local dev server.
// Usage: npm run fechamento [-- http://localhost:5174]
import { config } from 'dotenv';
import http from 'node:http';
import https from 'node:https';

config({ path: '.env.local', quiet: true });

const url = new URL(
  '/api/cron/fechamento',
  process.argv[2] ?? 'http://localhost:3000'
);
// node:http instead of fetch: fetch gives up waiting for headers after 5 min
const client = url.protocol === 'https:' ? https : http;

client
  .get(
    url,
    { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } },
    (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log(res.statusCode, body);
        process.exit(res.statusCode === 200 ? 0 : 1);
      });
    }
  )
  .on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
