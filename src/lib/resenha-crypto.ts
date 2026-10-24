/**
 * Field encryption for the Resenha (LGPD: what people write, their name and
 * photo are unreadable in a database dump). AES-256-GCM with RESENHA_KEY
 * (32 bytes, base64), only in the server's environment. Stored as
 * "v1:" + base64(iv | auth tag | ciphertext); the version allows a new key
 * later without losing old posts.
 */

import crypto from 'node:crypto';

const VERSION = 'v1:';

function key(): Buffer {
  const raw = Buffer.from(process.env.RESENHA_KEY ?? '', 'base64');
  if (raw.length !== 32) {
    throw new Error('RESENHA_KEY must be 32 bytes in base64');
  }
  return raw;
}

export function encryptField(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return (
    VERSION + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
  );
}

/** Throws if the value was changed or encrypted with another key */
export function decryptField(stored: string): string {
  if (!stored.startsWith(VERSION)) {
    throw new Error('Unknown encrypted field format');
  }
  const raw = Buffer.from(stored.slice(VERSION.length), 'base64');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key(),
    raw.subarray(0, 12)
  );
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
}
