/**
 * WhatsApp session (Baileys auth state) kept in Supabase, encrypted.
 * GitHub Actions starts from scratch on every run, so the session can't live
 * in files: every key Baileys reads or writes is a row in `bot_session`,
 * encrypted with AES-256-GCM using BOT_SESSION_KEY (32 bytes, base64).
 */

import crypto from 'node:crypto';
import pg from 'pg';
import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';

const key = Buffer.from(process.env.BOT_SESSION_KEY ?? '', 'base64');
if (key.length !== 32) {
  throw new Error('BOT_SESSION_KEY must be 32 bytes in base64');
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value, BufferJSON.replacer), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

function decrypt(text) {
  const raw = Buffer.from(text, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  return JSON.parse(json.toString('utf8'), BufferJSON.reviver);
}

export async function loadDatabaseAuthState() {
  // Direct (session) connection: a few queries, no pooler quirks
  const db = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();

  async function read(id) {
    const { rows } = await db.query('SELECT data FROM bot_session WHERE id = $1', [id]);
    return rows[0] ? decrypt(rows[0].data) : null;
  }
  async function write(id, value) {
    await db.query(
      `INSERT INTO bot_session (id, data, "updatedAt") VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now()`,
      [id, encrypt(value)]
    );
  }
  async function remove(id) {
    await db.query('DELETE FROM bot_session WHERE id = $1', [id]);
  }

  const creds = (await read('creds')) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const result = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await read(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              result[id] = value;
            })
          );
          return result;
        },
        async set(data) {
          const tasks = [];
          for (const type of Object.keys(data)) {
            for (const id of Object.keys(data[type])) {
              const value = data[type][id];
              const rowId = `${type}-${id}`;
              tasks.push(value ? write(rowId, value) : remove(rowId));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => write('creds', creds),
    close: () => db.end(),
  };
}
