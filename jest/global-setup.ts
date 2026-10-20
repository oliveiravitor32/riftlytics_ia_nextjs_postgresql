/**
 * Once per test run, before any test file:
 *  - one Redis namespace for the whole run (shared by every file, like
 *    production instances share the cache; deleted by global-teardown)
 *  - a clean Postgres schema "test" in the same database: migrated, emptied
 *    and seeded with the fake world's players (jest/riot-mock). Production
 *    data ("public") is never touched.
 */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { Client } from 'pg';
import { GROUP } from './riot-mock/world';

const SCHEMA = 'test';

function withSchema(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('schema', SCHEMA);
  return parsed.toString();
}

export default async function setup() {
  config({ path: '.env.local', quiet: true });
  process.env.CACHE_PREFIX = `test:${randomUUID().slice(0, 8)}:`;
  process.env.DATABASE_SCHEMA = SCHEMA;

  if (!process.env.DIRECT_URL) {
    throw new Error('DIRECT_URL é necessário para preparar o banco de testes.');
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DIRECT_URL: withSchema(process.env.DIRECT_URL) },
    stdio: 'ignore',
  });

  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  try {
    await db.query(`SET search_path TO "${SCHEMA}"`);
    await db.query(
      'TRUNCATE player_matches, matches, pdl_snapshots, level_snapshots, duo_analyses, players CASCADE'
    );
    for (const [i, { gameName, tagLine }] of GROUP.entries()) {
      // One without a photo, to cover the icon fallback
      const avatarUrl = i === 0 ? null : `https://fotos.test/${i}.jpg`;
      await db.query(
        `INSERT INTO players (id, "gameName", "tagLine", region, "displayName", "avatarUrl", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'br1', $2, $4, now() + make_interval(secs => $5), now())`,
        [randomUUID(), gameName, tagLine, avatarUrl, i]
      );
    }
  } finally {
    await db.end();
  }
}
